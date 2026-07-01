import os
import json
import time
import sqlite3
import logging
from pathlib import Path
from src.config import settings

log = logging.getLogger("rafiq.cache")

CACHE_DB_PATH = settings.BASE_DIR / "data/.rafiq_cache" / "cache_store.db"

# In-memory metrics registry
CACHE_METRICS = {
    "hits": 0,
    "misses": 0
}

class CacheManager:
    _conn = None

    @classmethod
    def _get_conn(cls):
        if cls._conn is None:
            # Ensure parent dir exists
            CACHE_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
            cls._conn = sqlite3.connect(str(CACHE_DB_PATH), check_same_thread=False)
            cls._conn.execute("""
                CREATE TABLE IF NOT EXISTS cache_store (
                    cache_key TEXT PRIMARY KEY,
                    cache_val TEXT NOT NULL,
                    expires_at REAL NOT NULL
                )
            """)
            cls._conn.execute("PRAGMA journal_mode=WAL")
            cls._conn.commit()
        return cls._conn

    @classmethod
    def get(cls, key: str) -> any:
        if not settings.ENABLE_CACHING:
            return None
            
        try:
            conn = cls._get_conn()
            now = time.time()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT cache_val, expires_at FROM cache_store WHERE cache_key = ?",
                (key,)
            )
            row = cursor.fetchone()
            category = key.split(":")[0] if ":" in key else "unknown"
            from src.utils.observability import log_cache_event
            if row:
                val_json, expires_at = row
                if now < expires_at:
                    CACHE_METRICS["hits"] += 1
                    log_cache_event(category, "hit", key)
                    try:
                        return json.loads(val_json)
                    except json.JSONDecodeError:
                        return val_json
                else:
                    # Expired, clean up
                    cursor.execute("DELETE FROM cache_store WHERE cache_key = ?", (key,))
                    conn.commit()
            CACHE_METRICS["misses"] += 1
            log_cache_event(category, "miss", key)
        except Exception as e:
            log.warning(f"Cache get failed for key '{key}': {e}")
            from src.utils.observability import log_exception
            log_exception(e, context=f"cache_get:{key}")
            
        return None

    @classmethod
    def set(cls, key: str, value: any, ttl_seconds: int):
        if not settings.ENABLE_CACHING:
            return
            
        try:
            conn = cls._get_conn()
            expires_at = time.time() + ttl_seconds
            val_json = json.dumps(value, ensure_ascii=False)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO cache_store (cache_key, cache_val, expires_at) VALUES (?, ?, ?)",
                (key, val_json, expires_at)
            )
            conn.commit()
        except Exception as e:
            log.warning(f"Cache set failed for key '{key}': {e}")

    @classmethod
    def get_metrics(cls) -> dict:
        hits = CACHE_METRICS["hits"]
        misses = CACHE_METRICS["misses"]
        total = hits + misses
        return {
            "hits": hits,
            "misses": misses,
            "hit_rate": hits / total if total > 0 else 0.0
        }

    @classmethod
    def reset_metrics(cls):
        CACHE_METRICS["hits"] = 0
        CACHE_METRICS["misses"] = 0

    @classmethod
    def clear_expired(cls):
        try:
            conn = cls._get_conn()
            now = time.time()
            conn.execute("DELETE FROM cache_store WHERE expires_at < ?", (now,))
            conn.commit()
        except Exception as e:
            log.warning(f"Failed to clear expired cache items: {e}")
