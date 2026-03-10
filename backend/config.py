from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


@dataclass(frozen=True)
class AppConfig:
    project_root: Path
    local_store_path: Path
    firebase_credentials_path: Path | None
    firestore_collection: str
    firestore_document: str
    allowed_origins: list[str]


@lru_cache(maxsize=1)
def get_config() -> AppConfig:
    project_root = Path(__file__).resolve().parent.parent
    default_credentials = project_root / "flower-757d9-firebase-adminsdk-fbsvc-d05a09dcce.json"
    credentials_override = os.getenv("SHOPSYSTEM_FIREBASE_CREDENTIALS")
    credentials_path = Path(credentials_override).expanduser().resolve() if credentials_override else default_credentials

    allowed_origins = [
        origin.strip()
        for origin in os.getenv(
            "SHOPSYSTEM_ALLOWED_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if origin.strip()
    ]

    return AppConfig(
        project_root=project_root,
        local_store_path=project_root / "backend" / "data" / "store.json",
        firebase_credentials_path=credentials_path if credentials_path.exists() else None,
        firestore_collection=os.getenv("SHOPSYSTEM_FIRESTORE_COLLECTION", "shopsystem"),
        firestore_document=os.getenv("SHOPSYSTEM_FIRESTORE_DOCUMENT", "default"),
        allowed_origins=allowed_origins,
    )

