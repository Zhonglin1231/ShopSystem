from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from backend.config import get_config
from backend.repository import FirestoreStore
from backend.seed_data import DEFAULT_FLOWER_IMAGE


def load_local_snapshot(project_root: Path) -> dict:
    store_path = project_root / "backend" / "data" / "store.json"
    if not store_path.exists():
        raise FileNotFoundError(f"Local snapshot not found: {store_path}")

    with store_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def parse_iso_datetime(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def build_firestore_order(order: dict) -> dict:
    bouquet_items = [
        {
            "flowerId": item["flower_id"],
            "flowerName": item["name"],
            "flowerPrice": item["unit_price"],
            "quantity": item["qty"],
            "unit": item.get("unit", "stem"),
        }
        for item in order.get("line_items", [])
    ]

    created_at = parse_iso_datetime(order["created_at"])
    delivery_date = parse_iso_datetime(order["delivery_date"])
    subtotal = float(order.get("subtotal", 0))
    delivery_fee = float(order.get("delivery_fee", 0))
    total = float(order.get("total", subtotal + delivery_fee))

    status_map = {
        "Preparing": "待确认",
        "Ready": "待取货",
        "Delivered": "已完成",
        "Cancelled": "已取消",
    }

    return {
        "customerName": order["customer_name"],
        "customerPhone": order.get("phone", ""),
        "deliveryAddress": order.get("delivery_address", ""),
        "deliveryDate": delivery_date,
        "specialRequests": order.get("notes", ""),
        "status": status_map.get(order.get("status", "Preparing"), "待确认"),
        "createdAt": created_at,
        "userId": "shop-admin",
        "source": "shopsystem-local-sync",
        "sourceOrderId": order["id"],
        "bouquetData": {
            "name": f"{order['customer_name']}花束",
            "note": order.get("notes", ""),
            "wrappingStyle": "店舖訂單",
            "ribbonColorHex": "#111111",
            "totalPrice": subtotal,
            "createdAt": created_at,
            "items": bouquet_items,
        },
        "deliveryFee": delivery_fee,
        "totalPrice": total,
    }


def sanitize_snapshot(snapshot: dict) -> dict:
    cleaned = {
        "flowers": [],
        "inventory": list(snapshot.get("inventory", [])),
        "orders": list(snapshot.get("orders", [])),
        "restocks": list(snapshot.get("restocks", [])),
        "maintenance_logs": list(snapshot.get("maintenance_logs", [])),
        "maintenance_reports": list(snapshot.get("maintenance_reports", [])),
        "settings": dict(snapshot.get("settings", {})),
    }

    for flower in snapshot.get("flowers", []):
        next_flower = dict(flower)
        image = next_flower.get("image")
        if isinstance(image, str) and image.startswith("data:image/"):
          next_flower["image"] = DEFAULT_FLOWER_IMAGE
          next_flower["imageWasSanitized"] = True
        cleaned["flowers"].append(next_flower)

    return cleaned


def firestore_doc_id_from_order(order_id: str) -> str:
    normalized = order_id.replace("#", "").strip()
    return f"shop-order-{normalized}"


def backup_firestore_state(store: FirestoreStore) -> str:
    db = store.client
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_id = f"sync-{timestamp}"

    legacy_doc = db.collection(store.LEGACY_COLLECTION).document(store.LEGACY_DOCUMENT).get(timeout=10)
    current_orders = [{"id": doc.id, "data": doc.to_dict() or {}} for doc in db.collection(store.ORDERS_COLLECTION).stream()]
    current_flowers = [{"id": doc.id, "data": doc.to_dict() or {}} for doc in db.collection(store.FLOWERS_COLLECTION).stream()]
    current_inventory = [{"id": doc.id, "data": doc.to_dict() or {}} for doc in db.collection(store.INVENTORY_COLLECTION).stream()]
    current_restocks = [{"id": doc.id, "data": doc.to_dict() or {}} for doc in db.collection(store.RESTOCKS_COLLECTION).stream()]
    settings_doc = db.collection(store.SETTINGS_COLLECTION).document(store.SETTINGS_DOCUMENT).get(timeout=10)

    db.collection("migration_backups").document(backup_id).set(
        {
            "createdAt": datetime.now(timezone.utc),
            "source": "sync_local_to_firestore",
            "legacyShopsystem": legacy_doc.to_dict() if legacy_doc.exists else None,
            "flowers": current_flowers,
            "inventory": current_inventory,
            "restocks": current_restocks,
            "settings": settings_doc.to_dict() if settings_doc.exists else None,
            "orders": current_orders,
        },
        timeout=10,
    )

    return backup_id


def sync_local_to_firestore() -> dict:
    config = get_config()
    store = FirestoreStore(config)
    db = store.client
    snapshot = sanitize_snapshot(load_local_snapshot(config.project_root))

    backup_id = backup_firestore_state(store)
    store.save_snapshot(snapshot)

    existing_orders = list(db.collection(store.ORDERS_COLLECTION).stream())
    for doc in existing_orders:
        doc.reference.delete(timeout=10)

    for order in snapshot.get("orders", []):
        doc_id = firestore_doc_id_from_order(order["id"])
        db.collection(store.ORDERS_COLLECTION).document(doc_id).set(build_firestore_order(order), timeout=10)

    db.collection(store.LEGACY_COLLECTION).document(store.LEGACY_DOCUMENT).delete(timeout=10)

    return {
        "backupId": backup_id,
        "ordersSynced": len(snapshot.get("orders", [])),
        "flowersSynced": len(snapshot.get("flowers", [])),
        "inventorySynced": len(snapshot.get("inventory", [])),
        "restocksSynced": len(snapshot.get("restocks", [])),
        "legacyDeleted": True,
    }


if __name__ == "__main__":
    result = sync_local_to_firestore()
    print(result)
