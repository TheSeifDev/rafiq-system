"""Supabase sync engine — bidirectional, REST-based, IPv4-friendly."""
from __future__ import annotations

import logging
import threading
import time
from typing import Any

import requests

import db
from settings import Settings, get_settings

logger = logging.getLogger("rafiq.sync")

TABLES = ("patients", "alerts", "devices", "emergency_contacts", "locations", "reminders")
PULL_TABLES = ("patients", "emergency_contacts", "reminders")
PUSH_TABLES = ("alerts", "devices", "locations", "reminders")

BASE_BACKOFF = 2.0  # seconds — exponential: 2, 4, 8, ...

_session: requests.Session | None = None
_session_key: str | None = None

_bg_started = False
_bg_lock = threading.Lock()


def _settings() -> Settings:
    return get_settings()


def enabled() -> bool:
    return _settings().sync_enabled


def _headers(prefer: str = "resolution=merge-duplicates,return=minimal") -> dict[str, str]:
    key = _settings().supabase_key
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": prefer,
    }


def get_session() -> requests.Session:
    global _session, _session_key
    settings = _settings()
    if _session is None or _session_key != settings.supabase_key:
        _session = requests.Session()
        _session.headers.update(
            {
                "apikey": settings.supabase_key,
                "Authorization": f"Bearer {settings.supabase_key}",
            }
        )
        _session_key = settings.supabase_key
    return _session


def _upsert(table: str, row: dict[str, Any]) -> bool:
    settings = _settings()
    try:
        response = get_session().post(
            f"{settings.supabase_url}/rest/v1/{table}",
            json=row,
            headers=_headers(),
            timeout=settings.supabase_timeout,
        )
        if not response.ok:
            logger.warning(
                "Push upsert %s failed: %s %s",
                table,
                response.status_code,
                response.text[:200],
            )
        return response.ok
    except requests.RequestException as exc:
        logger.warning("Push upsert %s network error: %s", table, exc)
        return False


def _delete_remote(table: str, row_id: int) -> bool:
    settings = _settings()
    try:
        response = get_session().delete(
            f"{settings.supabase_url}/rest/v1/{table}?id=eq.{row_id}",
            headers=_headers(),
            timeout=settings.supabase_timeout,
        )
        if not response.ok:
            logger.warning(
                "Push delete %s #%s failed: %s %s",
                table,
                row_id,
                response.status_code,
                response.text[:200],
            )
        return response.ok
    except requests.RequestException as exc:
        logger.warning("Push delete %s #%s network error: %s", table, row_id, exc)
        return False


def flush_queue() -> dict[str, int]:
    """Push every pending row in PUSH_TABLES up to Supabase."""
    settings = _settings()
    result = {"pushed": 0, "failed": 0, "remaining": 0, "dropped": 0}
    if not settings.sync_enabled:
        result["remaining"] = pending_count()
        return result

    with db.cursor() as cur:
        placeholders = ",".join("?" for _ in PUSH_TABLES)
        items = cur.execute(
            f"SELECT id, table_name, row_id, operation, error_count FROM _sync_queue "  # nosec B608
            f"WHERE table_name IN ({placeholders}) AND error_count < ? "
            f"ORDER BY id LIMIT ?",
            (*PUSH_TABLES, settings.sync_max_error_count, settings.sync_queue_batch_size),
        ).fetchall()

        for item in items:
            item_id = item["id"]
            table_name = item["table_name"]
            operation = item["operation"]
            ok = False

            try:
                db._assert_valid_table(table_name)
            except ValueError:
                logger.error("Queue item #%s has invalid table %r. Dropping.", item_id, table_name)
                cur.execute("DELETE FROM _sync_queue WHERE id = ?", (item_id,))
                result["dropped"] += 1
                continue

            if operation == "upsert":
                row = cur.execute(
                    f"SELECT * FROM {table_name} WHERE id = ?",  # nosec B608
                    (item["row_id"],),
                ).fetchone()
                ok = True if row is None else _upsert(table_name, dict(row))
            elif operation == "delete":
                ok = _delete_remote(table_name, item["row_id"])
            else:
                logger.error("Queue item #%s has unknown operation %r. Dropping.", item_id, operation)
                cur.execute("DELETE FROM _sync_queue WHERE id = ?", (item_id,))
                result["dropped"] += 1
                continue

            if ok:
                cur.execute("DELETE FROM _sync_queue WHERE id = ?", (item_id,))
                result["pushed"] += 1
            else:
                cur.execute("UPDATE _sync_queue SET error_count = error_count + 1 WHERE id = ?", (item_id,))
                result["failed"] += 1

        result["remaining"] = int(
            cur.execute(
            "SELECT COUNT(*) AS c FROM _sync_queue WHERE error_count < ?",
            (settings.sync_max_error_count,),
        ).fetchone()["c"]
        )

    if result["pushed"] > 0 or result["failed"] > 0 or result["dropped"] > 0:
        logger.info(
            "Flush complete: pushed=%s, failed=%s, dropped=%s, remaining=%s",
            result["pushed"],
            result["failed"],
            result["dropped"],
            result["remaining"],
        )
    return result


