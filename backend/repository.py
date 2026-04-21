from __future__ import annotations

import json
import re
import smtplib
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from email.message import EmailMessage
from pathlib import Path
from queue import Empty, Queue
from threading import Lock, Thread
from typing import Any
from zoneinfo import ZoneInfo

from .config import AppConfig
from .seed_data import DEFAULT_FLOWER_IMAGE, build_seed_snapshot

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:  # pragma: no cover - optional dependency
    firebase_admin = None
    credentials = None
    firestore = None

try:
    from google.api_core.exceptions import GoogleAPICallError, ResourceExhausted, ServiceUnavailable
except ImportError:  # pragma: no cover - optional dependency
    GoogleAPICallError = Exception
    ResourceExhausted = Exception
    ServiceUnavailable = Exception


class RepositoryError(Exception):
    pass


class ValidationError(RepositoryError):
    pass


class SnapshotStore:
    def load_snapshot(self) -> dict:
        raise NotImplementedError

    def save_snapshot(self, snapshot: dict) -> None:
        raise NotImplementedError


class LocalJsonStore(SnapshotStore):
    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def load_snapshot(self) -> dict:
        if not self.path.exists():
            return {}

        with self.path.open("r", encoding="utf-8") as handle:
            try:
                return json.load(handle)
            except json.JSONDecodeError:
                return {}

    def save_snapshot(self, snapshot: dict) -> None:
        with self.path.open("w", encoding="utf-8") as handle:
            json.dump(snapshot, handle, indent=2, ensure_ascii=True, default=_json_default)


class FirestoreStore(SnapshotStore):
    BOUQUETS_COLLECTION = "bouquets"
    FLOWERS_COLLECTION = "flowers"
    WRAPPINGS_COLLECTION = "wrapping_options"
    INVENTORY_COLLECTION = "inventory"
    RESTOCKS_COLLECTION = "restocks"
    MAINTENANCE_LOGS_COLLECTION = "maintenance_logs"
    MAINTENANCE_REPORTS_COLLECTION = "maintenance_reports"
    SETTINGS_COLLECTION = "settings"
    SETTINGS_DOCUMENT = "store"
    AI_PREVIEW_DOCUMENT = "ai_preview"
    ORDERS_COLLECTION = "orders"
    LEGACY_COLLECTION = "shopsystem"
    LEGACY_DOCUMENT = "default"

    def __init__(self, config: AppConfig):
        if firebase_admin is None or credentials is None or firestore is None:
            raise RepositoryError("Firebase Admin SDK is not installed.")

        app_name = "shopsystem"
        existing_app = None
        for app in firebase_admin._apps.values():  # type: ignore[attr-defined]
            if getattr(app, "name", None) == app_name:
                existing_app = app
                break

        if existing_app is None:
            if config.firebase_credentials_path is not None:
                cert = credentials.Certificate(str(config.firebase_credentials_path))
                existing_app = firebase_admin.initialize_app(cert, name=app_name)
            else:
                existing_app = firebase_admin.initialize_app(name=app_name)

        self.client = firestore.client(existing_app)

    def load_snapshot(self) -> dict:
        bouquets = self._load_collection(self.BOUQUETS_COLLECTION)
        flowers = self._load_collection(self.FLOWERS_COLLECTION)
        wrappings = self._load_collection(self.WRAPPINGS_COLLECTION)
        inventory = self._load_collection(self.INVENTORY_COLLECTION)
        restocks = self._load_collection(self.RESTOCKS_COLLECTION)
        maintenance_logs = self._load_collection(self.MAINTENANCE_LOGS_COLLECTION)
        maintenance_reports = self._load_collection(self.MAINTENANCE_REPORTS_COLLECTION)
        settings = self._load_settings()

        snapshot = {
            "bouquets": bouquets,
            "flowers": flowers,
            "wrappings": wrappings,
            "inventory": inventory,
            "orders": [],
            "restocks": restocks,
            "maintenance_logs": maintenance_logs,
            "maintenance_reports": maintenance_reports,
            "settings": settings,
        }

        legacy_snapshot = self._load_legacy_snapshot()
        for key in ("bouquets", "flowers", "wrappings", "inventory", "orders", "restocks"):
            if not snapshot[key] and legacy_snapshot.get(key):
                snapshot[key] = legacy_snapshot[key]
        if not snapshot["settings"] and legacy_snapshot.get("settings"):
            snapshot["settings"] = legacy_snapshot["settings"]

        return snapshot

    def save_snapshot(self, snapshot: dict) -> None:
        self._sync_collection(
            self.BOUQUETS_COLLECTION,
            snapshot.get("bouquets", []),
            lambda bouquet: bouquet["id"],
        )
        self._sync_collection(
            self.FLOWERS_COLLECTION,
            snapshot.get("flowers", []),
            lambda flower: flower["id"],
        )
        self._sync_collection(
            self.WRAPPINGS_COLLECTION,
            snapshot.get("wrappings", []),
            lambda wrapping: wrapping["id"],
        )
        self._sync_collection(
            self.INVENTORY_COLLECTION,
            snapshot.get("inventory", []),
            lambda item: item["code"],
        )
        self._sync_collection(
            self.RESTOCKS_COLLECTION,
            snapshot.get("restocks", []),
            lambda record: record["id"],
        )
        self._sync_collection(
            self.MAINTENANCE_LOGS_COLLECTION,
            snapshot.get("maintenance_logs", []),
            lambda record: record["id"],
        )
        self._sync_collection(
            self.MAINTENANCE_REPORTS_COLLECTION,
            snapshot.get("maintenance_reports", []),
            lambda record: record["id"],
        )
        self.client.collection(self.SETTINGS_COLLECTION).document(self.SETTINGS_DOCUMENT).set(
            snapshot.get("settings", {}),
            timeout=2,
        )
        # The app reads from the normalized collections; removing the legacy
        # snapshot prevents stale records from lingering in Firestore.
        self.client.collection(self.LEGACY_COLLECTION).document(self.LEGACY_DOCUMENT).delete(timeout=2)

    def save_inventory_item(self, inventory_item: dict) -> None:
        self.client.collection(self.INVENTORY_COLLECTION).document(str(inventory_item["code"])).set(
            inventory_item,
            timeout=2,
        )

    def save_restock_update(self, inventory_item: dict, restock_record: dict) -> None:
        batch = self.client.batch()
        batch.set(
            self.client.collection(self.INVENTORY_COLLECTION).document(str(inventory_item["code"])),
            inventory_item,
        )
        batch.set(
            self.client.collection(self.RESTOCKS_COLLECTION).document(str(restock_record["id"])),
            restock_record,
        )
        batch.commit(timeout=2)

    def load_records(self, collection_name: str) -> list[dict]:
        return self._load_collection(collection_name)

    def load_settings_record(self) -> dict:
        return self._load_settings()

    def load_order_documents(self) -> list[Any]:
        return list(self.client.collection(self.ORDERS_COLLECTION).stream())

    def _load_collection(self, collection_name: str) -> list[dict]:
        return [doc.to_dict() or {} for doc in self.client.collection(collection_name).stream(timeout=2)]

    def _load_settings(self) -> dict:
        doc = self.client.collection(self.SETTINGS_COLLECTION).document(self.SETTINGS_DOCUMENT).get(timeout=2)
        if not doc.exists:
            return {}
        return doc.to_dict() or {}

    def _load_legacy_snapshot(self) -> dict:
        doc = self.client.collection(self.LEGACY_COLLECTION).document(self.LEGACY_DOCUMENT).get(timeout=2)
        if not doc.exists:
            return {}
        return doc.to_dict() or {}

    def _sync_collection(self, collection_name: str, records: list[dict], key_fn) -> None:
        collection = self.client.collection(collection_name)
        existing_ids = {doc.id for doc in collection.stream(timeout=2)}
        desired_ids = set()

        for record in records:
            doc_id = str(key_fn(record))
            desired_ids.add(doc_id)
            collection.document(doc_id).set(record, timeout=2)

        for doc_id in existing_ids - desired_ids:
            collection.document(doc_id).delete(timeout=2)


def create_store(config: AppConfig) -> tuple[SnapshotStore, str]:
    if config.require_firestore:
        firestore_store = FirestoreStore(config)
        firestore_store.load_snapshot()
        return firestore_store, "firestore"

    result: dict[str, SnapshotStore] = {}
    errors: list[Exception] = []

    def attempt_firestore() -> None:
        try:
            firestore_store = FirestoreStore(config)
            firestore_store.load_snapshot()
            result["store"] = firestore_store
        except Exception as error:
            errors.append(error)

    thread = Thread(target=attempt_firestore, daemon=True)
    thread.start()
    thread.join(timeout=60)

    if "store" in result:
        return result["store"], "firestore"

    return LocalJsonStore(config.local_store_path), "local-json"


def _status_class_for_order(status: str) -> str:
    if status == "Delivered":
        return "success"
    if status == "Cancelled":
        return "low"
    return "pending"


def _inventory_status(stock: int, par: int) -> tuple[str, str]:
    if stock <= 0:
        return "Out", "low"
    if stock <= par:
        return "Low", "low"
    return "OK", "success"


def _flower_status(stock: int, par: int, season: str) -> tuple[str, str]:
    if stock <= 0:
        return "Out of Stock", "low"
    if stock <= par:
        return "Low Stock", "low"
    if season and season != "Year-round":
        return "Seasonal", "pending"
    return "In Stock", "success"


def _currency_symbol(currency: str) -> str:
    return {
        "USD": "$",
        "HKD": "HK$",
        "CNY": "CNY ",
        "EUR": "EUR ",
    }.get(currency.upper(), f"{currency.upper()} ")


def _format_currency(amount: float, currency: str) -> str:
    symbol = _currency_symbol(currency)
    return f"{symbol}{amount:,.2f}"


def _json_default(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if hasattr(value, "isoformat"):
        return value.isoformat()
    raise TypeError(f"Object of type {value.__class__.__name__} is not JSON serializable")


def _parse_datetime(value: str, timezone_name: str) -> datetime:
    if isinstance(value, datetime):
        parsed = value
    else:
        parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=ZoneInfo(timezone_name))
    return parsed.astimezone(ZoneInfo(timezone_name))


def _normalize_datetime_input(value: str, timezone_name: str) -> str:
    timezone = ZoneInfo(timezone_name)
    if "T" in value:
        parsed = datetime.fromisoformat(value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone)
        return parsed.astimezone(timezone).replace(microsecond=0).isoformat()

    parsed_date = datetime.strptime(value, "%Y-%m-%d").date()
    return datetime.combine(parsed_date, time(hour=9), tzinfo=timezone).isoformat()


def _format_datetime_label(value: str, timezone_name: str) -> str:
    local_dt = _parse_datetime(value, timezone_name)
    today = datetime.now(ZoneInfo(timezone_name)).date()

    if local_dt.date() == today:
        return f"Today, {local_dt.strftime('%H:%M')}"
    if local_dt.date() == today - timedelta(days=1):
        return "Yesterday"
    return local_dt.strftime("%b %d, %Y")


