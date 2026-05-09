"""SQLite layer for the Rafiq local DB.

Pure stdlib (sqlite3) — no ORM. Each function returns dicts (via row_factory).
Phantom can `import db` directly, or the FastAPI service can wrap these calls.

Read / Write ownership per table (per PDF: خريطة العمليات النهائية لنظام رفيق)
─────────────────────────────────
┌─────────────────────┬────────────────┬─────────────────────────────────────┐
│ Table               │ Direction      │ Who writes                          │
├─────────────────────┼────────────────┼─────────────────────────────────────┤
│ patients            │ PULL only      │ App → Supabase → SQLite             │
│ emergency_contacts  │ PULL only      │ App → Supabase → SQLite             │
│ reminders           │ Bidirectional  │ App + AI (both push & pull)         │
│ alerts              │ PUSH only      │ System/AI → SQLite → Supabase       │
│ devices             │ PUSH only      │ ESP32/Wearable → SQLite → Supabase  │
│ locations           │ PUSH only      │ Smartwatch/GPS → SQLite → Supabase  │
└─────────────────────┴────────────────┴─────────────────────────────────────┘

Enqueue rules:
  _enqueue() is called for PUSH tables (alerts, devices, locations)
  and the bidirectional table (reminders).
  PULL-only tables (patients, emergency_contacts) never enqueue — the App
  is their source of truth. But they accept from_sync=True for consistency
  so that sync.py can call db functions instead of raw SQL.
"""
from __future__ import annotations

import logging
import sqlite3
import zoneinfo
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any

from settings import get_settings

_SETTINGS = get_settings()
BASE_DIR = _SETTINGS.base_dir
DB_PATH = _SETTINGS.db_path
SCHEMA_PATH = _SETTINGS.schema_path

logger = logging.getLogger("rafiq.db")

# ── Whitelist of valid table names to prevent SQL injection via f-strings ──
VALID_TABLES = frozenset({
    "patients", "alerts", "devices",
    "emergency_contacts", "locations", "reminders",
})

VALID_COLUMNS = {
    "alerts": frozenset({"id", "patient_id", "type", "message", "severity", "is_read", "created_at"}),
    "devices": frozenset({"id", "patient_id", "device_name", "type", "status", "last_seen"}),
    "locations": frozenset({"id", "patient_id", "latitude", "longitude", "recorded_at"}),
}

def _assert_valid_table(table: str) -> None:
    """Raise ValueError if table name is not in the whitelist."""
    if table not in VALID_TABLES:
        raise ValueError(f"Invalid table name: {table!r}")


def set_db_path(path: str | Path) -> None:
    global DB_PATH
    DB_PATH = Path(path)


def set_schema_path(path: str | Path) -> None:
    global SCHEMA_PATH
    SCHEMA_PATH = Path(path)


def reset_paths_from_settings() -> None:
    global DB_PATH, SCHEMA_PATH
    settings = get_settings()
    DB_PATH = settings.db_path
    SCHEMA_PATH = settings.schema_path


# ───────────────────────── connection ─────────────────────────
def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")  # Enable WAL mode for high concurrency
    conn.execute("PRAGMA synchronous = NORMAL")
    return conn

@contextmanager
def cursor() -> Iterator[sqlite3.Cursor]:
    conn = _connect()
    try:
        yield conn.cursor()
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db() -> None:
    """Create tables + indexes if they don't exist."""
    with cursor() as cur:
        with open(SCHEMA_PATH, encoding="utf-8") as f:
            cur.executescript(f.read())
        # Start IDs at 1,000,000 to avoid ID collision with Supabase (which starts at 1)
        for table in VALID_TABLES:
            cur.execute("INSERT OR IGNORE INTO sqlite_sequence (name, seq) VALUES (?, 1000000)", (table,))
    logger.info(f"Database initialized at {DB_PATH}")

