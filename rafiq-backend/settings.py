from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(ENV_PATH, override=False)


def _parse_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _parse_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError as exc:
        raise RuntimeError(f"Invalid float value for {name}: {raw!r}") from exc


def _parse_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise RuntimeError(f"Invalid integer value for {name}: {raw!r}") from exc


def _parse_path(name: str, default_relative: str) -> Path:
    raw = os.getenv(name, default_relative).strip()
    candidate = Path(raw)
    if not candidate.is_absolute():
        candidate = BASE_DIR / candidate
    return candidate


def _parse_cors_origins() -> tuple[str, ...]:
    raw = os.getenv("CORS_ORIGINS", "*")
    values = tuple(origin.strip() for origin in raw.split(",") if origin.strip())
    return values or ("*",)


@dataclass(frozen=True)
class Settings:
    base_dir: Path
    db_path: Path
    schema_path: Path
    api_key: str | None
    allow_insecure_dev_api_key: bool
    insecure_dev_api_key: str
    cors_origins: tuple[str, ...]
    supabase_url: str
    supabase_key: str
    supabase_sync_interval: float
    supabase_pull_interval: float
    supabase_timeout: float
    sync_queue_batch_size: int
    sync_max_error_count: int

    @property
    def resolved_api_key(self) -> str:
        if self.api_key:
            return self.api_key
        if self.allow_insecure_dev_api_key:
            return self.insecure_dev_api_key
        raise RuntimeError(
            "API_KEY is required. Set API_KEY in the environment or .env. "
            "For local development only, set ALLOW_INSECURE_DEV_API_KEY=1."
        )

    @property
    def sync_enabled(self) -> bool:
        return bool(self.supabase_url and self.supabase_key)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        base_dir=BASE_DIR,
        db_path=_parse_path("RAFIQ_DB_PATH", "rafiq.db"),
        schema_path=_parse_path("RAFIQ_SCHEMA_PATH", "schema.sql"),
        api_key=os.getenv("API_KEY"),
        allow_insecure_dev_api_key=_parse_bool("ALLOW_INSECURE_DEV_API_KEY", False),
        insecure_dev_api_key=os.getenv("INSECURE_DEV_API_KEY", "dev-insecure-api-key"),
        cors_origins=_parse_cors_origins(),
        supabase_url=os.getenv("SUPABASE_URL", "").rstrip("/"),
        supabase_key=os.getenv("SUPABASE_KEY", ""),
        supabase_sync_interval=_parse_float("SUPABASE_SYNC_INTERVAL", 30.0),
        supabase_pull_interval=_parse_float("SUPABASE_PULL_INTERVAL", 60.0),
        supabase_timeout=_parse_float("SUPABASE_TIMEOUT", 5.0),
        sync_queue_batch_size=_parse_int("SYNC_QUEUE_BATCH_SIZE", 100),
        sync_max_error_count=_parse_int("SYNC_MAX_ERROR_COUNT", 5),
    )


def clear_settings_cache() -> None:
    get_settings.cache_clear()