def pending_count() -> int:
    with db.cursor() as cur:
        return int(cur.execute("SELECT COUNT(*) AS c FROM _sync_queue").fetchone()["c"])


def pull_table(table: str) -> int:
    """Fetch all rows from Supabase for one table with pagination."""
    settings = _settings()
    if not settings.sync_enabled:
        return 0

    limit = 1000
    offset = 0
    total_synced = 0
    remote_ids: set[int] = set()
    pull_completed = True

    while True:
        try:
            response = get_session().get(
                f"{settings.supabase_url}/rest/v1/{table}?select=*&order=id.asc&limit={limit}&offset={offset}",
                headers=_headers(prefer=""),
                timeout=settings.supabase_timeout * 4,
            )
            if not response.ok:
                logger.warning("Pull %s failed: %s %s", table, response.status_code, response.text[:200])
                pull_completed = False
                break
            rows = response.json()
        except requests.RequestException as exc:
            logger.warning("Pull %s network error: %s", table, exc)
            pull_completed = False
            break

        if not rows:
            break

        for row in rows:
            row_id = row.get("id")
            if isinstance(row_id, int):
                remote_ids.add(row_id)

        batch_result = db.upsert_batch_from_sync(table, rows)
        total_synced += batch_result["synced"]

        if len(rows) < limit:
            break
        offset += limit

    if pull_completed and table in PULL_TABLES:
        deleted = db.prune_missing_from_sync(table, remote_ids)
        if deleted > 0:
            logger.info("Pull %s: pruned %s local rows missing remotely", table, deleted)

    return total_synced


def pull_fresh() -> dict[str, int]:
    return {table: pull_table(table) for table in PULL_TABLES}


def pull_all() -> dict[str, int]:
    return {table: pull_table(table) for table in TABLES}


def full_sync() -> dict[str, dict[str, int] | dict[str, int]]:
    pushed = flush_queue()
    pulled = pull_fresh() if enabled() else {}
    return {"push": pushed, "pull": pulled}


def start_background() -> None:
    """Start one daemon thread that periodically pushes then pulls."""
    global _bg_started
    settings = _settings()
    with _bg_lock:
        if _bg_started or not settings.sync_enabled:
            return
        _bg_started = True

    logger.info(
        "Background sync started: push every %ss, pull every %ss",
        settings.supabase_sync_interval,
        settings.supabase_pull_interval,
    )

    def _loop() -> None:
        last_pull = 0.0
        consecutive_failures = 0

        while True:
            if consecutive_failures > 0:
                backoff = min(BASE_BACKOFF**consecutive_failures, 300.0)
                time.sleep(backoff)
            else:
                time.sleep(settings.supabase_sync_interval)

            try:
                push_result = flush_queue()
                now = time.monotonic()
                if now - last_pull >= settings.supabase_pull_interval:
                    pull_fresh()
                    last_pull = now

                if push_result.get("failed", 0) == 0:
                    consecutive_failures = 0
                else:
                    consecutive_failures += 1
            except requests.RequestException as exc:
                consecutive_failures += 1
                logger.error("Background sync network error (attempt %d): %s", consecutive_failures, exc)
            except Exception as exc:  # defensive logging for daemon stability
                consecutive_failures += 1
                logger.error(
                    "Background sync unexpected error (attempt %d): %s",
                    consecutive_failures,
                    exc,
                    exc_info=True,
                )

    threading.Thread(target=_loop, daemon=True, name="supabase-sync").start()


def status() -> dict[str, object]:
    settings = _settings()
    return {
        "enabled": settings.sync_enabled,
        "supabase_url": settings.supabase_url or None,
        "push_interval_secs": settings.supabase_sync_interval,
        "pull_interval_secs": settings.supabase_pull_interval,
        "pull_tables": list(PULL_TABLES),
        "push_tables": list(PUSH_TABLES),
        "pending": pending_count(),
    }
