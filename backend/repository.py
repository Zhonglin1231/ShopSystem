from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import datetime, time, timedelta
from pathlib import Path
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
            json.dump(snapshot, handle, indent=2, ensure_ascii=True)


class FirestoreStore(SnapshotStore):
    def __init__(self, config: AppConfig):
        if firebase_admin is None or credentials is None or firestore is None:
            raise RepositoryError("Firebase Admin SDK is not installed.")

        if config.firebase_credentials_path is None:
            raise RepositoryError("Firebase credential file was not found.")

        app_name = "shopsystem"
        existing_app = None
        for app in firebase_admin._apps.values():  # type: ignore[attr-defined]
            if getattr(app, "name", None) == app_name:
                existing_app = app
                break

        if existing_app is None:
            cert = credentials.Certificate(str(config.firebase_credentials_path))
            existing_app = firebase_admin.initialize_app(cert, name=app_name)

        self.client = firestore.client(existing_app)
        self.collection = config.firestore_collection
        self.document = config.firestore_document

    def load_snapshot(self) -> dict:
        doc = self.client.collection(self.collection).document(self.document).get(timeout=2)
        if not doc.exists:
            return {}
        return doc.to_dict() or {}

    def save_snapshot(self, snapshot: dict) -> None:
        self.client.collection(self.collection).document(self.document).set(snapshot, timeout=2)


def create_store(config: AppConfig) -> tuple[SnapshotStore, str]:
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
    thread.join(timeout=2.5)

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


def _parse_datetime(value: str, timezone_name: str) -> datetime:
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


