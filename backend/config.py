from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


@dataclass(frozen=True)
class AppConfig:
    project_root: Path
    local_store_path: Path
    maintenance_report_dir: Path
    backup_dir: Path
    firebase_credentials_path: Path | None
    allowed_origins: list[str]
    smtp_host: str | None
    smtp_port: int
    smtp_username: str | None
    smtp_password: str | None
    smtp_sender: str | None
    smtp_use_tls: bool


def _env_flag(name: str, default: bool) -> bool:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    return raw_value.strip().lower() in {"1", "true", "yes", "on"}


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
        maintenance_report_dir=project_root / "output" / "pdf",
        backup_dir=project_root / "output" / "backups",
        firebase_credentials_path=credentials_path if credentials_path.exists() else None,
        allowed_origins=allowed_origins,
        smtp_host=os.getenv("SHOPSYSTEM_SMTP_HOST"),
        smtp_port=int(os.getenv("SHOPSYSTEM_SMTP_PORT", "587")),
        smtp_username=os.getenv("SHOPSYSTEM_SMTP_USERNAME"),
        smtp_password=os.getenv("SHOPSYSTEM_SMTP_PASSWORD"),
        smtp_sender=os.getenv("SHOPSYSTEM_SMTP_SENDER"),
        smtp_use_tls=_env_flag("SHOPSYSTEM_SMTP_USE_TLS", True),
    )