def _row(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row else None

def _rows(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [dict(r) for r in rows]

def _now() -> str:
    tz = zoneinfo.ZoneInfo("Africa/Cairo")
    return datetime.now(tz).isoformat(timespec="seconds")


def _require_lastrowid(cur: sqlite3.Cursor) -> int:
    value = cur.lastrowid
    if value is None:
        raise RuntimeError("SQLite did not return lastrowid for insert operation")
    return int(value)


def _enqueue(cur: sqlite3.Cursor, table_name: str, row_id: int, op: str = "upsert") -> None:
    """Add operation to sync queue. For upserts, removes any previous pending upsert for the same row (Deduplication)."""
    if op == "upsert":
        cur.execute("DELETE FROM _sync_queue WHERE table_name = ? AND row_id = ? AND operation = 'upsert'", (table_name, row_id))

    cur.execute(
        "INSERT INTO _sync_queue (table_name, row_id, operation) VALUES (?, ?, ?)",
        (table_name, row_id, op)
    )


# ───────────────────────── 1. patients (PULL only) ─────────────────────────
# Source of truth = App → Supabase. Mini-PC only reads.
# NO _enqueue calls here — we never push patients back to Supabase.
# from_sync=True is accepted for consistency when sync.py calls these
# functions during a Supabase → SQLite pull.

def list_patients(skip: int = 0, limit: int = 100) -> list[dict[str, Any]]:
    with cursor() as cur:
        return _rows(cur.execute("SELECT * FROM patients ORDER BY id LIMIT ? OFFSET ?", (limit, skip)).fetchall())

def get_patient(patient_id: int) -> dict[str, Any] | None:
    with cursor() as cur:
        return _row(cur.execute("SELECT * FROM patients WHERE id = ?", (patient_id,)).fetchone())

def create_patient(data: dict[str, Any], from_sync: bool = False) -> int:
    """Create patient locally. Not enqueued — App owns this table.
    from_sync=True when called during a Supabase pull."""
    with cursor() as cur:
        cur.execute(
            "INSERT INTO patients (name, age, gender, blood_type, medical_history) "
            "VALUES (?, ?, ?, ?, ?)",
            (data["name"], data.get("age"), data.get("gender"),
             data.get("blood_type"), data.get("medical_history")),
        )
        pid = _require_lastrowid(cur)  # no _enqueue — PULL table
        if from_sync:
            logger.debug("Patient #%s pulled from Supabase", pid)
        return pid

def update_patient(patient_id: int, data: dict[str, Any], from_sync: bool = False) -> bool:
    """Update patient locally. Not enqueued — App owns this table.
    from_sync=True when called during a Supabase pull."""
    fields = [k for k in ("name","age","gender","blood_type","medical_history") if k in data]
    if not fields:
        return False
    set_clause = ", ".join(f"{f} = ?" for f in fields)
    values = [data[f] for f in fields] + [_now(), patient_id]
    with cursor() as cur:
        cur.execute(
            f"UPDATE patients SET {set_clause}, updated_at = ? WHERE id = ?", values)  # nosec B608
        if cur.rowcount > 0:
            if from_sync:
                logger.debug("Patient #%s updated from Supabase", patient_id)
            return True
        return False  # no _enqueue — PULL table

def delete_patient(patient_id: int, from_sync: bool = False) -> bool:
    """Delete patient locally. Not enqueued — App owns this table.
    from_sync=True when called during a Supabase pull."""
    with cursor() as cur:
        cur.execute("DELETE FROM patients WHERE id = ?", (patient_id,))
        if cur.rowcount > 0:
            if from_sync:
                logger.debug("Patient #%s deleted from Supabase pull", patient_id)
            return True
        return False  # no _enqueue — PULL table


# ───────────────────────── 2. alerts (PUSH only) ─────────────────────────
# Source of truth = System/AI → SQLite → Supabase. App only reads.

def list_alerts(patient_id: int | None = None, limit: int = 50) -> list[dict[str, Any]]:
    sql = "SELECT * FROM alerts"
    params: tuple[Any, ...] = ()
    if patient_id is not None:
        sql += " WHERE patient_id = ?"
        params = (patient_id,)
    sql += " ORDER BY created_at DESC LIMIT ?"
    params += (limit,)
    with cursor() as cur:
        return _rows(cur.execute(sql, params).fetchall())

def create_alert(data: dict[str, Any]) -> int:
    with cursor() as cur:
        cur.execute(
            "INSERT INTO alerts (patient_id, type, message, severity) VALUES (?, ?, ?, ?)",
            (data["patient_id"], data["type"], data["message"], data["severity"]),
        )
        aid = _require_lastrowid(cur)
        _enqueue(cur, "alerts", aid)  # PUSH — App يقرأ من Supabase
        logger.info("Alert #%s created for patient #%s (type=%s, severity=%s)",
                     aid, data["patient_id"], data["type"], data["severity"])
        return aid

def mark_alert_read(alert_id: int) -> bool:
    with cursor() as cur:
        cur.execute("UPDATE alerts SET is_read = 1 WHERE id = ?", (alert_id,))
        if cur.rowcount > 0:
            _enqueue(cur, "alerts", alert_id)  # PUSH
            logger.debug("Alert #%s marked as read", alert_id)
            return True
        return False

def unread_alerts(patient_id: int) -> list[dict[str, Any]]:
    with cursor() as cur:
        return _rows(cur.execute(
            "SELECT * FROM alerts WHERE patient_id = ? AND is_read = 0 "
            "ORDER BY created_at DESC", (patient_id,)).fetchall())

def critical_alerts() -> list[dict[str, Any]]:
    with cursor() as cur:
        return _rows(cur.execute(
            "SELECT * FROM alerts WHERE severity = 'critical' AND is_read = 0 "
            "ORDER BY created_at DESC").fetchall())


# ───────────────────────── 3. devices (PUSH only) ─────────────────────────
# Source of truth = ESP32/Wearable → SQLite → Supabase. App only reads.

def list_devices(patient_id: int | None = None, skip: int = 0, limit: int = 100) -> list[dict[str, Any]]:
    sql = "SELECT * FROM devices"
    params: tuple[Any, ...] = ()
    if patient_id is not None:
        sql += " WHERE patient_id = ?"
        params = (patient_id,)
    sql += " LIMIT ? OFFSET ?"
    params += (limit, skip)
    with cursor() as cur:
        return _rows(cur.execute(sql, params).fetchall())

def register_device(data: dict[str, Any]) -> int:
    with cursor() as cur:
        cur.execute(
            "INSERT INTO devices (patient_id, device_name, type, status, last_seen) "
            "VALUES (?, ?, ?, ?, ?)",
            (data["patient_id"], data["device_name"], data["type"],
             data.get("status", "offline"), _now()),
        )
        did = _require_lastrowid(cur)
        _enqueue(cur, "devices", did)  # PUSH — App يقرأ من Supabase
        logger.info("Device #%s registered: %s (%s)", did, data["device_name"], data["type"])
        return did

def device_heartbeat(device_id: int, status: str = "online") -> bool:
    """Called by ESP32/wearable to mark the device alive."""
    with cursor() as cur:
        cur.execute("UPDATE devices SET status = ?, last_seen = ? WHERE id = ?",
                    (status, _now(), device_id))
        if cur.rowcount > 0:
            _enqueue(cur, "devices", device_id)  # PUSH
            logger.debug("Device #%s heartbeat: %s", device_id, status)
            return True
        return False

def system_check() -> list[dict[str, Any]]:
    """All devices with status flag — used by Phantom to verify sensors are live."""
    with cursor() as cur:
        return _rows(cur.execute(
            "SELECT id, patient_id, device_name, type, status, last_seen "
            "FROM devices ORDER BY status DESC, last_seen DESC").fetchall())


# ─────────────────── 4. emergency_contacts (PULL only) ───────────────────
# Source of truth = App → Supabase. Mini-PC only reads.
# NO _enqueue calls here — App owns this table.
# from_sync=True is accepted for consistency when sync.py pulls from Supabase.

def list_contacts(patient_id: int, skip: int = 0, limit: int = 100) -> list[dict[str, Any]]:
    with cursor() as cur:
        return _rows(cur.execute(
            "SELECT * FROM emergency_contacts WHERE patient_id = ? "
            "ORDER BY priority ASC LIMIT ? OFFSET ?", (patient_id, limit, skip)).fetchall())

def add_contact(data: dict[str, Any], from_sync: bool = False) -> int:
    """Add contact locally. Not enqueued — App owns this table.
    from_sync=True when called during a Supabase pull."""
    with cursor() as cur:
        cur.execute(
            "INSERT INTO emergency_contacts "
            "(patient_id, name, relationship, phone_number, priority) "
            "VALUES (?, ?, ?, ?, ?)",
            (data["patient_id"], data["name"], data.get("relationship"),
             data["phone_number"], data.get("priority", 1)),
        )
        cid = _require_lastrowid(cur)  # no _enqueue — PULL table
        if from_sync:
            logger.debug("Contact #%s pulled from Supabase", cid)
        return cid

def delete_contact(contact_id: int, from_sync: bool = False) -> bool:
    """Delete contact locally. Not enqueued — App owns this table.
    from_sync=True when called during a Supabase pull."""
    with cursor() as cur:
        cur.execute("DELETE FROM emergency_contacts WHERE id = ?", (contact_id,))
        if cur.rowcount > 0:
            if from_sync:
                logger.debug("Contact #%s deleted from Supabase pull", contact_id)
            return True
        return False  # no _enqueue — PULL table


# ───────────────────────── 5. locations (PUSH only) ─────────────────────────
# Source of truth = Smartwatch/GPS → SQLite → Supabase. App + AI read.

def record_location(patient_id: int, latitude: float, longitude: float) -> int:
    with cursor() as cur:
        cur.execute(
            "INSERT INTO locations (patient_id, latitude, longitude) VALUES (?, ?, ?)",
            (patient_id, latitude, longitude))
        lid = _require_lastrowid(cur)
        _enqueue(cur, "locations", lid)  # PUSH — App يقرأ من Supabase
        logger.debug("Location #%s recorded for patient #%s", lid, patient_id)
        return lid

def latest_location(patient_id: int) -> dict[str, Any] | None:
    with cursor() as cur:
        return _row(cur.execute(
            "SELECT * FROM locations WHERE patient_id = ? "
            "ORDER BY recorded_at DESC LIMIT 1", (patient_id,)).fetchone())

def location_history(patient_id: int, limit: int = 50) -> list[dict[str, Any]]:
    with cursor() as cur:
        return _rows(cur.execute(
            "SELECT * FROM locations WHERE patient_id = ? "
            "ORDER BY recorded_at DESC LIMIT ?", (patient_id, limit)).fetchall())


# ───────────────────────── 6. reminders (Bidirectional) ─────────────────────────
# Both App and AI write.
# AI writes → enqueued → pushed to Supabase.
# App writes → pulled from Supabase by sync.py → from_sync=True skips re-enqueue.

def list_reminders(patient_id: int, active_only: bool = False) -> list[dict[str, Any]]:
    sql = "SELECT * FROM reminders WHERE patient_id = ?"
    params: tuple[Any, ...] = (patient_id,)
    if active_only:
        sql += " AND is_active = 1"
    sql += " ORDER BY datetime(time) ASC"
    with cursor() as cur:
        return _rows(cur.execute(sql, params).fetchall())

def add_reminder(data: dict[str, Any], from_sync: bool = False) -> int:
    """Add reminder. from_sync=True when called during a Supabase pull — skips enqueue."""
    with cursor() as cur:
        cur.execute(
            "INSERT INTO reminders (patient_id, title, description, time, is_active) "
            "VALUES (?, ?, ?, ?, ?)",
            (data["patient_id"], data["title"], data.get("description"),
             data["time"], int(data.get("is_active", 1))),
        )
        rid = _require_lastrowid(cur)
        if not from_sync:
            _enqueue(cur, "reminders", rid)  # PUSH — AI كتب، نرفعه لـ Supabase
        logger.debug("Reminder #%s added (from_sync=%s)", rid, from_sync)
        return rid

def toggle_reminder(reminder_id: int, active: bool, from_sync: bool = False) -> bool:
    """Toggle reminder active state. from_sync=True skips enqueue."""
    with cursor() as cur:
        cur.execute("UPDATE reminders SET is_active = ? WHERE id = ?",
                    (int(active), reminder_id))
        if cur.rowcount > 0:
            if not from_sync:
                _enqueue(cur, "reminders", reminder_id)  # PUSH
            logger.debug("Reminder #%s toggled to %s (from_sync=%s)",
                         reminder_id, active, from_sync)
            return True
        return False

def delete_reminder(reminder_id: int, from_sync: bool = False) -> bool:
    """Delete reminder. from_sync=True skips enqueue."""
    with cursor() as cur:
        cur.execute("DELETE FROM reminders WHERE id = ?", (reminder_id,))
        if cur.rowcount > 0:
            if not from_sync:
                _enqueue(cur, "reminders", reminder_id, op="delete")  # PUSH
            logger.debug("Reminder #%s deleted (from_sync=%s)", reminder_id, from_sync)
            return True
        return False


# ───────────────────────── sync helpers (used by sync.py) ─────────────────────────
def prune_missing_from_sync(table: str, remote_ids: set[int]) -> int:
    """Delete local rows missing from remote for pull-capable tables.

    For bidirectional reminders, rows with pending local queue items are preserved.
    """
    _assert_valid_table(table)
    if table not in {"patients", "emergency_contacts", "reminders"}:
        return 0

    select_sql_by_table = {
        "patients": "SELECT id FROM patients",
        "emergency_contacts": "SELECT id FROM emergency_contacts",
        "reminders": "SELECT id FROM reminders",
    }
    delete_sql_by_table = {
        "patients": "DELETE FROM patients WHERE id = ?",
        "emergency_contacts": "DELETE FROM emergency_contacts WHERE id = ?",
        "reminders": "DELETE FROM reminders WHERE id = ?",
    }
    select_sql = select_sql_by_table[table]
    delete_sql = delete_sql_by_table[table]

    deleted = 0
    with cursor() as cur:
        local_rows = cur.execute(select_sql).fetchall()
        for row in local_rows:
            local_id = int(row["id"])
            if local_id in remote_ids:
                continue
            if table == "reminders":
                pending = cur.execute(
                    "SELECT 1 FROM _sync_queue WHERE table_name = 'reminders' AND row_id = ? LIMIT 1",
                    (local_id,),
                ).fetchone()
                if pending:
                    continue
            cur.execute(delete_sql, (local_id,))
            if cur.rowcount > 0:
                deleted += 1
    return deleted


def upsert_batch_from_sync(table: str, rows: list[dict[str, Any]]) -> dict[str, int]:
    """Insert or update a batch of rows pulled from Supabase, using a SINGLE
    connection/cursor for the entire batch.  Uses from_sync=True semantics
    so that PULL-only tables are never re-enqueued.

    Returns {"synced": int, "failed": int, "cleaned_queue": int}.
    """
    _assert_valid_table(table)

    result = {"synced": 0, "failed": 0, "cleaned_queue": 0}
    if not rows:
        return result

    with cursor() as cur:
        for row in rows:
            try:
                if "id" in row:
                    pending = cur.execute(
                        "SELECT id FROM _sync_queue WHERE table_name = ? AND row_id = ?",
                        (table, row["id"])
                    ).fetchone()
                    if pending:
                        # Skip overwriting local row if it has pending changes
                        continue

                _upsert_single(cur, table, row)
                result["synced"] += 1

            except Exception as e:
                logger.error("Failed to upsert %s row %s: %s", table, row.get("id"), e)
                result["failed"] += 1

    return result


def _upsert_single(cur: sqlite3.Cursor, table: str, row: dict[str, Any]) -> None:
    """Upsert one row from Supabase into local SQLite.

    - PULL tables (patients, emergency_contacts): always upsert, never enqueue.
    - Bidirectional (reminders): upsert with from_sync semantics, never enqueue.
    - PUSH tables (alerts, devices, locations): INSERT OR IGNORE only —
      never overwrite local data that hasn't been pushed yet.
    """
    if table == "patients":
        existing = cur.execute(
            "SELECT id FROM patients WHERE id = ?", (row["id"],)
        ).fetchone()
        if existing:
            fields = [k for k in ("name", "age", "gender", "blood_type", "medical_history")
                       if k in row]
            if fields:
                set_clause = ", ".join(f"{f} = ?" for f in fields)
                values = [row[f] for f in fields] + [_now(), row["id"]]
                cur.execute(
                    f"UPDATE patients SET {set_clause}, updated_at = ? WHERE id = ?",  # nosec B608
                    values)
                logger.debug("Patient #%s updated from Supabase", row["id"])
        else:
            cur.execute(
                "INSERT INTO patients (id, name, age, gender, blood_type, medical_history) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (row["id"], row["name"], row.get("age"), row.get("gender"),
                 row.get("blood_type"), row.get("medical_history")))
            logger.debug("Patient #%s inserted from Supabase", row["id"])

    elif table == "emergency_contacts":
        # Match by id since this is a PULL only table
        match = cur.execute(
            "SELECT id FROM emergency_contacts WHERE id = ?",
            (row["id"],)
        ).fetchone()
        if match:
            cur.execute(
                "UPDATE emergency_contacts SET name = ?, relationship = ?, phone_number = ?, priority = ? "
                "WHERE id = ?",
                (row["name"], row.get("relationship"), row["phone_number"], row.get("priority", 1), row["id"]))
            logger.debug("Contact #%s updated from Supabase", row["id"])
        else:
            cur.execute(
                "INSERT INTO emergency_contacts "
                "(id, patient_id, name, relationship, phone_number, priority) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (row["id"], row["patient_id"], row["name"], row.get("relationship"),
                 row["phone_number"], row.get("priority", 1)))
            logger.debug("Contact inserted from Supabase for patient #%s", row["patient_id"])

    elif table == "reminders":
        # Bidirectional — upsert BUT NEVER enqueue (this IS a sync pull)
        existing = cur.execute(
            "SELECT id FROM reminders WHERE id = ?", (row["id"],)
        ).fetchone()
        if existing:
            cur.execute(
                "UPDATE reminders SET title = ?, description = ?, "
                "time = ?, is_active = ? WHERE id = ?",
                (row["title"], row.get("description"),
                 row["time"], int(row.get("is_active", 1)), row["id"]))
            # ╔══════════════════════════════════════════════════════════════╗
            # ║  FIX: V2 had _enqueue here when _from_sync_pull was unset  ║
            # ║  causing an infinite push-pull loop. Removed completely.    ║
            # ╚══════════════════════════════════════════════════════════════╝
            logger.debug("Reminder #%s updated from Supabase (no enqueue)", row["id"])
        else:
            cur.execute(
                "INSERT INTO reminders (id, patient_id, title, description, time, is_active) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (row["id"], row["patient_id"], row["title"], row.get("description"),
                 row["time"], int(row.get("is_active", 1))))
            # No _enqueue — this data came FROM Supabase
            logger.debug("Reminder #%s inserted from Supabase (no enqueue)", row["id"])

    elif table in ("alerts", "devices", "locations"):
        # PUSH tables — INSERT OR IGNORE: don't overwrite local un-pushed data
        allowed = VALID_COLUMNS[table]
        cols = [c for c in row if c in allowed]
        if not cols:
            return
        placeholders = ",".join("?" for _ in cols)
        col_list = ",".join(cols)
        cur.execute(
            f"INSERT OR IGNORE INTO {table} ({col_list}) VALUES ({placeholders})",
            [row[c] for c in cols])
        if cur.rowcount > 0:
            logger.debug("%s #%s inserted from Supabase", table, row.get("id"))
    else:
        raise ValueError(f"Unknown table in _upsert_single: {table!r}")