class ShopRepository:
    def __init__(self, store: SnapshotStore, backend_name: str):
        self.store = store
        self.backend_name = backend_name
        self._lock = Lock()

    def initialize(self) -> None:
        with self._lock:
            snapshot, changed = self._ensure_snapshot(self.store.load_snapshot())
            if changed:
                self.store.save_snapshot(snapshot)

    def get_health(self) -> dict:
        return {"status": "ok", "storage": self.backend_name}

    def list_orders(self) -> list[dict]:
        snapshot, _ = self._load_snapshot()
        settings = snapshot["settings"]
        orders = sorted(snapshot["orders"], key=lambda order: order["created_at"], reverse=True)
        return [self._serialize_order(order, settings) for order in orders]

    def create_order(self, payload: dict) -> dict:
        with self._lock:
            snapshot, _ = self._load_snapshot()
            settings = snapshot["settings"]
            flowers = {flower["id"]: flower for flower in snapshot["flowers"]}
            inventory_by_code = {item["code"]: item for item in snapshot["inventory"]}

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
                "id": _next_numeric_identifier([item["id"] for item in snapshot["orders"]], "#", 8896),
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

            snapshot["orders"].append(order)
            self.store.save_snapshot(snapshot)
            return self._serialize_order(order, settings)

    def update_order_status(self, order_id: str, status: str) -> dict:
        allowed_statuses = {"Preparing", "Ready", "Delivered", "Cancelled"}
        if status not in allowed_statuses:
            raise ValidationError("Unsupported order status.")

        with self._lock:
            snapshot, _ = self._load_snapshot()
            settings = snapshot["settings"]
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
            self.store.save_snapshot(snapshot)
            return self._serialize_order(order, settings)

    def list_flowers(self) -> list[dict]:
        snapshot, _ = self._load_snapshot()
        inventory_by_code = {item["code"]: item for item in snapshot["inventory"]}
        settings = snapshot["settings"]
        flowers = sorted(snapshot["flowers"], key=lambda flower: flower["name"].lower())
        return [self._serialize_flower(flower, inventory_by_code, settings) for flower in flowers]

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
            self.store.save_snapshot(snapshot)
            inventory_by_code = {item["code"]: item for item in snapshot["inventory"]}
            return self._serialize_flower(flower, inventory_by_code, settings)

    def get_inventory(self) -> dict:
        snapshot, _ = self._load_snapshot()
        settings = snapshot["settings"]
        items = [self._serialize_inventory_item(item) for item in sorted(snapshot["inventory"], key=lambda item: item["code"])]
        restocks = [
            self._serialize_restock(record, settings)
            for record in sorted(snapshot["restocks"], key=lambda item: item["created_at"], reverse=True)
        ]
        return {"items": items, "restocks": restocks}

    def adjust_inventory(self, item_code: str, delta: int) -> dict:
        with self._lock:
            snapshot, _ = self._load_snapshot()
            settings = snapshot["settings"]
            item = next((entry for entry in snapshot["inventory"] if entry["code"] == item_code), None)
            if item is None:
                raise ValidationError("Inventory item not found.")

            item["stock"] = max(0, int(item["stock"]) + delta)
            item["updated_at"] = datetime.now(ZoneInfo(settings["timezone"])).replace(microsecond=0).isoformat()
            self.store.save_snapshot(snapshot)
            return self._serialize_inventory_item(item)

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
            self.store.save_snapshot(snapshot)
            return self._serialize_restock(record, settings)

    def get_settings(self) -> dict:
        snapshot, _ = self._load_snapshot()
        return snapshot["settings"]

    def update_settings(self, payload: dict) -> dict:
        with self._lock:
            snapshot, _ = self._load_snapshot()
            snapshot["settings"] = {
                "storeName": payload["storeName"].strip(),
                "contactEmail": payload["contactEmail"].strip(),
                "currency": payload["currency"].strip().upper(),
                "timezone": payload["timezone"].strip(),
                "deliveryRadius": int(payload["deliveryRadius"]),
            }
            self.store.save_snapshot(snapshot)
            return snapshot["settings"]

    def get_dashboard(self) -> dict:
        snapshot, _ = self._load_snapshot()
        settings = snapshot["settings"]
        timezone_name = settings["timezone"]
        today = datetime.now(ZoneInfo(timezone_name)).date()

        orders = sorted(snapshot["orders"], key=lambda order: order["created_at"], reverse=True)
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
            revenue_trend = f"{revenue_delta / previous_revenue:+.0%} this week"
        elif current_revenue > 0:
            revenue_trend = "Fresh week of sales"
        else:
            revenue_trend = "No sales yet"

        order_delta = len(today_orders) - len(yesterday_orders)
        if order_delta == 0:
            order_trend = "No change vs yesterday"
        else:
            order_trend = f"{order_delta:+d} vs yesterday"

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
                    "trend": "Action required" if pending_orders else "All clear",
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
                    "trend": "Items critical" if low_stock_items else "Healthy levels",
                    "isUp": False,
                },
            ],
            "recentOrders": recent_orders,
            "weeklySales": current_window,
        }

    def get_analytics(self) -> dict:
        snapshot, _ = self._load_snapshot()
        settings = snapshot["settings"]
        timezone_name = settings["timezone"]
        today = datetime.now(ZoneInfo(timezone_name)).date()

        orders = [order for order in snapshot["orders"] if order["status"] != "Cancelled"]
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

    def _load_snapshot(self) -> tuple[dict, bool]:
        snapshot = self.store.load_snapshot()
        return self._ensure_snapshot(snapshot)

    def _ensure_snapshot(self, snapshot: dict) -> tuple[dict, bool]:
        changed = False
        settings = snapshot.get("settings") or {}
        timezone_name = settings.get("timezone", "America/New_York")
        seeded = build_seed_snapshot(timezone_name)

        normalized = {
            "flowers": snapshot.get("flowers") or [],
            "inventory": snapshot.get("inventory") or [],
            "orders": snapshot.get("orders") or [],
            "restocks": snapshot.get("restocks") or [],
            "settings": snapshot.get("settings") or {},
        }

        for key, default_value in seeded.items():
            if not normalized[key]:
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

    def _serialize_inventory_item(self, item: dict) -> dict:
        status, status_class = _inventory_status(int(item["stock"]), int(item["par"]))
        return {
            "code": item["code"],
            "name": item["name"],
            "category": item["category"],
            "stock": int(item["stock"]),
            "par": int(item["par"]),
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
