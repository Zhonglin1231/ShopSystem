from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo


DEFAULT_FLOWER_IMAGE = (
    "https://images.unsplash.com/photo-1468327768560-75b778cbb551"
    "?auto=format&fit=crop&w=1200&q=80"
)


def _iso(value: datetime) -> str:
    return value.replace(microsecond=0).isoformat()


def build_seed_snapshot(timezone_name: str = "Asia/Shanghai") -> dict:
    timezone = ZoneInfo(timezone_name)
    now = datetime.now(timezone).replace(second=0, microsecond=0)

    bouquets = []

    flowers = [
        {
            "id": "dusty-rose",
            "name": "Dusty Rose",
            "category": "Rose",
            "color": "Blush Pink",
            "price": 4.5,
            "unit": "stem",
            "season": "Year-round",
            "description": "Soft pink rose with muted tones for romantic arrangements.",
            "image": "https://images.unsplash.com/photo-1595483416504-65b0328153c1?auto=format&fit=crop&w=1200&q=80",
            "inventory_code": "R-001",
        },
        {
            "id": "white-tulip",
            "name": "White Tulip",
            "category": "Tulip",
            "color": "White",
            "price": 3.0,
            "unit": "stem",
            "season": "Spring",
            "description": "Crisp white tulips for elegant bouquets and event work.",
            "image": "https://images.unsplash.com/photo-1621025210758-0a014e936aaf?auto=format&fit=crop&w=1200&q=80",
            "inventory_code": "T-014",
        },
        {
            "id": "silver-dollar-eucalyptus",
            "name": "Silver Dollar Eucalyptus",
            "category": "Eucalyptus",
            "color": "Green",
            "price": 12.0,
            "unit": "bunch",
            "season": "Year-round",
            "description": "Textural greenery with a fresh scent and rounded leaves.",
            "image": "https://images.unsplash.com/photo-1678902439117-ea4268c7661b?auto=format&fit=crop&w=1200&q=80",
            "inventory_code": "E-042",
        },
        {
            "id": "pink-peony",
            "name": "Pink Peony",
            "category": "Peony",
            "color": "Coral",
            "price": 8.5,
            "unit": "stem",
            "season": "Spring-Summer",
            "description": "Lush seasonal bloom with layered petals and strong visual impact.",
            "image": "https://images.unsplash.com/photo-1588457776180-4206b4909301?auto=format&fit=crop&w=1200&q=80",
            "inventory_code": "P-017",
        },
        {
            "id": "garden-rose",
            "name": "Garden Rose",
            "category": "Rose",
            "color": "Ivory",
            "price": 6.0,
            "unit": "stem",
            "season": "Year-round",
            "description": "Premium rose with a fuller head for bridal and premium work.",
            "image": "https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=1200&q=80",
            "inventory_code": "R-028",
        },
        {
            "id": "hydrangea",
            "name": "Hydrangea",
            "category": "Hydrangea",
            "color": "Mixed",
            "price": 9.0,
            "unit": "stem",
            "season": "Summer",
            "description": "Large-volume bloom for statement bouquets and installations.",
            "image": "https://images.unsplash.com/photo-1597848212624-c84e6d3b6166?auto=format&fit=crop&w=1200&q=80",
            "inventory_code": "H-033",
        },
        {
            "id": "babys-breath",
            "name": "Baby's Breath",
            "category": "Filler",
            "color": "White",
            "price": 5.0,
            "unit": "bunch",
            "season": "Year-round",
            "description": "Airy filler flower that softens mixed bouquets.",
            "image": "https://images.unsplash.com/photo-1526045478516-99145907023c?auto=format&fit=crop&w=1200&q=80",
            "inventory_code": "B-010",
        },
        {
            "id": "lavender",
            "name": "Lavender",
            "category": "Lavender",
            "color": "Lilac",
            "price": 7.5,
            "unit": "bunch",
            "season": "Summer-Autumn",
            "description": "Aromatic bundle used for texture, fragrance, and dried work.",
            "image": "https://images.unsplash.com/photo-1468327768560-75b778cbb551?auto=format&fit=crop&w=1200&q=80",
            "inventory_code": "L-022",
        },
    ]

    inventory = [
        {
            "code": "R-001",
            "name": "Dusty Rose",
            "category": "Fresh Flowers",
            "stock": 145,
            "par": 50,
            "unit": "stem",
            "linked_flower_id": "dusty-rose",
            "updated_at": _iso(now - timedelta(hours=6)),
        },
        {
            "code": "T-014",
            "name": "White Tulip",
            "category": "Fresh Flowers",
            "stock": 86,
            "par": 35,
            "unit": "stem",
            "linked_flower_id": "white-tulip",
            "updated_at": _iso(now - timedelta(hours=4)),
        },
        {
            "code": "E-042",
            "name": "Silver Dollar Eucalyptus",
            "category": "Foliage",
            "stock": 12,
            "par": 20,
            "unit": "bunch",
            "linked_flower_id": "silver-dollar-eucalyptus",
            "updated_at": _iso(now - timedelta(hours=2)),
        },
        {
            "code": "P-017",
            "name": "Pink Peony",
            "category": "Fresh Flowers",
            "stock": 18,
            "par": 15,
            "unit": "stem",
            "linked_flower_id": "pink-peony",
            "updated_at": _iso(now - timedelta(hours=1)),
        },
        {
            "code": "R-028",
            "name": "Garden Rose",
            "category": "Fresh Flowers",
            "stock": 64,
            "par": 25,
            "unit": "stem",
            "linked_flower_id": "garden-rose",
            "updated_at": _iso(now - timedelta(hours=5)),
        },
        {
            "code": "H-033",
            "name": "Hydrangea",
            "category": "Fresh Flowers",
            "stock": 24,
            "par": 18,
            "unit": "stem",
            "linked_flower_id": "hydrangea",
            "updated_at": _iso(now - timedelta(hours=7)),
        },
        {
            "code": "B-010",
            "name": "Baby's Breath",
            "category": "Filler Flowers",
            "stock": 31,
            "par": 12,
            "unit": "bunch",
            "linked_flower_id": "babys-breath",
            "updated_at": _iso(now - timedelta(hours=8)),
        },
        {
            "code": "L-022",
            "name": "Lavender",
            "category": "Filler Flowers",
            "stock": 14,
            "par": 10,
            "unit": "bunch",
            "linked_flower_id": "lavender",
            "updated_at": _iso(now - timedelta(hours=9)),
        },
        {
            "code": "V-102",
            "name": 'Glass Cylinder 8"',
            "category": "Hardgoods",
            "stock": 34,
            "par": 10,
            "unit": "piece",
            "linked_flower_id": None,
            "updated_at": _iso(now - timedelta(days=1, hours=3)),
        },
    ]

    flower_lookup = {flower["id"]: flower for flower in flowers}

    def build_order(
        order_id: str,
        created_at: datetime,
        customer_name: str,
        status: str,
        phone: str,
        delivery_date: datetime,
        delivery_address: str,
        notes: str,
        item_specs: list[tuple[str, int]],
    ) -> dict:
        line_items = []
        subtotal = 0.0
        for flower_id, quantity in item_specs:
            flower = flower_lookup[flower_id]
            line_total = round(flower["price"] * quantity, 2)
            subtotal += line_total
            line_items.append(
                {
                    "flower_id": flower["id"],
                    "name": flower["name"],
                    "qty": quantity,
                    "unit": flower["unit"],
                    "unit_price": flower["price"],
                }
            )

        delivery_fee = 0.0 if delivery_address == "Pickup in store" else 8.0
        return {
            "id": order_id,
            "created_at": _iso(created_at),
            "customer_name": customer_name,
            "phone": phone,
            "delivery_date": _iso(delivery_date),
            "delivery_address": delivery_address,
            "notes": notes,
            "status": status,
            "subtotal": round(subtotal, 2),
            "delivery_fee": delivery_fee,
            "total": round(subtotal + delivery_fee, 2),
            "line_items": line_items,
        }

    orders = [
        build_order(
            "#8902",
            now.replace(hour=10, minute=30),
            "Alice Chen",
            "Preparing",
            "+1 (555) 204-1133",
            now.replace(hour=15, minute=0),
            "28 Blossom Lane, San Francisco, CA",
            "Card: Happy Birthday Mom. Use blush-toned wrapping.",
            [("pink-peony", 12), ("silver-dollar-eucalyptus", 2)],
        ),
        build_order(
            "#8901",
            now.replace(hour=9, minute=15),
            "Mark Davis",
            "Delivered",
            "+1 (555) 887-4420",
            now.replace(hour=11, minute=0),
            "Pickup in store",
            "No card needed.",
            [("white-tulip", 12), ("babys-breath", 1)],
        ),
        build_order(
            "#8900",
            (now - timedelta(days=1)).replace(hour=16, minute=10),
            "Sarah Lee",
            "Delivered",
            "+1 (555) 312-6698",
            (now - timedelta(days=1)).replace(hour=18, minute=0),
            "14 Magnolia Ave, Oakland, CA",
            "Vintage aesthetic, neutral palette.",
            [("dusty-rose", 10), ("pink-peony", 6), ("lavender", 2)],
        ),
        build_order(
            "#8899",
            (now - timedelta(days=2)).replace(hour=13, minute=40),
            "Jin Ho",
            "Ready",
            "+1 (555) 998-4412",
            (now - timedelta(days=2)).replace(hour=16, minute=30),
            "77 Clement Street, San Francisco, CA",
            "Call on arrival.",
            [("garden-rose", 8), ("hydrangea", 4)],
        ),
        build_order(
            "#8898",
            (now - timedelta(days=4)).replace(hour=11, minute=5),
            "Natalie Wong",
            "Delivered",
            "+1 (555) 663-1900",
            (now - timedelta(days=4)).replace(hour=14, minute=0),
            "Pickup in store",
            "Wrap in kraft paper.",
            [("dusty-rose", 6), ("white-tulip", 10)],
        ),
        build_order(
            "#8897",
            (now - timedelta(days=6)).replace(hour=14, minute=20),
            "Omar Patel",
            "Delivered",
            "+1 (555) 880-7701",
            (now - timedelta(days=6)).replace(hour=18, minute=15),
            "9 Rosewood Ct, Berkeley, CA",
            "Wedding table sample arrangement.",
            [("hydrangea", 5), ("silver-dollar-eucalyptus", 3), ("garden-rose", 7)],
        ),
    ]

    restocks = [
        {
            "id": "RS-1003",
            "created_at": _iso(now - timedelta(days=1, hours=2)),
            "item_code": "P-017",
            "item_name": "Pink Peony",
            "quantity": 25,
            "unit_cost": 4.4,
        },
        {
            "id": "RS-1002",
            "created_at": _iso(now - timedelta(days=3, hours=1)),
            "item_code": "V-102",
            "item_name": 'Glass Cylinder 8"',
            "quantity": 20,
            "unit_cost": 4.5,
        },
        {
            "id": "RS-1001",
            "created_at": _iso(now - timedelta(days=5, hours=5)),
            "item_code": "R-001",
            "item_name": "Dusty Rose",
            "quantity": 100,
            "unit_cost": 1.2,
        },
    ]

    settings = {
        "storeName": "Wai Lan Garden",
        "contactEmail": "hello@wailangarden.com",
        "maintenanceEmail": "hello@wailangarden.com",
        "currency": "USD",
        "timezone": timezone_name,
        "deliveryRadius": 15,
    }

    return {
        "bouquets": deepcopy(bouquets),
        "flowers": deepcopy(flowers),
        "inventory": deepcopy(inventory),
        "orders": deepcopy(orders),
        "restocks": deepcopy(restocks),
        "maintenance_logs": [],
        "maintenance_reports": [],
        "settings": deepcopy(settings),
    }