def _format_delivery_label(value: str, timezone_name: str) -> str:
    local_dt = _parse_datetime(value, timezone_name)
    today = datetime.now(ZoneInfo(timezone_name)).date()

    if local_dt.date() == today:
        return f"Today, {local_dt.strftime('%b %d')}"
    if local_dt.date() == today - timedelta(days=1):
        return f"Yesterday, {local_dt.strftime('%b %d')}"
    return local_dt.strftime("%b %d, %Y")


def _summary_for_items(items: list[dict[str, Any]]) -> str:
    if not items:
        return "No items"
    first = items[0]
    if len(items) == 1:
        return f"{first['name']} x{first['qty']}"
    return f"{first['name']} x{first['qty']} +{len(items) - 1} more"


def _slugify(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return normalized or "flower"


def _next_numeric_identifier(values: list[str], prefix: str, start: int) -> str:
    numbers = []
    for value in values:
        match = re.search(r"(\d+)$", value)
        if match:
            numbers.append(int(match.group(1)))
    next_value = max(numbers, default=start) + 1
    return f"{prefix}{next_value}"


def _next_inventory_code(existing_codes: list[str], category: str) -> str:
    prefix = re.sub(r"[^A-Z]", "", category.upper())[:1] or "F"
    numbers = []
    for code in existing_codes:
        match = re.fullmatch(rf"{re.escape(prefix)}-(\d+)", code)
        if match:
            numbers.append(int(match.group(1)))
    next_value = max(numbers, default=0) + 1
    return f"{prefix}-{next_value:03d}"


def _shop_status_from_firestore(status: str | None) -> str:
    normalized = (status or "").strip()
    if normalized in {"待取货", "待配送", "Ready"}:
        return "Ready"
    if normalized in {"已完成", "已送达", "Delivered"}:
        return "Delivered"
    if normalized in {"已取消", "Cancelled"}:
        return "Cancelled"
    return "Preparing"


def _firestore_status_from_shop(status: str) -> str:
    return {
        "Preparing": "待确认",
        "Ready": "待取货",
        "Delivered": "已完成",
        "Cancelled": "已取消",
    }.get(status, "待确认")


def _source_order_id_from_order(order: dict) -> str:
    return order.get("source_order_id") or order.get("display_id") or order["id"]


def _start_of_week(day) -> Any:
    return day - timedelta(days=day.weekday())


def _week_range_label(start_day, end_day) -> str:
    if start_day.year != end_day.year:
        return f"{start_day.strftime('%b %d, %Y')} - {end_day.strftime('%b %d, %Y')}"
    if start_day.month != end_day.month:
        return f"{start_day.strftime('%b %d')} - {end_day.strftime('%b %d, %Y')}"
    return f"{start_day.strftime('%b %d')} - {end_day.strftime('%d, %Y')}"


class ShopRepository:
    def __init__(self, store: SnapshotStore, backend_name: str, config: AppConfig):
        self.store = store
        self.backend_name = backend_name
        self.config = config
        self.local_store = LocalJsonStore(config.local_store_path)
        self._lock = Lock()
        self._firestore_enabled = isinstance(store, FirestoreStore)
        self._firestore_failure_message: str | None = None

    def initialize(self) -> None:
        with self._lock:
            snapshot, changed = self._load_snapshot()
            if changed:
                self._persist_snapshot(snapshot)

    def _using_firestore(self) -> bool:
        return isinstance(self.store, FirestoreStore) and self._firestore_enabled

    def _should_fallback_to_local(self, error: Exception) -> bool:
        if self.config.require_firestore:
            return False
        if isinstance(error, (ResourceExhausted, ServiceUnavailable)):
            return True
        if isinstance(error, GoogleAPICallError):
            return "quota exceeded" in str(error).lower()
        return "quota exceeded" in str(error).lower()

    def _activate_local_fallback(self, error: Exception) -> None:
        self._firestore_enabled = False
        self.backend_name = "local-json"
        self._firestore_failure_message = str(error)

    def _cache_local_snapshot(self, snapshot: dict) -> None:
        self.local_store.save_snapshot(snapshot)

    def _normalized_settings(self, settings: dict | None) -> dict:
        normalized_snapshot, _ = self._ensure_snapshot({"settings": settings or {}})
        return normalized_snapshot["settings"]

    def _collection_key_for_name(self, collection_name: str) -> str:
        if collection_name == FirestoreStore.BOUQUETS_COLLECTION:
            return "bouquets"
        if collection_name == FirestoreStore.FLOWERS_COLLECTION:
            return "flowers"
        if collection_name == FirestoreStore.WRAPPINGS_COLLECTION:
            return "wrappings"
        if collection_name == FirestoreStore.INVENTORY_COLLECTION:
            return "inventory"
        if collection_name == FirestoreStore.RESTOCKS_COLLECTION:
            return "restocks"
        if collection_name == FirestoreStore.MAINTENANCE_LOGS_COLLECTION:
            return "maintenance_logs"
        if collection_name == FirestoreStore.MAINTENANCE_REPORTS_COLLECTION:
            return "maintenance_reports"
        raise ValidationError(f"Unsupported collection mapping for {collection_name}.")

    def _load_settings_fast(self) -> dict:
        if self._using_firestore():
            try:
                return self._normalized_settings(self.store.load_settings_record())
            except Exception as error:
                if not self._should_fallback_to_local(error):
                    raise
                self._activate_local_fallback(error)

        snapshot, _ = self._load_snapshot()
        return snapshot["settings"]

    def _load_collection_fast(self, collection_name: str) -> list[dict]:
        if self._using_firestore():
            try:
                return self.store.load_records(collection_name)
            except Exception as error:
                if not self._should_fallback_to_local(error):
                    raise
                self._activate_local_fallback(error)

        snapshot, _ = self._load_snapshot()
        return snapshot[self._collection_key_for_name(collection_name)]

    def _load_orders_fast(self, settings: dict) -> list[dict]:
        if self._using_firestore():
            try:
                docs = self.store.load_order_documents()
                orders = [self._normalize_firestore_order(doc.id, doc.to_dict() or {}, settings) for doc in docs]
                return sorted(
                    orders,
                    key=lambda order: _parse_datetime(order["created_at"], settings["timezone"]),
                    reverse=True,
                )
            except Exception as error:
                if not self._should_fallback_to_local(error):
                    raise
                self._activate_local_fallback(error)

        snapshot, _ = self._load_snapshot()
        snapshot_orders = [self._normalize_snapshot_order(order) for order in snapshot["orders"]]
        return sorted(
            snapshot_orders,
            key=lambda order: _parse_datetime(order["created_at"], settings["timezone"]),
            reverse=True,
        )

    def get_health(self) -> dict:
        settings = self._load_settings_fast()
        reports = self._load_collection_fast(FirestoreStore.MAINTENANCE_REPORTS_COLLECTION)
        checked_at = datetime.now(ZoneInfo(settings["timezone"])).replace(microsecond=0).isoformat()
        latest_report = max(
            reports,
            key=lambda report: report.get("created_at", ""),
            default=None,
        )
        latest_backup = self._latest_backup_snapshot()

        firebase_status = "ok" if self._using_firestore() else "degraded"
        firebase_label = "Connected" if self._using_firestore() else "Fallback mode"
        firebase_details = "Firestore is connected and serving live shop data."
        if not self._using_firestore():
            firebase_details = "Firebase is unavailable. The app is currently serving data from the local JSON snapshot."
            if self._firestore_failure_message:
                firebase_details = (
                    "Firebase is unavailable due to quota or connectivity issues. "
                    f"Fallback mode active: {self._firestore_failure_message}"
                )

        notification_status = "disabled"
        notification_label = "Not configured"
        notification_details = "SMTP delivery is not configured. Maintenance reports stay downloadable only."
        if self.config.smtp_host and self.config.smtp_sender:
            notification_status = "ok"
            notification_label = "Configured"
            notification_details = "SMTP delivery is configured for maintenance notifications."
            if latest_report and latest_report.get("notification_status") == "failed":
                notification_status = "warning"
                notification_label = "Attention needed"
                notification_details = latest_report.get("delivery_message") or "Latest notification delivery failed."

        backup_status = "ok" if latest_backup is not None else "warning"
        backup_label = (
            _format_datetime_label(latest_backup["created_at"], settings["timezone"]) if latest_backup is not None else "Never"
        )

        overall_status = "ok"
        if firebase_status == "degraded" or backup_status == "warning":
            overall_status = "degraded"
        elif notification_status in {"warning", "disabled"}:
            overall_status = "warning"

        return {
            "status": overall_status,
            "storage": self.backend_name,
            "checkedAt": checked_at,
            "checkedAtLabel": _format_datetime_label(checked_at, settings["timezone"]),
            "firebase": {
                "status": firebase_status,
                "label": firebase_label,
                "details": firebase_details,
            },
            "notifications": {
                "status": notification_status,
                "label": notification_label,
                "details": notification_details,
            },
            "backups": {
                "status": backup_status,
                "label": backup_label,
                "details": "Rolling local snapshot backups are stored on disk for emergency recovery.",
                "lastBackupAt": latest_backup["created_at"] if latest_backup is not None else None,
                "directory": str(self.config.backup_dir.relative_to(self.config.project_root)),
                "fileCount": self._backup_file_count(),
            },
        }

    def refresh_cache(self) -> dict:
        with self._lock:
            snapshot, _ = self._load_snapshot()
            settings = snapshot["settings"]
            refreshed_at = datetime.now(ZoneInfo(settings["timezone"])).replace(microsecond=0).isoformat()
            self._append_maintenance_log(
                snapshot,
                settings,
                event_type="cache_refresh",
                severity="info",
                title="Dashboard cache refreshed",
                description="Dashboard data cache was refreshed from live storage.",
                details={"backend": self.backend_name},
            )
            self._persist_snapshot(snapshot)

        return {
            "status": "refreshed",
            "storage": self.backend_name,
            "refreshedAt": refreshed_at,
            "message": "Dashboard cache refreshed successfully.",
        }

    def generate_weekly_report(self, force: bool = False) -> dict:
        with self._lock:
            snapshot, _ = self._load_snapshot()
            settings = snapshot["settings"]
            week_start, week_end = self._latest_completed_week(settings["timezone"])

            if not force:
                existing = self._find_report_for_week(snapshot, week_start, week_end)
                if existing is not None:
                    return self._serialize_weekly_report(existing, settings)

            report = self._generate_weekly_report_locked(snapshot, week_start, week_end, trigger="manual")
            self._persist_snapshot(snapshot)
            return self._serialize_weekly_report(report, settings)

    def get_weekly_report_file(self, report_id: str) -> Path:
        snapshot, _ = self._load_snapshot()
        report = next((entry for entry in snapshot["maintenance_reports"] if entry["id"] == report_id), None)
        if report is None:
            raise ValidationError("Weekly report not found.")

        relative_path = report.get("file_path")
        if not relative_path:
            raise ValidationError("The selected weekly report has no PDF file.")

        file_path = self.config.project_root / relative_path
        if not file_path.exists() or not file_path.is_file():
            raise ValidationError("Weekly report PDF is missing from disk.")
        return file_path

    def order_event_listener_supported(self) -> bool:
        return self._using_firestore()

    def subscribe_order_events(self) -> tuple[Queue[dict], Any]:
        events: Queue[dict] = Queue()

        if not self._using_firestore():
            return events, lambda: None

        settings = self.get_settings()
        initialized = False

        def handle_snapshot(collection_snapshot, changes, read_time) -> None:
            nonlocal initialized

            if not initialized:
                initialized = True
                return

            for change in changes:
                if getattr(change.type, "name", str(change.type)) != "ADDED":
                    continue

                document = change.document
                order = self._normalize_firestore_order(document.id, document.to_dict() or {}, settings)
                events.put(
                    {
                        "type": "order_created",
                        "order": self._serialize_order(order, settings),
                    }
                )

        watch = self.store.client.collection(self.store.ORDERS_COLLECTION).on_snapshot(handle_snapshot)
        return events, watch.unsubscribe

    def next_order_event(self, events: Queue[dict], timeout: float = 15.0) -> dict | None:
        try:
            return events.get(timeout=timeout)
        except Empty:
            return None

    def list_orders(self) -> list[dict]:
        settings = self._load_settings_fast()
        orders = self._load_orders_fast(settings)
        return [self._serialize_order(order, settings) for order in orders]

    def list_orders_page(self, page: int = 1, page_size: int = 10, search: str = "") -> dict:
        page = max(1, int(page))
        page_size = max(1, min(int(page_size), 100))
        settings = self._load_settings_fast()
        search_term = search.strip().lower()

        if search_term:
            return self._search_orders_page(page, page_size, search_term, settings)

        if self._using_firestore():
            try:
                query = (
                    self.store.client.collection(self.store.ORDERS_COLLECTION)
                    .order_by("createdAt", direction=firestore.Query.DESCENDING)
                    .offset((page - 1) * page_size)
                    .limit(page_size + 1)
                )
                docs = list(query.stream())
                has_next_page = len(docs) > page_size
                visible_docs = docs[:page_size]
                orders = [self._normalize_firestore_order(doc.id, doc.to_dict() or {}, settings) for doc in visible_docs]
                return {
                    "items": [self._serialize_order(order, settings) for order in orders],
                    "page": page,
                    "pageSize": page_size,
                    "hasNextPage": has_next_page,
                    "hasPreviousPage": page > 1,
                }
            except Exception as error:
                if not self._should_fallback_to_local(error):
                    raise
                self._activate_local_fallback(error)

        orders = self._load_orders_fast(settings)
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        page_items = orders[start_index:end_index]
        return {
            "items": [self._serialize_order(order, settings) for order in page_items],
            "page": page,
            "pageSize": page_size,
            "hasNextPage": end_index < len(orders),
            "hasPreviousPage": page > 1,
        }

    def _search_orders_page(self, page: int, page_size: int, search_term: str, settings: dict) -> dict:
        required_matches = (page - 1) * page_size + page_size + 1

        if self._using_firestore():
            try:
                exact_order_id = self._normalize_search_order_id(search_term)
                if exact_order_id and page == 1:
                    docs = list(
                        self.store.client.collection(self.store.ORDERS_COLLECTION)
                        .where("sourceOrderId", "==", exact_order_id)
                        .limit(page_size + 1)
                        .stream()
                    )
                    if docs:
                        matches = [self._normalize_firestore_order(doc.id, doc.to_dict() or {}, settings) for doc in docs]
                        return self._paginate_filtered_orders(matches, page, page_size, settings)

                query = self.store.client.collection(self.store.ORDERS_COLLECTION).order_by(
                    "createdAt",
                    direction=firestore.Query.DESCENDING,
                )
                matches: list[dict] = []
                for doc in query.stream():
                    order = self._normalize_firestore_order(doc.id, doc.to_dict() or {}, settings)
                    if not self._order_matches_search(order, search_term):
                        continue
                    matches.append(order)
                    if len(matches) >= required_matches:
                        break

                return self._paginate_filtered_orders(matches, page, page_size, settings)
            except Exception as error:
                if not self._should_fallback_to_local(error):
                    raise
                self._activate_local_fallback(error)

        orders = [order for order in self._load_orders_fast(settings) if self._order_matches_search(order, search_term)]
        return self._paginate_filtered_orders(orders, page, page_size, settings)

    def _paginate_filtered_orders(self, orders: list[dict], page: int, page_size: int, settings: dict) -> dict:
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        page_items = orders[start_index:end_index]
        return {
            "items": [self._serialize_order(order, settings) for order in page_items],
            "page": page,
            "pageSize": page_size,
            "hasNextPage": len(orders) > end_index,
            "hasPreviousPage": page > 1,
        }

    def create_order(self, payload: dict) -> dict:
        with self._lock:
            snapshot, _ = self._load_snapshot()
            settings = snapshot["settings"]
            flowers = {flower["id"]: flower for flower in snapshot["flowers"]}
            inventory_by_code = {item["code"]: item for item in snapshot["inventory"]}
            current_orders = self._load_order_records(snapshot)

            line_items = []
            subtotal = 0.0
            for requested_item in payload["items"]:
                flower = flowers.get(requested_item["flowerId"])
                if flower is None:
                    raise ValidationError("Some flowers are no longer available.")

                inventory_item = inventory_by_code.get(flower["inventory_code"])
                if inventory_item is None:
                    raise ValidationError(f"Inventory item for {flower['name']} is missing.")
                if inventory_item["stock"] < requested_item["quantity"]:
                    raise ValidationError(f"Not enough stock for {flower['name']}.")

                inventory_item["stock"] -= requested_item["quantity"]
                inventory_item["updated_at"] = datetime.now(ZoneInfo(settings["timezone"])).replace(microsecond=0).isoformat()

                line_items.append(
                    {
                        "flower_id": flower["id"],
                        "name": flower["name"],
                        "qty": requested_item["quantity"],
                        "unit": flower["unit"],
                        "unit_price": float(flower["price"]),
                    }
                )
                subtotal += float(flower["price"]) * requested_item["quantity"]

            order = {
                "id": _next_numeric_identifier(
                    [_source_order_id_from_order(item) for item in current_orders],
                    "#",
                    8896,
                ),
                "display_id": None,
                "created_at": datetime.now(ZoneInfo(settings["timezone"])).replace(microsecond=0).isoformat(),
                "customer_name": payload["customerName"].strip(),
                "phone": payload.get("phone", "").strip(),
                "delivery_date": _normalize_datetime_input(payload["deliveryDate"], settings["timezone"]),
                "delivery_address": payload.get("deliveryAddress", "").strip() or "Pickup in store",
                "notes": payload.get("notes", "").strip(),
                "status": "Preparing",
                "subtotal": round(subtotal, 2),
                "delivery_fee": float(payload.get("deliveryFee", 8.0)),
                "total": round(subtotal + float(payload.get("deliveryFee", 8.0)), 2),
                "line_items": line_items,
            }

            if self._using_firestore():
                firestore_payload = {
                    "customerName": order["customer_name"],
                    "customerPhone": order["phone"],
                    "deliveryAddress": order["delivery_address"],
                    "deliveryDate": _parse_datetime(order["delivery_date"], settings["timezone"]).astimezone(timezone.utc),
                    "specialRequests": order["notes"],
                    "status": "待确认",
                    "createdAt": _parse_datetime(order["created_at"], settings["timezone"]).astimezone(timezone.utc),
                    "userId": "shop-admin",
                    "sourceOrderId": order["id"],
                    "bouquetData": {
                        "name": f"{order['customer_name']} Bouquet",
                        "note": order["notes"],
                        "wrappingStyle": "Store Order",
                        "ribbonColorHex": "#111111",
                        "totalPrice": order["subtotal"],
                        "createdAt": _parse_datetime(order["created_at"], settings["timezone"]).astimezone(timezone.utc),
                        "items": [
                            {
                                "flowerId": item["flower_id"],
                                "flowerName": item["name"],
                                "flowerPrice": item["unit_price"],
                                "quantity": item["qty"],
                            }
                            for item in line_items
                        ],
                    },
                }
                try:
                    doc_ref = self.store.client.collection(self.store.ORDERS_COLLECTION).document()
                    doc_ref.set(firestore_payload, timeout=2)
                    self._persist_snapshot(snapshot)
                    return self._serialize_order(self._normalize_firestore_order(doc_ref.id, firestore_payload, settings), settings)
                except Exception as error:
                    if not self._should_fallback_to_local(error):
                        raise
                    self._activate_local_fallback(error)

            snapshot["orders"].append(order)
            self._persist_snapshot(snapshot)
            return self._serialize_order(order, settings)

    def update_order_status(self, order_id: str, status: str) -> dict:
        allowed_statuses = {"Preparing", "Ready", "Delivered", "Cancelled"}
        if status not in allowed_statuses:
            raise ValidationError("Unsupported order status.")

        with self._lock:
            snapshot, _ = self._load_snapshot()
            settings = snapshot["settings"]

            if self._using_firestore():
                try:
                    doc_ref = self.store.client.collection(self.store.ORDERS_COLLECTION).document(order_id)
                    doc = doc_ref.get(timeout=2)
                    if doc.exists:
                        firestore_data = doc.to_dict() or {}
                        order = self._normalize_firestore_order(doc.id, firestore_data, settings)
                        previous_status = order["status"]

                        if previous_status == "Delivered" and status != "Delivered":
                            raise ValidationError("Delivered orders cannot move backwards.")

                        if status == "Cancelled" and previous_status not in {"Cancelled", "Delivered"}:
                            inventory_by_code = {item["code"]: item for item in snapshot["inventory"]}
                            flowers = {flower["id"]: flower for flower in snapshot["flowers"]}
                            for line_item in order["line_items"]:
                                flower = flowers.get(line_item["flower_id"])
                                if not flower:
                                    continue
                                inventory_item = inventory_by_code.get(flower["inventory_code"])
                                if inventory_item:
                                    inventory_item["stock"] += line_item["qty"]
                                    inventory_item["updated_at"] = datetime.now(ZoneInfo(settings["timezone"])).replace(microsecond=0).isoformat()
                            self._persist_snapshot(snapshot)

                        firestore_data["status"] = _firestore_status_from_shop(status)
                        doc_ref.set({"status": firestore_data["status"]}, merge=True, timeout=2)
                        return self._serialize_order(self._normalize_firestore_order(doc.id, firestore_data, settings), settings)
                except Exception as error:
                    if not self._should_fallback_to_local(error):
                        raise
                    self._activate_local_fallback(error)

            order = next((item for item in snapshot["orders"] if item["id"] == order_id), None)
            if order is None:
                raise ValidationError("Order not found.")

            previous_status = order["status"]
            if previous_status == "Delivered" and status != "Delivered":
                raise ValidationError("Delivered orders cannot move backwards.")

            if status == "Cancelled" and previous_status not in {"Cancelled", "Delivered"}:
                inventory_by_code = {item["code"]: item for item in snapshot["inventory"]}
                flowers = {flower["id"]: flower for flower in snapshot["flowers"]}
                for line_item in order["line_items"]:
                    flower = flowers.get(line_item["flower_id"])
                    if not flower:
                        continue
                    inventory_item = inventory_by_code.get(flower["inventory_code"])
                    if inventory_item:
                        inventory_item["stock"] += line_item["qty"]
                        inventory_item["updated_at"] = datetime.now(ZoneInfo(settings["timezone"])).replace(microsecond=0).isoformat()

            order["status"] = status
            self._persist_snapshot(snapshot)
            return self._serialize_order(order, settings)

    def list_flowers(self) -> list[dict]:
        settings = self._load_settings_fast()
        inventory = self._load_collection_fast(FirestoreStore.INVENTORY_COLLECTION)
        flowers = self._load_collection_fast(FirestoreStore.FLOWERS_COLLECTION)
        inventory_by_code = {item["code"]: item for item in inventory}
        flowers = sorted(flowers, key=lambda flower: flower["name"].lower())
        return [self._serialize_flower(flower, inventory_by_code, settings) for flower in flowers]

    def list_bouquets(self) -> list[dict]:
        bouquets = self._load_collection_fast(FirestoreStore.BOUQUETS_COLLECTION)
        flowers = self._load_collection_fast(FirestoreStore.FLOWERS_COLLECTION)
        flowers_by_id = {flower["id"]: flower for flower in flowers}
        bouquets = sorted(bouquets, key=lambda bouquet: bouquet["name"].lower())
        return [self._serialize_bouquet(bouquet, flowers_by_id) for bouquet in bouquets]

    def list_wrappings(self) -> list[dict]:
        settings = self._load_settings_fast()
        wrappings = self._load_collection_fast(FirestoreStore.WRAPPINGS_COLLECTION)
        wrappings = sorted(wrappings, key=lambda wrapping: str(wrapping.get("name", "")).lower())
        return [self._serialize_wrapping(wrapping, settings) for wrapping in wrappings]

    def create_bouquet(self, payload: dict) -> dict:
        with self._lock:
            snapshot, _ = self._load_snapshot()
            flowers_by_id = {flower["id"]: flower for flower in snapshot["flowers"]}

            if not payload.get("components"):
                raise ValidationError("A bouquet must include at least one flower.")

            existing_ids = {bouquet["id"] for bouquet in snapshot["bouquets"]}
            bouquet_id = _slugify(payload["name"])
            if bouquet_id in existing_ids:
                suffix = 2
                while f"{bouquet_id}-{suffix}" in existing_ids:
                    suffix += 1
                bouquet_id = f"{bouquet_id}-{suffix}"

            quantities_by_flower: dict[str, int] = defaultdict(int)
            for component in payload["components"]:
                flower_id = str(component.get("flowerId", "")).strip()
                quantity = int(component.get("quantity", 0))
                if not flower_id or quantity <= 0:
                    raise ValidationError("Each bouquet item must include a flower and quantity.")
                if flower_id not in flowers_by_id:
                    raise ValidationError("Some flowers are no longer available.")
                quantities_by_flower[flower_id] += quantity

            bouquet = {
                "id": bouquet_id,
                "name": payload["name"].strip(),
                "image": payload.get("image") or DEFAULT_FLOWER_IMAGE,
                "components": [
                    {
                        "flower_id": flower_id,
                        "quantity": quantity,
                    }
                    for flower_id, quantity in quantities_by_flower.items()
                ],
            }

            snapshot["bouquets"].append(bouquet)
            self._persist_snapshot(snapshot)
            return self._serialize_bouquet(bouquet, flowers_by_id)

    def create_flower(self, payload: dict) -> dict:
        with self._lock:
            snapshot, _ = self._load_snapshot()
            settings = snapshot["settings"]

            existing_ids = {flower["id"] for flower in snapshot["flowers"]}
            flower_id = _slugify(payload["name"])
            if flower_id in existing_ids:
                suffix = 2
                while f"{flower_id}-{suffix}" in existing_ids:
                    suffix += 1
                flower_id = f"{flower_id}-{suffix}"

            inventory_code = _next_inventory_code(
                [item["code"] for item in snapshot["inventory"]],
                payload.get("category", "Flower"),
            )

            flower = {
                "id": flower_id,
                "name": payload["name"].strip(),
                "category": payload.get("category", "Other").strip() or "Other",
                "color": payload.get("color", "").strip(),
                "price": float(payload.get("price", 0)),
                "unit": payload.get("unit", "stem").strip() or "stem",
                "season": payload.get("season", "Year-round").strip() or "Year-round",
                "description": payload.get("description", "").strip(),
                "image": payload.get("image") or DEFAULT_FLOWER_IMAGE,
                "inventory_code": inventory_code,
            }
            inventory_item = {
                "code": inventory_code,
                "name": flower["name"],
                "category": "Fresh Flowers",
                "stock": int(payload.get("openingStock", 0)),
                "par": int(payload.get("parLevel", 10)),
                "unit": flower["unit"],
                "linked_flower_id": flower_id,
                "updated_at": datetime.now(ZoneInfo(settings["timezone"])).replace(microsecond=0).isoformat(),
            }

            snapshot["flowers"].append(flower)
            snapshot["inventory"].append(inventory_item)
            self._persist_snapshot(snapshot)
            inventory_by_code = {item["code"]: item for item in snapshot["inventory"]}
            return self._serialize_flower(flower, inventory_by_code, settings)

    def create_wrapping(self, payload: dict) -> dict:
        with self._lock:
            snapshot, _ = self._load_snapshot()
            settings = snapshot["settings"]

            existing_ids = {wrapping["id"] for wrapping in snapshot.get("wrappings", [])}
            wrapping_id = _slugify(payload["name"])
            if wrapping_id in existing_ids:
                suffix = 2
                while f"{wrapping_id}-{suffix}" in existing_ids:
                    suffix += 1
                wrapping_id = f"{wrapping_id}-{suffix}"

            wrapping = {
                "id": wrapping_id,
                "name": payload["name"].strip(),
                "price": float(payload.get("price", 0)),
                "imageURL": payload.get("image") or DEFAULT_FLOWER_IMAGE,
            }

            snapshot.setdefault("wrappings", []).append(wrapping)
            self._persist_snapshot(snapshot)
            return self._serialize_wrapping(wrapping, settings)

    def delete_flower(self, flower_id: str) -> dict:
        with self._lock:
            snapshot, _ = self._load_snapshot()
            flower = next((entry for entry in snapshot["flowers"] if entry["id"] == flower_id), None)
            if flower is None:
                raise ValidationError("Flower not found.")

            orders = self._load_order_records(snapshot)
            active_order = next(
                (
                    order
                    for order in orders
                    if order["status"] not in {"Delivered", "Cancelled"}
                    and any(line_item["flower_id"] == flower_id for line_item in order["line_items"])
                ),
                None,
            )
            if active_order is not None:
                raise ValidationError(
                    f"Cannot delete {flower['name']} because it is used in active order {active_order['display_id']}."
                )

            linked_bouquet = next(
                (
                    bouquet
                    for bouquet in snapshot["bouquets"]
                    if any(
                        (component.get("flower_id") or component.get("flowerId")) == flower_id
                        for component in bouquet.get("components", [])
                    )
                ),
                None,
            )
            if linked_bouquet is not None:
                raise ValidationError(
                    f"Cannot delete {flower['name']} because it is used in bouquet {linked_bouquet['name']}."
                )

            snapshot["flowers"] = [entry for entry in snapshot["flowers"] if entry["id"] != flower_id]
            snapshot["inventory"] = [
                entry for entry in snapshot["inventory"] if entry.get("linked_flower_id") != flower_id
            ]
            self._persist_snapshot(snapshot)
            return {"id": flower_id, "name": flower["name"], "deleted": True}

    def delete_bouquet(self, bouquet_id: str) -> dict:
        with self._lock:
            snapshot, _ = self._load_snapshot()
            bouquet = next((entry for entry in snapshot["bouquets"] if entry["id"] == bouquet_id), None)
            if bouquet is None:
                raise ValidationError("Bouquet not found.")

            snapshot["bouquets"] = [entry for entry in snapshot["bouquets"] if entry["id"] != bouquet_id]
            self._persist_snapshot(snapshot)
            return {"id": bouquet_id, "name": bouquet["name"], "deleted": True}

    def delete_wrapping(self, wrapping_id: str) -> dict:
        with self._lock:
            snapshot, _ = self._load_snapshot()
            wrapping = next((entry for entry in snapshot.get("wrappings", []) if entry["id"] == wrapping_id), None)
            if wrapping is None:
                raise ValidationError("Wrapping not found.")

            snapshot["wrappings"] = [entry for entry in snapshot.get("wrappings", []) if entry["id"] != wrapping_id]
            self._persist_snapshot(snapshot)
            return {"id": wrapping_id, "name": wrapping.get("name", wrapping_id), "deleted": True}

    def get_inventory(self) -> dict:
        settings = self._load_settings_fast()
        inventory_records = self._load_collection_fast(FirestoreStore.INVENTORY_COLLECTION)
        restock_records = self._load_collection_fast(FirestoreStore.RESTOCKS_COLLECTION)
        snapshot = {
            "inventory": inventory_records,
            "restocks": restock_records,
            "settings": settings,
        }
        average_costs = self._average_costs_by_item(snapshot)
        items = [
            self._serialize_inventory_item(item, average_costs.get(item["code"]), settings["currency"])
            for item in sorted(inventory_records, key=lambda item: item["code"])
        ]
        restocks = [
            self._serialize_restock(record, settings)
            for record in sorted(restock_records, key=lambda item: item["created_at"], reverse=True)
        ]
        return {"items": items, "restocks": restocks}

    def adjust_inventory(self, item_code: str, delta: int) -> dict:
        with self._lock:
            snapshot, _ = self._load_snapshot()
            settings = snapshot["settings"]
            item = next((entry for entry in snapshot["inventory"] if entry["code"] == item_code), None)
            if item is None:
                raise ValidationError("Inventory item not found.")

            previous_stock = int(item["stock"])
            item["stock"] = max(0, int(item["stock"]) + delta)
            item["updated_at"] = datetime.now(ZoneInfo(settings["timezone"])).replace(microsecond=0).isoformat()
            if delta != 0:
                self._append_maintenance_log(
                    snapshot,
                    settings,
                    event_type="inventory_correction",
                    severity="warning",
                    title=f"Inventory corrected for {item['name']}",
                    description=(
                        f"Stock changed from {previous_stock} to {item['stock']} "
                        f"({delta:+d} {item.get('unit', 'units')})."
                    ),
                    related_code=item["code"],
                    related_name=item["name"],
                    details={
                        "before": previous_stock,
                        "after": int(item["stock"]),
                        "delta": int(delta),
                    },
                )
            self._persist_snapshot(snapshot)
            average_cost = self._average_costs_by_item(snapshot).get(item["code"])
            return self._serialize_inventory_item(item, average_cost, settings["currency"])

    def update_inventory_stock(self, item_code: str, stock: int) -> dict:
        with self._lock:
            snapshot, _ = self._load_snapshot()
            settings = snapshot["settings"]
            item = next((entry for entry in snapshot["inventory"] if entry["code"] == item_code), None)
            if item is None:
                raise ValidationError("Inventory item not found.")

            previous_stock = int(item["stock"])
            next_stock = int(stock)
            item["stock"] = next_stock
            item["updated_at"] = datetime.now(ZoneInfo(settings["timezone"])).replace(microsecond=0).isoformat()

            if next_stock != previous_stock:
                delta = next_stock - previous_stock
                self._append_maintenance_log(
                    snapshot,
                    settings,
                    event_type="inventory_correction",
                    severity="warning",
                    title=f"Inventory corrected for {item['name']}",
                    description=(
                        f"Stock changed from {previous_stock} to {next_stock} "
                        f"({delta:+d} {item.get('unit', 'units')})."
                    ),
                    related_code=item["code"],
                    related_name=item["name"],
                    details={
                        "before": previous_stock,
                        "after": next_stock,
                        "delta": delta,
                    },
                )

            self._persist_snapshot(snapshot)
            average_cost = self._average_costs_by_item(snapshot).get(item["code"])
            return self._serialize_inventory_item(item, average_cost, settings["currency"])

    def update_inventory_par(self, item_code: str, par_level: int) -> dict:
        with self._lock:
            snapshot, _ = self._load_snapshot()
            settings = snapshot["settings"]
            item = next((entry for entry in snapshot["inventory"] if entry["code"] == item_code), None)
            if item is None:
                raise ValidationError("Inventory item not found.")

            item["par"] = int(par_level)
            item["updated_at"] = datetime.now(ZoneInfo(settings["timezone"])).replace(microsecond=0).isoformat()
            self._persist_inventory_item(snapshot, item)
            average_cost = self._average_costs_by_item(snapshot).get(item["code"])
            return self._serialize_inventory_item(item, average_cost, settings["currency"])

    def create_restock(self, payload: dict) -> dict:
        with self._lock:
            snapshot, _ = self._load_snapshot()
            settings = snapshot["settings"]
            item = next((entry for entry in snapshot["inventory"] if entry["code"] == payload["itemCode"]), None)
            if item is None:
                raise ValidationError("Inventory item not found.")

            item["stock"] += int(payload["quantity"])
            item["updated_at"] = datetime.now(ZoneInfo(settings["timezone"])).replace(microsecond=0).isoformat()
            record = {
                "id": _next_numeric_identifier([entry["id"] for entry in snapshot["restocks"]], "RS-", 1000),
                "created_at": datetime.now(ZoneInfo(settings["timezone"])).replace(microsecond=0).isoformat(),
                "item_code": item["code"],
                "item_name": item["name"],
                "quantity": int(payload["quantity"]),
                "unit_cost": float(payload["unitCost"]),
            }

            snapshot["restocks"].append(record)
            self._persist_restock_update(snapshot, item, record)

            return self._serialize_restock(record, settings)

    def get_settings(self) -> dict:
        return self._load_settings_fast()

    def get_ai_preview_settings(self) -> dict:
        if self._using_firestore():
            try:
                doc = self.store.client.collection(FirestoreStore.SETTINGS_COLLECTION).document(
                    FirestoreStore.AI_PREVIEW_DOCUMENT
                ).get(timeout=2)
                payload = doc.to_dict() if doc.exists else {}
                api_key = str((payload or {}).get("apiKey") or (payload or {}).get("api") or "").strip()
                model_name = str((payload or {}).get("modelName") or (payload or {}).get("model") or "").strip()
                return {"apiKey": api_key, "modelName": model_name}
            except Exception as error:
                if not self._should_fallback_to_local(error):
                    raise
                self._activate_local_fallback(error)

        snapshot, _ = self._load_snapshot()
        return {
            "apiKey": str(snapshot.get("settings", {}).get("aiPreviewApi", "")).strip(),
            "modelName": str(snapshot.get("settings", {}).get("aiPreviewModelName", "")).strip(),
        }

    def update_ai_preview_settings(self, payload: dict) -> dict:
        api_key = str(payload.get("apiKey") or payload.get("api") or "").strip()
        model_name = str(payload.get("modelName") or payload.get("model") or "").strip()

        if self._using_firestore():
            try:
                self.store.client.collection(FirestoreStore.SETTINGS_COLLECTION).document(
                    FirestoreStore.AI_PREVIEW_DOCUMENT
                ).set(
                    {"apiKey": api_key, "modelName": model_name},
                    merge=True,
                    timeout=2,
                )
                return {"apiKey": api_key, "modelName": model_name}
            except Exception as error:
                if not self._should_fallback_to_local(error):
                    raise
                self._activate_local_fallback(error)

        with self._lock:
            snapshot, _ = self._load_snapshot()
            settings = snapshot.get("settings") or {}
            settings["aiPreviewApi"] = api_key
            settings["aiPreviewModelName"] = model_name
            snapshot["settings"] = settings
            self._persist_snapshot(snapshot)
            return {"apiKey": api_key, "modelName": model_name}

    def update_settings(self, payload: dict) -> dict:
        with self._lock:
            snapshot, _ = self._load_snapshot()
            snapshot["settings"] = {
                "storeName": payload["storeName"].strip(),
                "contactEmail": payload["contactEmail"].strip(),
                "maintenanceEmail": payload.get("maintenanceEmail", "").strip(),
                "currency": payload["currency"].strip().upper(),
                "timezone": payload["timezone"].strip(),
                "deliveryRadius": int(payload["deliveryRadius"]),
            }
            self._persist_snapshot(snapshot)
            return snapshot["settings"]

    def get_dashboard(self) -> dict:
        self._ensure_scheduled_weekly_report()
        settings = self._load_settings_fast()
        inventory = self._load_collection_fast(FirestoreStore.INVENTORY_COLLECTION)
        maintenance_logs = self._load_collection_fast(FirestoreStore.MAINTENANCE_LOGS_COLLECTION)
        maintenance_reports = self._load_collection_fast(FirestoreStore.MAINTENANCE_REPORTS_COLLECTION)
        orders = self._load_orders_fast(settings)
        snapshot = {
            "inventory": inventory,
            "maintenance_logs": maintenance_logs,
            "maintenance_reports": maintenance_reports,
            "orders": orders,
            "_orders_source": "live",
            "settings": settings,
        }
        timezone_name = settings["timezone"]
        today = datetime.now(ZoneInfo(timezone_name)).date()

        today_orders = [order for order in orders if _parse_datetime(order["created_at"], timezone_name).date() == today]
        yesterday_orders = [
            order
            for order in orders
            if _parse_datetime(order["created_at"], timezone_name).date() == today - timedelta(days=1)
        ]
        pending_orders = [order for order in orders if order["status"] not in {"Delivered", "Cancelled"}]

        current_window = self._sales_window(orders, timezone_name, end_day=today, days=7)
        previous_window = self._sales_window(orders, timezone_name, end_day=today - timedelta(days=7), days=7)
        current_revenue = sum(entry["amount"] for entry in current_window)
        previous_revenue = sum(entry["amount"] for entry in previous_window)
        low_stock_items = [
            item
            for item in snapshot["inventory"]
            if _inventory_status(int(item["stock"]), int(item["par"]))[0] != "OK"
        ]

        revenue_delta = current_revenue - previous_revenue
        if previous_revenue > 0:
            revenue_trend = f"{revenue_delta / previous_revenue:+.0%} 本週"
        elif current_revenue > 0:
            revenue_trend = "本週新銷售"
        else:
            revenue_trend = "尚未有銷售"

        order_delta = len(today_orders) - len(yesterday_orders)
        if order_delta == 0:
            order_trend = "與昨日無異"
        else:
            order_trend = f"相比昨日 {order_delta:+d}"

        recent_orders = [self._serialize_order(order, settings) for order in orders[:4]]

        return {
            "kpis": [
                {
                    "label": "Today's Orders",
                    "value": str(len(today_orders)),
                    "trend": order_trend,
                    "isUp": order_delta >= 0,
                },
                {
                    "label": "Pending",
                    "value": str(len(pending_orders)),
                    "trend": "需要跟進" if pending_orders else "全部正常",
                    "isUp": False,
                },
                {
                    "label": "Revenue",
                    "value": _format_currency(current_revenue, settings["currency"]),
                    "trend": revenue_trend,
                    "isUp": revenue_delta >= 0,
                },
                {
                    "label": "Low Stock",
                    "value": str(len(low_stock_items)),
                    "trend": "庫存緊張" if low_stock_items else "庫存充足",
                    "isUp": False,
                },
            ],
            "recentOrders": recent_orders,
            "weeklySales": current_window,
            "maintenanceSummary": self._build_maintenance_summary(snapshot, settings),
            "maintenanceLogs": self._recent_maintenance_logs(snapshot, settings),
            "latestWeeklyReport": self._serialize_weekly_report(self._latest_report(snapshot), settings),
        }

    def get_analytics(self) -> dict:
        settings = self._load_settings_fast()
        timezone_name = settings["timezone"]
        today = datetime.now(ZoneInfo(timezone_name)).date()

        orders = [order for order in self._load_orders_fast(settings) if order["status"] != "Cancelled"]
        sales_series = self._sales_window(orders, timezone_name, end_day=today, days=7)

        sellers: dict[str, dict[str, Any]] = defaultdict(lambda: {"name": "", "revenue": 0.0, "unitsSold": 0})
        for order in orders:
            for line_item in order["line_items"]:
                entry = sellers[line_item["name"]]
                entry["name"] = line_item["name"]
                entry["revenue"] += float(line_item["unit_price"]) * int(line_item["qty"])
                entry["unitsSold"] += int(line_item["qty"])

        top_sellers = sorted(sellers.values(), key=lambda item: item["revenue"], reverse=True)[:5]
        for seller in top_sellers:
            seller["revenue"] = round(float(seller["revenue"]), 2)
            seller["revenueDisplay"] = _format_currency(float(seller["revenue"]), settings["currency"])

        completed_orders = [order for order in orders if order["status"] == "Delivered"]
        gross_revenue = sum(order["total"] for order in orders)
        average_order_value = gross_revenue / len(orders) if orders else 0.0

        return {
            "salesSeries": sales_series,
            "topSellers": top_sellers,
            "totals": {
                "grossRevenue": round(gross_revenue, 2),
                "grossRevenueDisplay": _format_currency(gross_revenue, settings["currency"]),
                "completedOrders": len(completed_orders),
                "averageOrderValue": round(average_order_value, 2),
                "averageOrderValueDisplay": _format_currency(average_order_value, settings["currency"]),
            },
        }

    def _ensure_scheduled_weekly_report(self) -> None:
        settings = self._load_settings_fast()
        week_start, week_end = self._latest_completed_week(settings["timezone"])
        existing_reports = self._load_collection_fast(FirestoreStore.MAINTENANCE_REPORTS_COLLECTION)
        if self._find_report_for_week({"maintenance_reports": existing_reports}, week_start, week_end) is not None:
            return

        with self._lock:
            snapshot, _ = self._load_snapshot()
            settings = snapshot["settings"]
            if self._find_report_for_week(snapshot, week_start, week_end) is not None:
                return

            self._generate_weekly_report_locked(snapshot, week_start, week_end, trigger="scheduled")
            self._persist_snapshot(snapshot)

    def _latest_completed_week(self, timezone_name: str):
        today = datetime.now(ZoneInfo(timezone_name)).date()
        current_week_start = _start_of_week(today)
        previous_week_end = current_week_start - timedelta(days=1)
        previous_week_start = previous_week_end - timedelta(days=6)
        return previous_week_start, previous_week_end

    def _find_report_for_week(self, snapshot: dict, week_start, week_end) -> dict | None:
        matching_reports = [
            report
            for report in snapshot["maintenance_reports"]
            if report.get("week_start") == week_start.isoformat()
            and report.get("week_end") == week_end.isoformat()
            and report.get("file_path")
        ]
        if not matching_reports:
            return None

        return max(matching_reports, key=lambda report: report.get("created_at", ""))

    def _latest_report(self, snapshot: dict) -> dict | None:
        reports = snapshot.get("maintenance_reports") or []
        if not reports:
            return None
        return max(reports, key=lambda report: report.get("created_at", ""))

    def _generate_weekly_report_locked(self, snapshot: dict, week_start, week_end, trigger: str) -> dict:
        settings = snapshot["settings"]
        timezone_name = settings["timezone"]
        created_at = datetime.now(ZoneInfo(timezone_name)).replace(microsecond=0).isoformat()
        report_id = _next_numeric_identifier([entry["id"] for entry in snapshot["maintenance_reports"]], "MR-", 1000)
        week_label = _week_range_label(week_start, week_end)
        week_logs = self._maintenance_logs_in_range(snapshot, settings, week_start, week_end)
        correction_logs = [log for log in week_logs if log.get("event_type") == "inventory_correction"]
        notification_failures = [log for log in week_logs if log.get("event_type") == "notification_failure"]
        orders = self._load_order_records(snapshot)
        week_orders = [
            order
            for order in orders
            if week_start <= _parse_datetime(order["created_at"], timezone_name).date() <= week_end
        ]
        pending_orders = [order for order in orders if order["status"] not in {"Delivered", "Cancelled"}]
        low_stock_items = [
            item
            for item in snapshot["inventory"]
            if _inventory_status(int(item["stock"]), int(item["par"]))[0] != "OK"
        ]
        report_file = self.config.maintenance_report_dir / (
            f"maintenance-report-{week_start.isoformat()}-{week_end.isoformat()}-{report_id.lower()}.pdf"
        )
        report_relative_path = report_file.relative_to(self.config.project_root).as_posix()
        report = {
            "id": report_id,
            "created_at": created_at,
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "week_label": week_label,
            "trigger": trigger,
            "file_name": report_file.name,
            "file_path": report_relative_path,
            "status": "ready",
            "notification_status": "pending",
            "delivery_message": "PDF generated.",
            "recipient": (settings.get("maintenanceEmail") or settings.get("contactEmail") or "").strip(),
            "inventory_corrections": len(correction_logs),
            "notification_failures": len(notification_failures),
            "week_orders": len(week_orders),
            "pending_orders": len(pending_orders),
            "low_stock_items": len(low_stock_items),
        }

        try:
            self._render_weekly_report_pdf(
                report_file,
                settings,
                report,
                correction_logs,
                notification_failures,
                low_stock_items,
                pending_orders,
                week_orders,
            )
        except Exception as error:
            report["status"] = "generation_failed"
            report["notification_status"] = "failed"
            report["delivery_message"] = f"PDF generation failed: {error}"
            report["file_path"] = ""
            snapshot["maintenance_reports"].append(report)
            self._append_maintenance_log(
                snapshot,
                settings,
                event_type="report_generation_failed",
                severity="critical",
                title="Weekly maintenance report failed",
                description=f"Unable to build PDF for {week_label}: {error}",
                details={"reportId": report_id},
            )
            return report

        snapshot["maintenance_reports"].append(report)
        self._append_maintenance_log(
            snapshot,
            settings,
            event_type="report_generated",
            severity="info",
            title="Weekly maintenance report generated",
            description=f"PDF generated for {week_label}.",
            details={"reportId": report_id, "trigger": trigger},
        )

        sent, message = self._send_weekly_report_email(
            report["recipient"],
            report_file,
            week_label,
            report,
            settings,
        )
        report["notification_status"] = "sent" if sent else "failed"
        report["delivery_message"] = message
        if not sent:
            report["status"] = "delivery_failed"
            self._append_maintenance_log(
                snapshot,
                settings,
                event_type="notification_failure",
                severity="warning",
                title="Weekly report delivery failed",
                description=message,
                details={"reportId": report_id, "recipient": report["recipient"]},
            )
        else:
            self._append_maintenance_log(
                snapshot,
                settings,
                event_type="report_sent",
                severity="info",
                title="Weekly report delivered",
                description=message,
                details={"reportId": report_id, "recipient": report["recipient"]},
            )

        return report

    def _render_weekly_report_pdf(
        self,
        report_file: Path,
        settings: dict,
        report: dict,
        correction_logs: list[dict],
        notification_failures: list[dict],
        low_stock_items: list[dict],
        pending_orders: list[dict],
        week_orders: list[dict],
    ) -> None:
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
            from reportlab.lib.units import mm
            from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
        except ModuleNotFoundError as error:
            if error.name == "reportlab":
                raise RepositoryError(
                    "Weekly report PDF dependency is missing. Run 'pip install -r requirements.txt' in the project venv."
                ) from error
            raise

        report_file.parent.mkdir(parents=True, exist_ok=True)
        doc = SimpleDocTemplate(
            str(report_file),
            pagesize=A4,
            leftMargin=16 * mm,
            rightMargin=16 * mm,
            topMargin=18 * mm,
            bottomMargin=18 * mm,
        )
        styles = getSampleStyleSheet()
        title_style = styles["Heading1"]
        title_style.fontName = "Helvetica-Bold"
        title_style.fontSize = 18
        title_style.leading = 22
        subtitle_style = ParagraphStyle(
            "MaintenanceSubtitle",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#4A5568"),
        )
        section_style = ParagraphStyle(
            "MaintenanceSection",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#1A202C"),
            spaceBefore=8,
            spaceAfter=6,
        )
        body_style = ParagraphStyle(
            "MaintenanceBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#1A202C"),
        )

        def paragraph_cell(value: Any) -> Paragraph:
            return Paragraph(str(value).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), body_style)

        story = [
            Paragraph("Weekly Maintenance Report", title_style),
            Spacer(1, 4 * mm),
            Paragraph(
                (
                    f"{settings['storeName']}<br/>{report['week_label']}<br/>"
                    f"Generated {_parse_datetime(report['created_at'], settings['timezone']).strftime('%b %d, %Y %H:%M')}"
                ),
                subtitle_style,
            ),
            Spacer(1, 8 * mm),
        ]

        summary_rows = [
            ["Metric", "Value"],
            [paragraph_cell("Inventory corrections"), paragraph_cell(report["inventory_corrections"])],
            [paragraph_cell("Notification failures"), paragraph_cell(report["notification_failures"])],
            [paragraph_cell("Orders created"), paragraph_cell(report["week_orders"])],
            [paragraph_cell("Pending orders"), paragraph_cell(report["pending_orders"])],
            [paragraph_cell("Low stock items"), paragraph_cell(report["low_stock_items"])],
            [paragraph_cell("Delivery status"), paragraph_cell(report["delivery_message"])],
        ]
        summary_table = Table(summary_rows, colWidths=[52 * mm, 120 * mm])
        summary_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F2937")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D9E2EC")),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F8FAFC")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("PADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.extend([Paragraph("Summary", section_style), summary_table, Spacer(1, 6 * mm)])

        low_stock_rows = [["Item", "Stock", "Par", "Status"]]
        for item in sorted(low_stock_items, key=lambda entry: (int(entry["stock"]), int(entry["par"])))[:6]:
            status, _ = _inventory_status(int(item["stock"]), int(item["par"]))
            low_stock_rows.append(
                [
                    paragraph_cell(item["name"]),
                    paragraph_cell(item["stock"]),
                    paragraph_cell(item["par"]),
                    paragraph_cell(status),
                ]
            )
        if len(low_stock_rows) == 1:
            low_stock_rows.append(
                [
                    paragraph_cell("No critical items"),
                    paragraph_cell("-"),
                    paragraph_cell("-"),
                    paragraph_cell("Healthy"),
                ]
            )
        low_stock_table = Table(low_stock_rows, colWidths=[90 * mm, 20 * mm, 20 * mm, 42 * mm])
        low_stock_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
                    ("PADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.extend([Paragraph("Low Stock Watchlist", section_style), low_stock_table, Spacer(1, 6 * mm)])

        event_rows = [["When", "Event", "Details"]]
        for log in (correction_logs + notification_failures)[:8]:
            event_rows.append(
                [
                    paragraph_cell(_format_datetime_label(log["created_at"], settings["timezone"])),
                    paragraph_cell(log["title"]),
                    paragraph_cell(log["description"]),
                ]
            )
        if len(event_rows) == 1:
            event_rows.append(
                [
                    paragraph_cell("-"),
                    paragraph_cell("No maintenance exceptions logged"),
                    paragraph_cell("System remained stable this week."),
                ]
            )
        events_table = Table(event_rows, colWidths=[35 * mm, 52 * mm, 85 * mm])
        events_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("PADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.extend([Paragraph("Exceptions Logged", section_style), events_table, Spacer(1, 6 * mm)])

        pending_rows = [["Order", "Customer", "Status"]]
        for order in pending_orders[:6]:
            pending_rows.append(
                [
                    paragraph_cell(order.get("display_id") or order["id"]),
                    paragraph_cell(order["customer_name"]),
                    paragraph_cell(order["status"]),
                ]
            )
        if len(pending_rows) == 1:
            pending_rows.append([paragraph_cell("-"), paragraph_cell("No pending orders"), paragraph_cell("Clear")])
        pending_table = Table(pending_rows, colWidths=[30 * mm, 95 * mm, 47 * mm])
        pending_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
                    ("PADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.extend([Paragraph("Pending Orders", section_style), pending_table])

        doc.build(story)

    def _send_weekly_report_email(
        self,
        recipient: str,
        report_file: Path,
        week_label: str,
        report: dict,
        settings: dict,
    ) -> tuple[bool, str]:
        if not recipient:
            return False, "No maintenance recipient email is configured. PDF was saved locally."
        if not self.config.smtp_host or not self.config.smtp_sender:
            return False, f"SMTP delivery is not configured. PDF is ready for {recipient} to download."

        message = EmailMessage()
        message["Subject"] = f"{settings['storeName']} maintenance report - {week_label}"
        message["From"] = self.config.smtp_sender
        message["To"] = recipient
        message.set_content(
            "\n".join(
                [
                    f"Weekly maintenance report for {settings['storeName']}",
                    f"Week: {week_label}",
                    f"Inventory corrections: {report['inventory_corrections']}",
                    f"Notification failures: {report['notification_failures']}",
                    f"Pending orders: {report['pending_orders']}",
                ]
            )
        )
        with report_file.open("rb") as handle:
            message.add_attachment(handle.read(), maintype="application", subtype="pdf", filename=report_file.name)

        try:
            with smtplib.SMTP(self.config.smtp_host, self.config.smtp_port, timeout=10) as server:
                server.ehlo()
                if self.config.smtp_use_tls:
                    server.starttls()
                    server.ehlo()
                if self.config.smtp_username and self.config.smtp_password:
                    server.login(self.config.smtp_username, self.config.smtp_password)
                server.send_message(message)
        except Exception as error:
            return False, f"Email delivery to {recipient} failed: {error}"

        return True, f"Weekly report emailed to {recipient}."

    def _append_maintenance_log(
        self,
        snapshot: dict,
        settings: dict,
        *,
        event_type: str,
        severity: str,
        title: str,
        description: str,
        related_code: str | None = None,
        related_name: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> dict:
        entry = {
            "id": _next_numeric_identifier([log["id"] for log in snapshot["maintenance_logs"]], "ML-", 1000),
            "created_at": datetime.now(ZoneInfo(settings["timezone"])).replace(microsecond=0).isoformat(),
            "event_type": event_type,
            "severity": severity,
            "title": title,
            "description": description,
            "related_code": related_code,
            "related_name": related_name,
            "details": details or {},
        }
        snapshot["maintenance_logs"].append(entry)
        return entry

    def _maintenance_logs_in_range(self, snapshot: dict, settings: dict, week_start, week_end) -> list[dict]:
        timezone_name = settings["timezone"]
        return [
            log
            for log in snapshot.get("maintenance_logs", [])
            if week_start <= _parse_datetime(log["created_at"], timezone_name).date() <= week_end
        ]

    def _build_maintenance_summary(self, snapshot: dict, settings: dict) -> dict:
        timezone_name = settings["timezone"]
        today = datetime.now(ZoneInfo(timezone_name)).date()
        week_start = _start_of_week(today)
        week_logs = self._maintenance_logs_in_range(snapshot, settings, week_start, today)
        orders = self._load_order_records(snapshot)
        last_cache_refresh = next(
            (
                log
                for log in sorted(snapshot.get("maintenance_logs", []), key=lambda entry: entry["created_at"], reverse=True)
                if log.get("event_type") == "cache_refresh"
            ),
            None,
        )

        return {
            "inventoryCorrectionsThisWeek": sum(1 for log in week_logs if log.get("event_type") == "inventory_correction"),
            "notificationFailuresThisWeek": sum(1 for log in week_logs if log.get("event_type") == "notification_failure"),
            "openLowStockItems": sum(
                1
                for item in snapshot["inventory"]
                if _inventory_status(int(item["stock"]), int(item["par"]))[0] != "OK"
            ),
            "pendingOrders": sum(1 for order in orders if order["status"] not in {"Delivered", "Cancelled"}),
            "lastCacheRefreshAt": last_cache_refresh["created_at"] if last_cache_refresh else None,
            "lastCacheRefreshLabel": (
                _format_datetime_label(last_cache_refresh["created_at"], timezone_name) if last_cache_refresh else "Not yet"
            ),
        }

    def _recent_maintenance_logs(self, snapshot: dict, settings: dict) -> list[dict]:
        relevant_types = {
            "inventory_correction",
            "notification_failure",
            "cache_refresh",
            "report_generation_failed",
        }
        logs = [
            log
            for log in sorted(snapshot.get("maintenance_logs", []), key=lambda entry: entry["created_at"], reverse=True)
            if log.get("event_type") in relevant_types
        ][:8]
        return [self._serialize_maintenance_log(log, settings) for log in logs]

    def _persist_snapshot(self, snapshot: dict) -> None:
        if self._using_firestore():
            try:
                self.store.save_snapshot(snapshot)
            except Exception as error:
                if not self._should_fallback_to_local(error):
                    raise
                self._activate_local_fallback(error)
        self._cache_local_snapshot(snapshot)
        self._write_backup_snapshot(snapshot)

    def _persist_inventory_item(self, snapshot: dict, item: dict) -> None:
        if self._using_firestore():
            try:
                self.store.save_inventory_item(item)
            except Exception as error:
                if not self._should_fallback_to_local(error):
                    raise
                self._activate_local_fallback(error)
        self._cache_local_snapshot(snapshot)
        if not self._using_firestore():
            self.local_store.save_snapshot(snapshot)
        self._write_backup_snapshot(snapshot)

    def _persist_restock_update(self, snapshot: dict, item: dict, record: dict) -> None:
        if self._using_firestore():
            try:
                self.store.save_restock_update(item, record)
            except Exception as error:
                if not self._should_fallback_to_local(error):
                    raise
                self._activate_local_fallback(error)
        self._cache_local_snapshot(snapshot)
        if not self._using_firestore():
            self.local_store.save_snapshot(snapshot)
        self._write_backup_snapshot(snapshot)

    def _write_backup_snapshot(self, snapshot: dict) -> None:
        self.config.backup_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        backup_file = self.config.backup_dir / f"snapshot-{timestamp}.json"
        with backup_file.open("w", encoding="utf-8") as handle:
            json.dump(snapshot, handle, indent=2, ensure_ascii=True, default=_json_default)

        backup_files = sorted(self.config.backup_dir.glob("snapshot-*.json"))
        for old_file in backup_files[:-20]:
            old_file.unlink(missing_ok=True)

    def _latest_backup_snapshot(self) -> dict[str, str] | None:
        backup_files = sorted(self.config.backup_dir.glob("snapshot-*.json"))
        if not backup_files:
            return None

        latest = backup_files[-1]
        created_at = datetime.fromtimestamp(latest.stat().st_mtime, tz=timezone.utc)
        return {
            "created_at": created_at.astimezone(timezone.utc).replace(microsecond=0).isoformat(),
            "path": str(latest),
        }

    def _backup_file_count(self) -> int:
        if not self.config.backup_dir.exists():
            return 0
        return sum(1 for _ in self.config.backup_dir.glob("snapshot-*.json"))

    def _load_snapshot(self) -> tuple[dict, bool]:
        if self._using_firestore():
            try:
                snapshot = self.store.load_snapshot()
                self._cache_local_snapshot(snapshot)
            except Exception as error:
                if not self._should_fallback_to_local(error):
                    raise
                self._activate_local_fallback(error)
                snapshot = self.local_store.load_snapshot()
        else:
            snapshot = self.local_store.load_snapshot()
        return self._ensure_snapshot(snapshot)

    def _ensure_snapshot(self, snapshot: dict) -> tuple[dict, bool]:
        changed = False
        settings = snapshot.get("settings") or {}
        timezone_name = settings.get("timezone", "Asia/Shanghai")
        seeded = build_seed_snapshot(timezone_name)

        normalized = {
            "bouquets": snapshot.get("bouquets") or [],
            "flowers": snapshot.get("flowers") or [],
            "wrappings": snapshot.get("wrappings") or [],
            "inventory": snapshot.get("inventory") or [],
            "orders": snapshot.get("orders") or [],
            "restocks": snapshot.get("restocks") or [],
            "maintenance_logs": snapshot.get("maintenance_logs") or [],
            "maintenance_reports": snapshot.get("maintenance_reports") or [],
            "settings": snapshot.get("settings") or {},
        }

        for key, default_value in seeded.items():
            if key not in snapshot or snapshot.get(key) is None:
                normalized[key] = default_value
                changed = True
            elif not normalized[key] and default_value:
                normalized[key] = default_value
                changed = True

        if normalized["settings"] != seeded["settings"]:
            merged_settings = seeded["settings"] | normalized["settings"]
            if merged_settings != normalized["settings"]:
                normalized["settings"] = merged_settings
                changed = True

        return normalized, changed

    def _sales_window(self, orders: list[dict], timezone_name: str, end_day, days: int) -> list[dict]:
        window_days = [end_day - timedelta(days=offset) for offset in range(days - 1, -1, -1)]
        revenue_by_day = {day: 0.0 for day in window_days}

        for order in orders:
            created_day = _parse_datetime(order["created_at"], timezone_name).date()
            if created_day in revenue_by_day:
                revenue_by_day[created_day] += float(order["total"])

        return [
            {
                "date": day.isoformat(),
                "label": day.strftime("%a"),
                "amount": round(revenue_by_day[day], 2),
            }
            for day in window_days
        ]

    def _load_order_records(self, snapshot: dict) -> list[dict]:
        settings = snapshot["settings"]
        snapshot_orders = snapshot.get("orders") or []
        orders_are_live = snapshot.get("_orders_source") == "live"

        if snapshot_orders and (orders_are_live or not self._using_firestore()):
            if all("line_items" in order for order in snapshot_orders):
                return sorted(
                    snapshot_orders,
                    key=lambda order: _parse_datetime(order["created_at"], settings["timezone"]),
                    reverse=True,
                )

            normalized_snapshot_orders = [self._normalize_snapshot_order(order) for order in snapshot_orders]
            return sorted(
                normalized_snapshot_orders,
                key=lambda order: _parse_datetime(order["created_at"], settings["timezone"]),
                reverse=True,
            )

        if self._using_firestore():
            try:
                docs = list(self.store.client.collection(self.store.ORDERS_COLLECTION).stream())
                if docs:
                    orders = [self._normalize_firestore_order(doc.id, doc.to_dict() or {}, settings) for doc in docs]
                    snapshot["orders"] = orders
                    self._cache_local_snapshot(snapshot)
                    return sorted(
                        orders,
                        key=lambda order: _parse_datetime(order["created_at"], settings["timezone"]),
                        reverse=True,
                    )
            except Exception as error:
                if not self._should_fallback_to_local(error):
                    raise
                self._activate_local_fallback(error)

        return sorted(
            [self._normalize_snapshot_order(order) for order in snapshot["orders"]],
            key=lambda order: _parse_datetime(order["created_at"], settings["timezone"]),
            reverse=True,
        )

    def _order_matches_search(self, order: dict, search_term: str) -> bool:
        haystacks = [
            str(order.get("id") or "").lower(),
            str(order.get("display_id") or "").lower(),
            str(order.get("source_order_id") or "").lower(),
            str(order.get("customer_name") or "").lower(),
        ]
        return any(search_term in haystack for haystack in haystacks)

    def _normalize_search_order_id(self, search_term: str) -> str | None:
        candidate = search_term.strip()
        if not candidate:
            return None

        if candidate.startswith("#"):
            candidate = candidate[1:]

        if not candidate.isdigit():
            return None

        return f"#{candidate}"

    def _normalize_snapshot_order(self, order: dict) -> dict:
        return {
            **order,
            "display_id": order.get("display_id") or order["id"],
            "source_order_id": order.get("source_order_id") or order["id"],
        }

    def _normalize_firestore_order(self, doc_id: str, data: dict, settings: dict) -> dict:
        bouquet_data = data.get("bouquetData") or {}
        bouquet_items = bouquet_data.get("items") or []
        line_items = []

        for item in bouquet_items:
            quantity = int(item.get("quantity", item.get("qty", 1)) or 1)
            unit_price = float(item.get("flowerPrice", item.get("unit_price", 0)) or 0)
            line_items.append(
                {
                    "flower_id": item.get("flowerId") or item.get("flower_id") or _slugify(item.get("flowerName", "flower")),
                    "name": item.get("flowerName") or item.get("name") or "Custom Flower",
                    "qty": quantity,
                    "unit": item.get("unit") or "stem",
                    "unit_price": unit_price,
                }
            )

        subtotal = float(bouquet_data.get("totalPrice") or 0)
        if subtotal == 0:
            subtotal = round(sum(item["qty"] * item["unit_price"] for item in line_items), 2)

        if not line_items and subtotal > 0:
            line_items = [
                {
                    "flower_id": "custom-bouquet",
                    "name": bouquet_data.get("name") or "Custom Bouquet",
                    "qty": 1,
                    "unit": "bundle",
                    "unit_price": subtotal,
                }
            ]

        delivery_fee = float(data.get("deliveryFee") or 0)
        total = float(data.get("totalPrice") or data.get("orderTotal") or (subtotal + delivery_fee))

        created_at = data.get("createdAt") or bouquet_data.get("createdAt") or datetime.now(timezone.utc)
        delivery_date = data.get("deliveryDate") or created_at
        shop_status = _shop_status_from_firestore(data.get("status"))

        return {
            "id": doc_id,
            "display_id": data.get("sourceOrderId") or f"#{doc_id[:6].upper()}",
            "source_order_id": data.get("sourceOrderId") or f"#{doc_id[:6].upper()}",
            "created_at": created_at,
            "customer_name": data.get("customerName") or "Client Order",
            "phone": data.get("customerPhone") or "",
            "delivery_date": delivery_date,
            "delivery_address": data.get("deliveryAddress") or "Pickup in store",
            "notes": data.get("specialRequests") or bouquet_data.get("note") or "",
            "status": shop_status,
            "subtotal": round(subtotal, 2),
            "delivery_fee": round(delivery_fee, 2),
            "total": round(total, 2),
            "line_items": line_items,
        }

    def _serialize_order(self, order: dict, settings: dict) -> dict:
        currency = settings["currency"]
        timezone_name = settings["timezone"]
        line_items = []
        for line_item in order["line_items"]:
            line_total = round(float(line_item["unit_price"]) * int(line_item["qty"]), 2)
            line_items.append(
                {
                    "flowerId": line_item["flower_id"],
                    "name": line_item["name"],
                    "qty": int(line_item["qty"]),
                    "unit": line_item["unit"],
                    "unitPrice": float(line_item["unit_price"]),
                    "unitPriceDisplay": _format_currency(float(line_item["unit_price"]), currency),
                    "lineTotal": line_total,
                    "lineTotalDisplay": _format_currency(line_total, currency),
                }
            )

        return {
            "id": order["id"],
            "displayId": order.get("display_id") or order["id"],
            "createdAt": order["created_at"],
            "dateLabel": _format_datetime_label(order["created_at"], timezone_name),
            "customerName": order["customer_name"],
            "phone": order.get("phone", ""),
            "deliveryDate": order["delivery_date"],
            "deliveryDateLabel": _format_delivery_label(order["delivery_date"], timezone_name),
            "deliveryAddress": order.get("delivery_address", ""),
            "notes": order.get("notes", ""),
            "itemsSummary": _summary_for_items(order["line_items"]),
            "subtotal": round(float(order["subtotal"]), 2),
            "subtotalDisplay": _format_currency(float(order["subtotal"]), currency),
            "deliveryFee": round(float(order["delivery_fee"]), 2),
            "deliveryFeeDisplay": _format_currency(float(order["delivery_fee"]), currency),
            "total": round(float(order["total"]), 2),
            "totalDisplay": _format_currency(float(order["total"]), currency),
            "status": order["status"],
            "statusClass": _status_class_for_order(order["status"]),
            "lineItems": line_items,
        }

    def _serialize_flower(self, flower: dict, inventory_by_code: dict[str, dict], settings: dict) -> dict:
        inventory_item = inventory_by_code.get(flower["inventory_code"], {})
        stock = int(inventory_item.get("stock", 0))
        par = int(inventory_item.get("par", 10))
        status, status_class = _flower_status(stock, par, flower.get("season", "Year-round"))

        return {
            "id": flower["id"],
            "name": flower["name"],
            "category": flower.get("category", ""),
            "color": flower.get("color", ""),
            "price": round(float(flower["price"]), 2),
            "priceDisplay": _format_currency(float(flower["price"]), settings["currency"]),
            "unit": flower.get("unit", "stem"),
            "season": flower.get("season", "Year-round"),
            "description": flower.get("description", ""),
            "image": flower.get("image") or DEFAULT_FLOWER_IMAGE,
            "stock": stock,
            "status": status,
            "statusClass": status_class,
            "inventoryCode": flower["inventory_code"],
            "parLevel": par,
        }

    def _serialize_bouquet(self, bouquet: dict, flowers_by_id: dict[str, dict]) -> dict:
        components = []
        component_summary_parts = []
        total_quantity = 0

        for component in bouquet.get("components", []):
            flower_id = component.get("flower_id") or component.get("flowerId")
            quantity = int(component.get("quantity", 0))
            if not flower_id or quantity <= 0:
                continue

            flower = flowers_by_id.get(flower_id)
            if not flower:
                continue

            total_quantity += quantity
            component_summary_parts.append(f"{flower['name']} x {quantity}")
            components.append(
                {
                    "flowerId": flower_id,
                    "flowerName": flower["name"],
                    "quantity": quantity,
                    "unit": flower.get("unit", "stem"),
                    "image": flower.get("image") or DEFAULT_FLOWER_IMAGE,
                }
            )

        return {
            "id": bouquet["id"],
            "name": bouquet["name"],
            "image": bouquet.get("image") or DEFAULT_FLOWER_IMAGE,
            "components": components,
            "varietyCount": len(components),
            "totalQuantity": total_quantity,
            "componentSummary": ", ".join(component_summary_parts),
        }

    def _serialize_wrapping(self, wrapping: dict, settings: dict) -> dict:
        price = float(wrapping.get("price", 0))
        return {
            "id": wrapping.get("id", ""),
            "name": wrapping.get("name", ""),
            "price": round(price, 2),
            "priceDisplay": _format_currency(price, settings["currency"]),
            "image": wrapping.get("imageURL") or wrapping.get("image") or DEFAULT_FLOWER_IMAGE,
        }

    def _average_costs_by_item(self, snapshot: dict) -> dict[str, float]:
        totals: dict[str, dict[str, float]] = {}
        for record in snapshot.get("restocks", []):
            item_code = str(record["item_code"])
            quantity = int(record["quantity"])
            if quantity <= 0:
                continue
            entry = totals.setdefault(item_code, {"quantity": 0.0, "cost": 0.0})
            entry["quantity"] += quantity
            entry["cost"] += quantity * float(record["unit_cost"])

        return {
            item_code: round(values["cost"] / values["quantity"], 2)
            for item_code, values in totals.items()
            if values["quantity"] > 0
        }

    def _serialize_inventory_item(self, item: dict, average_cost: float | None = None, currency: str = "USD") -> dict:
        status, status_class = _inventory_status(int(item["stock"]), int(item["par"]))
        return {
            "code": item["code"],
            "name": item["name"],
            "category": item["category"],
            "stock": int(item["stock"]),
            "par": int(item["par"]),
            "averageCost": round(float(average_cost), 2) if average_cost is not None else None,
            "averageCostDisplay": _format_currency(float(average_cost), currency) if average_cost is not None else "N/A",
            "status": status,
            "statusClass": status_class,
            "unit": item.get("unit", ""),
            "linkedFlowerId": item.get("linked_flower_id"),
        }

    def _serialize_restock(self, record: dict, settings: dict) -> dict:
        total_cost = round(float(record["unit_cost"]) * int(record["quantity"]), 2)
        timezone_name = settings["timezone"]
        created_at = _parse_datetime(record["created_at"], timezone_name)
        return {
            "id": record["id"],
            "createdAt": record["created_at"],
            "dateLabel": created_at.strftime("%b %d, %Y"),
            "itemCode": record["item_code"],
            "itemName": record["item_name"],
            "quantity": int(record["quantity"]),
            "unitCost": round(float(record["unit_cost"]), 2),
            "unitCostDisplay": _format_currency(float(record["unit_cost"]), settings["currency"]),
            "totalCost": total_cost,
            "totalCostDisplay": _format_currency(total_cost, settings["currency"]),
        }

    def _serialize_maintenance_log(self, record: dict, settings: dict) -> dict:
        event_labels = {
            "inventory_correction": "Inventory correction",
            "notification_failure": "Notification failure",
            "cache_refresh": "Cache refresh",
            "report_generation_failed": "Report generation failed",
            "report_generated": "Report generated",
            "report_sent": "Report delivered",
        }
        return {
            "id": record["id"],
            "createdAt": record["created_at"],
            "dateLabel": _format_datetime_label(record["created_at"], settings["timezone"]),
            "eventType": record["event_type"],
            "eventLabel": event_labels.get(record["event_type"], record["event_type"].replace("_", " ").title()),
            "severity": record.get("severity", "info"),
            "title": record["title"],
            "description": record["description"],
            "relatedCode": record.get("related_code"),
            "relatedName": record.get("related_name"),
        }

    def _serialize_weekly_report(self, report: dict | None, settings: dict) -> dict | None:
        if report is None:
            return None

        return {
            "id": report["id"],
            "createdAt": report["created_at"],
            "createdAtLabel": _format_datetime_label(report["created_at"], settings["timezone"]),
            "weekStart": report["week_start"],
            "weekEnd": report["week_end"],
            "weekLabel": report.get("week_label") or _week_range_label(
                datetime.fromisoformat(report["week_start"]).date(),
                datetime.fromisoformat(report["week_end"]).date(),
            ),
            "status": report.get("status", "ready"),
            "notificationStatus": report.get("notification_status", "pending"),
            "deliveryMessage": report.get("delivery_message", ""),
            "recipient": report.get("recipient", ""),
            "inventoryCorrections": int(report.get("inventory_corrections", 0)),
            "notificationFailures": int(report.get("notification_failures", 0)),
            "weekOrders": int(report.get("week_orders", 0)),
            "pendingOrders": int(report.get("pending_orders", 0)),
            "lowStockItems": int(report.get("low_stock_items", 0)),
            "downloadUrl": (
                f"/api/maintenance/reports/{report['id']}/download" if report.get("file_path") else None
            ),
        }
