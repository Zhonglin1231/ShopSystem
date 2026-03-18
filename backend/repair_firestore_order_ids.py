from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from backend.config import get_config
from backend.repository import FirestoreStore


ORDER_ID_PATTERN = re.compile(r"^#(\d+)$")


def parse_created_at(payload: dict[str, Any]) -> tuple[int, str]:
    raw_value = payload.get("createdAt")
    if isinstance(raw_value, datetime):
        if raw_value.tzinfo is None:
            raw_value = raw_value.replace(tzinfo=timezone.utc)
        return int(raw_value.timestamp() * 1_000_000), raw_value.isoformat()

    try:
        if raw_value is not None:
            normalized = datetime.fromisoformat(str(raw_value).replace("Z", "+00:00"))
            if normalized.tzinfo is None:
                normalized = normalized.replace(tzinfo=timezone.utc)
            return int(normalized.timestamp() * 1_000_000), normalized.isoformat()
    except ValueError:
        pass

    return 0, str(raw_value or "")


def extract_source_order_id(payload: dict[str, Any]) -> str:
    raw_value = payload.get("sourceOrderId")
    if isinstance(raw_value, str):
        return raw_value.strip()
    return ""


def backup_orders(store: FirestoreStore) -> str:
    db = store.client
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_id = f"repair-order-ids-{timestamp}"
    orders = [{"id": doc.id, "data": doc.to_dict() or {}} for doc in db.collection(store.ORDERS_COLLECTION).stream()]

    db.collection("migration_backups").document(backup_id).set(
        {
            "createdAt": datetime.now(timezone.utc),
            "source": "repair_firestore_order_ids",
            "orders": orders,
        },
        timeout=10,
    )
    return backup_id


def plan_repairs(store: FirestoreStore) -> tuple[list[dict[str, Any]], int]:
    docs = list(store.client.collection(store.ORDERS_COLLECTION).stream())
    if not docs:
        return [], 0

    existing_numbers: list[int] = []
    grouped_docs: dict[str, list[dict[str, Any]]] = defaultdict(list)
    invalid_docs: list[dict[str, Any]] = []

    for doc in docs:
        payload = doc.to_dict() or {}
        source_order_id = extract_source_order_id(payload)
        created_rank, created_at = parse_created_at(payload)
        entry = {
            "doc_id": doc.id,
            "payload": payload,
            "source_order_id": source_order_id,
            "created_rank": created_rank,
            "created_at": created_at,
        }

        match = ORDER_ID_PATTERN.fullmatch(source_order_id)
        if match:
            existing_numbers.append(int(match.group(1)))
            grouped_docs[source_order_id].append(entry)
        else:
            invalid_docs.append(entry)

    next_number = max(existing_numbers, default=0)
    repairs: list[dict[str, Any]] = []

    for source_order_id, entries in grouped_docs.items():
        if len(entries) == 1:
            continue

        sorted_entries = sorted(entries, key=lambda item: (item["created_rank"], item["doc_id"]))
        for duplicate in sorted_entries[1:]:
            next_number += 1
            repairs.append(
                {
                    "doc_id": duplicate["doc_id"],
                    "from": source_order_id,
                    "to": f"#{next_number}",
                    "created_at": duplicate["created_at"],
                }
            )

    for invalid in sorted(invalid_docs, key=lambda item: (item["created_rank"], item["doc_id"])):
        next_number += 1
        repairs.append(
            {
                "doc_id": invalid["doc_id"],
                "from": invalid["source_order_id"] or "<missing>",
                "to": f"#{next_number}",
                "created_at": invalid["created_at"],
            }
        )

    return repairs, max(existing_numbers, default=0)


def apply_repairs(store: FirestoreStore, repairs: list[dict[str, Any]]) -> None:
    batch = store.client.batch()
    writes_in_batch = 0

    for repair in repairs:
        doc_ref = store.client.collection(store.ORDERS_COLLECTION).document(repair["doc_id"])
        batch.set(doc_ref, {"sourceOrderId": repair["to"]}, merge=True)
        writes_in_batch += 1

        if writes_in_batch == 400:
            batch.commit(timeout=10)
            batch = store.client.batch()
            writes_in_batch = 0

    if writes_in_batch > 0:
        batch.commit(timeout=10)


def main() -> None:
    parser = argparse.ArgumentParser(description="Repair duplicate Firestore order display IDs.")
    parser.add_argument("--apply", action="store_true", help="Persist the repaired sourceOrderId values.")
    args = parser.parse_args()

    config = get_config()
    store = FirestoreStore(config)
    repairs, max_existing_number = plan_repairs(store)

    summary = {
        "ordersScannedFromMax": max_existing_number,
        "repairsPlanned": len(repairs),
        "repairs": repairs,
    }

    if not args.apply:
        print(json.dumps({"mode": "dry-run", **summary}, indent=2, ensure_ascii=True))
        return

    backup_id = backup_orders(store)
    apply_repairs(store, repairs)
    print(
        json.dumps(
            {
                "mode": "applied",
                "backupId": backup_id,
                **summary,
            },
            indent=2,
            ensure_ascii=True,
        )
    )


if __name__ == "__main__":
    main()
