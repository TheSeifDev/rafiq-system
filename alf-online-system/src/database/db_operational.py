import os
import sys
import re
import logging
import asyncio
import datetime
import json
import math
import contextlib
import sqlite3
from pathlib import Path
from typing import Any

from src.config.settings import CHROMA_PATH, LEGACY_SQLITE_PATH, DB_PATH, LOW_STOCK_THRESHOLD
from src.utils.helpers import stable_embedding, log, tokenize
from src.core import privacy

try:
    import chromadb
except ImportError:
    chromadb = None


class _ChromaCompatCursor:
    def __init__(self, lastrowid: int | None = None, results: list = None):
        self.lastrowid = lastrowid
        self._results = results or []
        self._index = 0

    def fetchall(self):
        return self._results

    def fetchone(self):
        if self._index < len(self._results):
            row = self._results[self._index]
            self._index += 1
            return row
        return None


class _ChromaCompatConnection:
    """Compatibility shim for old code/tests that expects raw SQL execution."""
    def __init__(self, db: "RafiqDB"):
        self.db = db

    async def execute(self, sql: str, params: tuple = ()) -> _ChromaCompatCursor:
        cursor = self.db.sqlite_conn.cursor()
        cursor.execute(sql, params)
        results = []
        if cursor.description:
            columns = [col[0] for col in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
        self.db.sqlite_conn.commit()
        return _ChromaCompatCursor(cursor.lastrowid, results)

    async def commit(self):
        self.db.sqlite_conn.commit()

    async def close(self):
        pass

class RafiqSQLite:
    def __init__(self, db: "RafiqDB"):
        self.db = db
    def __getattr__(self, name):
        return getattr(self.db, name)

    async def get_all_facts_text(self) -> str:
        def _run():
            cursor = self.db.sqlite_conn.cursor()
            cursor.execute("SELECT category, fact_key, fact_val FROM memory_facts ORDER BY category, fact_key")
            rows = cursor.fetchall()
            if not rows:
                return "لا توجد معلومات محفوظة بعد."
            return "\n".join(f"[{r['category']}] {r['fact_key']}: {r['fact_val']}" for r in rows)
        return await self.db._execute_in_thread(_run)

    async def get_latest_mood_summary(self) -> str | None:
        def _run():
            cursor = self.db.sqlite_conn.cursor()
            cursor.execute("SELECT fact_val FROM memory_facts WHERE category = 'mood' ORDER BY updated DESC LIMIT 1")
            row = cursor.fetchone()
            return row[0] if row else None
        return await self.db._execute_in_thread(_run)

    async def get_patient_name(self) -> str | None:
        def _run():
            cursor = self.db.sqlite_conn.cursor()
            cursor.execute("SELECT fact_val FROM memory_facts WHERE fact_key IN ('اسم المريض', 'patient_name') LIMIT 1")
            row = cursor.fetchone()
            return row[0] if row else None
        return await self.db._execute_in_thread(_run)

class AuditLogger:
    def __init__(self, db: "RafiqDB"):
        self.db = db
    def __getattr__(self, name):
        return getattr(self.db, name)

    async def log_audit(self, action: str, detail: str = "", actor: str = "system"):
        """Record an audit log entry for critical operations."""
        def _run():
            now = self.db._now_iso()
            self.db._insert_record("audit_logs", {
                "action": action,
                "actor": actor,
                "detail": detail,
                "ts": now,
            })
        await self.db._execute_in_thread(_run)

    async def log_emergency(self, trigger_text: str, response_text: str, detection_method: str = "regex", patient_name: str = ""):
        """Record an emergency event for audit trail."""
        def _run():
            now = self.db._now_iso()
            self.db._insert_record("emergency_events", {
                "trigger_text": trigger_text,
                "response_text": response_text,
                "detection_method": detection_method,
                "patient_name": patient_name or "",
                "ts": now,
            })
        await self.db._execute_in_thread(_run)

class VectorStorage:
    def __init__(self, db: "RafiqDB"):
        self.db = db
    def __getattr__(self, name):
        return getattr(self.db, name)

    async def sync_vector_index(self):
        def _run():
            if not self.db.vector_enabled or not self.db.vector_collection:
                return
            try:
                self.db.vector_collection.delete(where={"table": "memory_facts"})
            except Exception:
                pass
            for row in self.db._list_records("memory_facts"):
                self._vector_upsert_fact(row)
        await self.db._execute_in_thread(_run)

    def _vector_upsert_fact(self, row: dict[str, Any]):
        if not self.db.vector_enabled or not self.db.vector_collection:
            return
        doc = self.db._record_document("memory_facts", row)
        try:
            self.db.vector_collection.upsert(
                ids=[f"fact:{int(row['id'])}"],
                documents=[doc],
                metadatas=[
                    {
                        "table": "memory_facts",
                        "category": str(row.get("category", "general")),
                        "key": str(row.get("fact_key", "")),
                    }
                ],
                embeddings=[stable_embedding(doc)],
            )
        except Exception as e:
            log.error(f"Chroma memory upsert: {e}")

    def _vector_delete_fact(self, row_id: int):
        if not self.db.vector_enabled or not self.db.vector_collection:
            return
        with contextlib.suppress(Exception):
            self.db.vector_collection.delete(ids=[f"fact:{int(row_id)}"])

    async def get_relevant_facts_text(self, query: str, limit: int = 8) -> str:
        def _run():
            if self.db.vector_enabled and self.db.vector_collection:
                try:
                    result = self.db.vector_collection.query(
                        query_embeddings=[stable_embedding(query)],
                        n_results=limit,
                        include=["documents"],
                    )
                    docs = [d for d in (result.get("documents") or [[]])[0] if d]
                    if docs:
                        return "\n".join(docs)
                except Exception as e:
                    log.error(f"Chroma memory query: {e}")

            rows = self.db._list_records("memory_facts")
            if not rows:
                return "لا توجد معلومات محفوظة بعد."
            q_tokens = set(tokenize(query))
            scored: list[tuple[int, str]] = []
            for r in rows:
                text = f"[{r['category']}] {r['fact_key']}: {r['fact_val']}"
                score = len(q_tokens & set(tokenize(text)))
                if r.get("category") == "mood":
                    score += 1
                scored.append((score, text))
            scored.sort(key=lambda item: item[0], reverse=True)
            selected = [text for score, text in scored[:limit] if score > 0]
            return "\n".join(selected or [text for _, text in scored[: min(limit, len(scored))]])
        return await self.db._execute_in_thread(_run)


class RafiqDB:
    MEMORY_COLLECTION = "rafiq_memory_facts_v5"
    ASSISTANT_STATE_VERSION = 1

    def __init__(self, path: Path | str = DB_PATH):
        self.path = Path(path)
        self.chroma_client = None
        self.vector_collection = None
        self.vector_enabled = False
        self.sqlite_conn = None
        self.conn = _ChromaCompatConnection(self)
        self.sqlite = RafiqSQLite(self)
        self.audit = AuditLogger(self)
        self.vector = VectorStorage(self)

    def __getattr__(self, name):
        if "sqlite" in self.__dict__ and hasattr(self.sqlite, name):
            return getattr(self.sqlite, name)
        raise AttributeError(f"'RafiqDB' object has no attribute '{name}'")

    @classmethod
    async def create(cls, path: Path | str = DB_PATH) -> "RafiqDB":
        if not chromadb:
            raise RuntimeError("chromadb is required for vector memory storage.")
        self = cls(path)
        self._init_sqlite()
        self._init_chroma()
        self._maybe_migrate_legacy_sqlite()
        await self.sync_vector_index()
        return self

    async def close(self):
        """Cleanly close database connections and release file locks."""
        if hasattr(self, "chroma_client") and self.chroma_client:
            try:
                self.chroma_client._system.stop()
            except Exception:
                pass
        if self.sqlite_conn:
            try:
                self.sqlite_conn.close()
            except Exception as e:
                log.warning(f"Error closing SQLite connection: {e}")
            self.sqlite_conn = None
        self.chroma_client = None
        self.vector_collection = None

    async def _execute_in_thread(self, func, *args, **kwargs):
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, lambda: func(*args, **kwargs))


    # Allowlist of valid table names to prevent SQL injection via f-string table names
    _VALID_TABLES = frozenset({
        "chat_history", "memory_facts", "medications", "reminders",
        "dose_events", "health_streaks", "app_events", "audit_logs", "emergency_events",
        "assistant_settings"
    })

    _VALID_COLUMNS = frozenset({
        "id", "role", "content", "ts", "created_at", "updated", "updated_at",
        "category", "fact_key", "fact_val",
        "patient_name", "med_name", "condition", "dose", "food_relation",
        "time_str", "total_doses", "remaining_doses", "is_chronic", "notes", "active",
        "med_id", "message", "sched_time", "status", "attempts", "next_attempt",
        "confirmation_source", "confirmation_time", "taken_at", "used_snooze",
        "current_streak", "last_date", "event_type", "table_name", "row_id", "payload",
        "action", "actor", "detail", "trigger_text", "response_text", "detection_method",
        "assistant_state", "lock_enabled", "pin_hash", "pin_salt", "recovery_question",
        "recovery_hash", "recovery_salt", "failed_pin_attempts", "locked_until", "version"
    })

    def _validate_table(self, table: str) -> str:
        """Validate table name against allowlist to prevent SQL injection."""
        if table not in self._VALID_TABLES:
            raise ValueError(f"Invalid table name: {table!r}")
        return table

    def _validate_column(self, col: str) -> str:
        """Validate column name against allowlist to prevent SQL injection."""
        if col not in self._VALID_COLUMNS:
            raise ValueError(f"Invalid column name: {col!r}")
        return col

    def _init_sqlite(self):
        self.path.mkdir(parents=True, exist_ok=True)
        sqlite_file = self.path / "rafiq_operational.db"
        self.sqlite_conn = sqlite3.connect(str(sqlite_file), check_same_thread=False)
        self.sqlite_conn.row_factory = sqlite3.Row
        # Enable WAL mode for concurrent read performance and crash safety
        self.sqlite_conn.execute("PRAGMA journal_mode=WAL")
        # Enable foreign key enforcement
        self.sqlite_conn.execute("PRAGMA foreign_keys=ON")
        self._create_tables()
        self._create_indexes()
        log.info("SQLite database operational store enabled at %s (WAL mode, FK enabled)", sqlite_file)

    def _create_tables(self):
        cursor = self.sqlite_conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                ts TEXT,
                created_at TEXT NOT NULL,
                updated TEXT
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS memory_facts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL DEFAULT 'general',
                fact_key TEXT NOT NULL,
                fact_val TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated TEXT
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS medications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_name TEXT,
                med_name TEXT NOT NULL,
                condition TEXT,
                dose TEXT,
                food_relation TEXT DEFAULT 'none',
                time_str TEXT,
                total_doses INTEGER DEFAULT 0,
                remaining_doses INTEGER DEFAULT 0,
                is_chronic INTEGER DEFAULT 0,
                notes TEXT,
                active INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                updated TEXT
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS reminders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                med_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
                patient_name TEXT,
                message TEXT,
                sched_time TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                attempts INTEGER DEFAULT 0,
                next_attempt TEXT,
                created_at TEXT NOT NULL,
                updated TEXT
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS dose_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                med_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
                patient_name TEXT,
                taken_at TEXT NOT NULL,
                sched_time TEXT,
                used_snooze INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated TEXT
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS health_streaks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_name TEXT NOT NULL,
                med_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
                current_streak INTEGER DEFAULT 0,
                last_date TEXT,
                created_at TEXT NOT NULL,
                updated TEXT,
                UNIQUE(patient_name, med_id)
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS app_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                table_name TEXT,
                row_id INTEGER,
                payload TEXT,
                ts TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated TEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT NOT NULL,
                actor TEXT DEFAULT 'system',
                detail TEXT,
                ts TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated TEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS emergency_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trigger_text TEXT NOT NULL,
                response_text TEXT NOT NULL,
                detection_method TEXT DEFAULT 'regex',
                patient_name TEXT,
                ts TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated TEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS assistant_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                assistant_state TEXT DEFAULT 'PASSIVE',
                lock_enabled INTEGER DEFAULT 0,
                pin_hash TEXT,
                pin_salt TEXT,
                recovery_question TEXT,
                recovery_hash TEXT,
                recovery_salt TEXT,
                failed_pin_attempts INTEGER DEFAULT 0,
                locked_until TEXT,
                version INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        cursor.execute("SELECT COUNT(*) FROM assistant_settings")
        if cursor.fetchone()[0] == 0:
            now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
            cursor.execute("""
                INSERT INTO assistant_settings (
                    assistant_state, lock_enabled, pin_hash, pin_salt,
                    recovery_question, recovery_hash, recovery_salt,
                    failed_pin_attempts, locked_until, version,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, ('PASSIVE', 0, None, None, None, None, None, 0, None, 1, now_iso, now_iso))

        # Migration logic for reminders table
        cursor.execute("PRAGMA table_info(reminders)")
        cols = {col_row["name"] for col_row in cursor.fetchall()}
        if "confirmation_source" not in cols:
            cursor.execute("ALTER TABLE reminders ADD COLUMN confirmation_source TEXT")
        if "confirmation_time" not in cols:
            cursor.execute("ALTER TABLE reminders ADD COLUMN confirmation_time TEXT")
        
        self.sqlite_conn.commit()

    def _create_indexes(self):
        """Create performance-critical indexes for query optimization."""
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_reminders_status_next ON reminders(status, next_attempt)",
            "CREATE INDEX IF NOT EXISTS idx_reminders_med_id ON reminders(med_id)",
            "CREATE INDEX IF NOT EXISTS idx_medications_active ON medications(active)",
            "CREATE INDEX IF NOT EXISTS idx_dose_events_med_id ON dose_events(med_id)",
            "CREATE INDEX IF NOT EXISTS idx_memory_facts_key ON memory_facts(fact_key)",
            "CREATE INDEX IF NOT EXISTS idx_memory_facts_category ON memory_facts(category)",
            "CREATE INDEX IF NOT EXISTS idx_health_streaks_patient_med ON health_streaks(patient_name, med_id)",
            "CREATE INDEX IF NOT EXISTS idx_chat_history_id_desc ON chat_history(id DESC)",
            "CREATE INDEX IF NOT EXISTS idx_app_events_type ON app_events(event_type, table_name)",
            "CREATE INDEX IF NOT EXISTS idx_audit_logs_ts ON audit_logs(ts)",
            "CREATE INDEX IF NOT EXISTS idx_emergency_events_ts ON emergency_events(ts)",
        ]
        cursor = self.sqlite_conn.cursor()
        for sql in indexes:
            try:
                cursor.execute(sql)
            except sqlite3.OperationalError as e:
                log.warning("Index creation skipped: %s", e)
        self.sqlite_conn.commit()

    def _init_chroma(self):
        self.chroma_client = chromadb.PersistentClient(path=str(self.path))
        metadata = {
            "hnsw:space": "cosine",
            "hnsw:construction_ef": 200,
            "hnsw:M": 16,
            "hnsw:search_ef": 100,
        }
        self.vector_collection = self.chroma_client.get_or_create_collection(
            name=self.MEMORY_COLLECTION,
            metadata=metadata,
            embedding_function=None,
        )
        self.vector_enabled = True
        log.info("ChromaDB vector store initialized at %s", self.path)

    def _maybe_migrate_legacy_sqlite(self):
        if os.environ.get("RAFIQ_MIGRATE_LEGACY_SQLITE", "1") != "1":
            return
        
        # Check if we already have records in SQLite medications
        if self._list_records("medications"):
            return

        tables = [
            "chat_history",
            "memory_facts",
            "medications",
            "reminders",
            "dose_events",
            "health_streaks",
            "app_events",
        ]

        # 1. Try to migrate from legacy standalone SQLite DB first if it exists
        if LEGACY_SQLITE_PATH.exists():
            try:
                con = sqlite3.connect(str(LEGACY_SQLITE_PATH))
                con.row_factory = sqlite3.Row
                migrated = 0
                for table in tables:
                    try:
                        rows = con.execute(f"SELECT * FROM {table}").fetchall()
                    except sqlite3.Error:
                        continue
                    for row in rows:
                        data = dict(row)
                        row_id = self._insert_record(table, data)
                        if table == "memory_facts":
                            saved = self._get_record(table, row_id)
                            if saved:
                                self._vector_upsert_fact(saved)
                        migrated += 1
                con.close()
                if migrated:
                    log.info("Migrated %d legacy standalone SQLite rows.", migrated)
            except Exception as e:
                log.error("Legacy standalone SQLite migration failed: %s", e, exc_info=True)

        # 2. Try to migrate from old operational ChromaDB collection if SQLite is empty
        try:
            chroma_cols = self.chroma_client.list_collections()
            has_old_collection = any(c.name == "rafiq_operational_store_v5" for c in chroma_cols)
            if has_old_collection:
                old_coll = self.chroma_client.get_collection("rafiq_operational_store_v5")
                results = old_coll.get(include=["metadatas"])
                metas = results.get("metadatas") or []
                if metas and not self._list_records("medications") and not self._list_records("memory_facts"):
                    log.info("Found %d old records in ChromaDB operational collection. Migrating to SQLite...", len(metas))
                    migrated_chroma = 0
                    for meta in metas:
                        if not meta or "table" not in meta:
                            continue
                        table = meta["table"]
                        data = dict(meta)
                        data.pop("table", None)
                        try:
                            self._insert_record(table, data)
                            migrated_chroma += 1
                        except Exception as ex:
                            log.error("Failed to migrate Chroma record %s to SQLite: %s", meta, ex)
                    log.info("Successfully migrated %d records from ChromaDB operational collection to SQLite.", migrated_chroma)
        except Exception as e:
            log.error("Old ChromaDB operational collection migration failed: %s", e, exc_info=True)

    @staticmethod
    def _now_iso() -> str:
        return datetime.datetime.now().isoformat()

    def _get_record(self, table: str, row_id: int) -> dict[str, Any] | None:
        table = self._validate_table(table)
        cursor = self.sqlite_conn.cursor()
        cursor.execute(f"SELECT * FROM {table} WHERE id = ?", (row_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return dict(row)

    def _list_records(self, table: str, where: str | None = None, params: tuple = ()) -> list[dict[str, Any]]:
        table = self._validate_table(table)
        cursor = self.sqlite_conn.cursor()
        sql = f"SELECT * FROM {table}"
        if where:
            sql += f" WHERE {where}"
        cursor.execute(sql, params)
        return [dict(row) for row in cursor.fetchall()]

    def _next_id(self, table: str) -> int:
        cursor = self.sqlite_conn.cursor()
        cursor.execute(f"SELECT seq FROM sqlite_sequence WHERE name = ?", (table,))
        row = cursor.fetchone()
        if row:
            return int(row[0]) + 1
        cursor.execute(f"SELECT MAX(id) FROM {table}")
        row = cursor.fetchone()
        return (int(row[0]) if row[0] is not None else 0) + 1

    def _record_document(self, table: str, row: dict[str, Any]) -> str:
        if table == "memory_facts":
            return f"[{row.get('category', 'general')}] {row.get('fact_key', '')}: {row.get('fact_val', '')}"
        if table == "chat_history":
            return f"{row.get('role', '')}: {row.get('content', '')}"
        if table == "medications":
            return (
                f"medication {row.get('med_name', '')} {row.get('condition', '')} "
                f"{row.get('dose', '')} {row.get('time_str', '')}"
            )
        if table == "reminders":
            return f"reminder {row.get('message', '')} {row.get('sched_time', '')} {row.get('status', '')}"
        return json.dumps(row, ensure_ascii=False, sort_keys=True)

    def _insert_record(self, table: str, data: dict[str, Any]) -> int:
        table = self._validate_table(table)
        row = dict(data)
        now = self._now_iso()
        row.setdefault("created_at", now)
        row.setdefault("updated", now)
        
        columns = [self._validate_column(col) for col in row.keys()]
        placeholders = ", ".join(["?"] * len(columns))
        sql = f"INSERT OR REPLACE INTO {table} ({', '.join(columns)}) VALUES ({placeholders})"
        cursor = self.sqlite_conn.cursor()
        cursor.execute(sql, tuple(row[col] for col in columns))
        self.sqlite_conn.commit()
        return cursor.lastrowid

    def _update_record(self, table: str, row_id: int, values: dict[str, Any]) -> dict[str, Any] | None:
        table = self._validate_table(table)
        row = dict(values)
        row["updated"] = self._now_iso()
        columns = [self._validate_column(col) for col in row.keys()]
        set_clause = ", ".join(f"{col} = ?" for col in columns)
        sql = f"UPDATE {table} SET {set_clause} WHERE id = ?"
        cursor = self.sqlite_conn.cursor()
        cursor.execute(sql, tuple(row[col] for col in columns) + (row_id,))
        self.sqlite_conn.commit()
        return self._get_record(table, row_id)

    def _delete_record(self, table: str, row_id: int):
        table = self._validate_table(table)
        cursor = self.sqlite_conn.cursor()
        cursor.execute(f"DELETE FROM {table} WHERE id = ?", (row_id,))
        self.sqlite_conn.commit()

    def _delete_where_sql(self, table: str, where: str, params: tuple = ()):
        """Delete rows matching a SQL WHERE clause. Replaces old O(N) Python-side filtering."""
        table = self._validate_table(table)
        cursor = self.sqlite_conn.cursor()
        cursor.execute(f"DELETE FROM {table} WHERE {where}", params)
        self.sqlite_conn.commit()

    def _find_one_sql(self, table: str, where: str, params: tuple = (), order_by: str = "id ASC") -> dict[str, Any] | None:
        """Find a single row matching a SQL WHERE clause. Replaces old O(N) Python-side filtering."""
        table = self._validate_table(table)
        cursor = self.sqlite_conn.cursor()
        cursor.execute(f"SELECT * FROM {table} WHERE {where} ORDER BY {order_by} LIMIT 1", params)
        row = cursor.fetchone()
        return dict(row) if row else None

    # Keep backward-compat aliases for any code still using old signatures
    def _delete_where(self, table: str, predicate):
        """Legacy O(N) delete — prefer _delete_where_sql for new code."""
        for row in self._list_records(table):
            if predicate(row):
                self._delete_record(table, int(row["id"]))

    def _find_one(self, table: str, predicate, sort_key: str = "id", reverse: bool = False) -> dict[str, Any] | None:
        """Legacy O(N) find — prefer _find_one_sql for new code."""
        rows = [row for row in self._list_records(table) if predicate(row)]
        rows.sort(key=lambda row: row.get(sort_key, "") if row.get(sort_key) is not None else "", reverse=reverse)
        return rows[0] if rows else None

    async def log_audit(self, action: str, detail: str = "", actor: str = "system"):
        await self.audit.log_audit(action, detail, actor)

    async def log_emergency(self, trigger_text: str, response_text: str, detection_method: str = "regex", patient_name: str = ""):
        await self.audit.log_emergency(trigger_text, response_text, detection_method, patient_name)

    async def sync_vector_index(self):
        await self.vector.sync_vector_index()

    def _vector_upsert_fact(self, row: dict[str, Any]):
        self.vector._vector_upsert_fact(row)

    def _vector_delete_fact(self, row_id: int):
        self.vector._vector_delete_fact(row_id)

    async def _fetchone(self, sql: str, params: tuple = ()) -> dict[str, Any] | None:
        rows = await self._fetchall(sql, params)
        return rows[0] if rows else None

    async def _fetchall(self, sql: str, params: tuple = ()) -> list[dict[str, Any]]:
        def _run():
            cursor = self.sqlite_conn.cursor()
            cursor.execute(sql, params)
            return [dict(row) for row in cursor.fetchall()]
        return await self._execute_in_thread(_run)

    async def get_history(self, limit: int = 8) -> list[dict[str, str]]:
        def _run():
            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT role, content FROM chat_history ORDER BY id DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            return [{"role": row["role"], "content": row["content"]} for row in reversed(rows)]
        return await self._execute_in_thread(_run)

    async def save_msg(self, role: str, content: str):
        def _run():
            now = self._now_iso()
            self._insert_record("chat_history", {"role": role, "content": content, "ts": now})
            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM chat_history")
            count = cursor.fetchone()[0]
            if count > 500:
                excess = count - 500
                cursor.execute("DELETE FROM chat_history WHERE id IN (SELECT id FROM chat_history ORDER BY id ASC LIMIT ?)", (excess,))
                self.sqlite_conn.commit()
        await self._execute_in_thread(_run)

    async def clear_history(self):
        def _run():
            cursor = self.sqlite_conn.cursor()
            cursor.execute("DELETE FROM chat_history")
            self.sqlite_conn.commit()
        await self._execute_in_thread(_run)

    async def upsert_fact(self, category: str, key: str, value: str):
        if category == "personal" and key in {"اسم المريض", "patient_name"}:
            privacy.get_pseudonymizer().register_name(value)
        
        def _run():
            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT id FROM memory_facts WHERE fact_key = ?", (key,))
            row = cursor.fetchone()
            now = self._now_iso()
            data = {
                "category": category or "general",
                "fact_key": key,
                "fact_val": value,
                "updated": now,
            }
            if row:
                row_id = row[0]
                self._update_record("memory_facts", row_id, data)
            else:
                row_id = self._insert_record("memory_facts", data)
                
            saved = self._get_record("memory_facts", row_id)
            if saved:
                self._vector_upsert_fact(saved)
            return row_id, bool(row)

        row_id, existed = await self._execute_in_thread(_run)
        if not existed:
            await self._record_event("insert", "memory_facts", row_id, {"key": key, "category": category})

    async def _record_event(self, event_type: str, table_name: str, row_id: int, payload: dict[str, Any] | None = None):
        def _run():
            self._insert_record(
                "app_events",
                {
                    "event_type": event_type,
                    "table_name": table_name,
                    "row_id": int(row_id),
                    "payload": json.dumps(payload or {}, ensure_ascii=False),
                    "ts": self._now_iso(),
                },
            )
        await self._execute_in_thread(_run)



    async def get_relevant_facts_text(self, query: str, limit: int = 8) -> str:
        return await self.vector.get_relevant_facts_text(query, limit)



    async def add_medication(self, data: dict[str, Any]) -> int:
        now = self._now_iso()
        row = {
            "patient_name": data.get("patient_name") or "",
            "med_name": data.get("med_name") or "دواء",
            "condition": data.get("condition") or "",
            "dose": data.get("dose") or "",
            "food_relation": data.get("food_relation") or "none",
            "time_str": data.get("time_str") or "",
            "total_doses": int(data.get("total_doses") or 0),
            "remaining_doses": int(data.get("remaining_doses") or 0),
            "is_chronic": int(data.get("is_chronic") or 0),
            "notes": data.get("notes") or "",
            "active": int(data.get("active", 1)),
            "created_at": data.get("created_at") or now,
        }
        def _run():
            return self._insert_record("medications", row)
        mid = await self._execute_in_thread(_run)
        await self._record_event("insert", "medications", mid, {"med_name": row.get("med_name")})
        return mid

    async def get_active_medications(self) -> list[dict[str, Any]]:
        def _run():
            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT * FROM medications WHERE active = 1 ORDER BY created_at DESC")
            return [dict(row) for row in cursor.fetchall()]
        return await self._execute_in_thread(_run)

    async def decrement_doses(self, med_id: int) -> dict[str, Any]:
        def _run():
            row = self._get_record("medications", int(med_id))
            if not row:
                return {"status": "active", "remaining_doses": None, "med_name": ""}
            is_chronic = int(row.get("is_chronic") or 0)
            remaining = int(row.get("remaining_doses") or 0)
            name = str(row.get("med_name", ""))
            if is_chronic:
                return {"status": "chronic", "remaining_doses": remaining, "med_name": name}

            if remaining > 0:
                remaining -= 1
                updates = {"remaining_doses": remaining}
                if remaining == 0:
                    updates["active"] = 0
                self._update_record("medications", int(med_id), updates)
                if remaining == 0:
                    cursor = self.sqlite_conn.cursor()
                    cursor.execute(
                        "UPDATE reminders SET status = 'expired' WHERE med_id = ? AND status IN ('pending', 'snoozed', 'confirmed')",
                        (int(med_id),)
                    )
                    self.sqlite_conn.commit()
                    return {"status": "expired", "remaining_doses": 0, "med_name": name}
            return {
                "status": "active",
                "remaining_doses": remaining,
                "med_name": name,
                "low_stock": 0 < remaining < LOW_STOCK_THRESHOLD,
            }
        return await self._execute_in_thread(_run)

    async def add_reminder(self, med_id: int, patient: str, msg: str, sched: datetime.datetime) -> int:
        def _run():
            iso = sched.isoformat()
            return self._insert_record(
                "reminders",
                {
                    "med_id": int(med_id),
                    "patient_name": patient,
                    "message": msg,
                    "sched_time": iso,
                    "status": "pending",
                    "attempts": 0,
                    "next_attempt": iso,
                    "created_at": self._now_iso(),
                },
            )
        return await self._execute_in_thread(_run)

    async def get_due_reminders(self) -> list[dict[str, Any]]:
        def _run():
            now = datetime.datetime.now().isoformat()
            cursor = self.sqlite_conn.cursor()
            cursor.execute("""
                SELECT r.*, m.is_chronic, m.remaining_doses, m.med_name, m.dose, m.time_str
                FROM reminders r
                JOIN medications m ON r.med_id = m.id
                WHERE r.status IN ('pending', 'snoozed')
                  AND COALESCE(r.next_attempt, r.sched_time) <= ?
                  AND m.active = 1
                ORDER BY COALESCE(r.next_attempt, r.sched_time) ASC
            """, (now,))
            return [dict(row) for row in cursor.fetchall()]
        return await self._execute_in_thread(_run)

    async def update_reminder(self, rid: int, **kw):
        if not kw:
            return
        allowed = {"status", "attempts", "next_attempt", "sched_time", "confirmation_source", "confirmation_time"}
        unknown = sorted(set(kw) - allowed)
        if unknown:
            log.error("update_reminder rejected unknown columns: %s", ", ".join(unknown))
            return
        def _run():
            self._update_record("reminders", int(rid), kw)
        await self._execute_in_thread(_run)

    async def get_health_streak(self, patient: str, med_id: int) -> dict[str, Any] | None:
        def _run():
            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT * FROM health_streaks WHERE patient_name = ? AND med_id = ?", (patient, int(med_id)))
            row = cursor.fetchone()
            return dict(row) if row else None
        return await self._execute_in_thread(_run)

    async def get_medication_time_str(self, med_id: int) -> str:
        def _run():
            row = self._get_record("medications", int(med_id))
            return str(row.get("time_str", "")) if row else ""
        return await self._execute_in_thread(_run)

    async def update_medication_time_str(self, med_id: int, time_str: str):
        def _run():
            self._update_record("medications", int(med_id), {"time_str": time_str})
        await self._execute_in_thread(_run)

    async def get_pending_reminder_for_med(self, med_id: int) -> dict[str, Any] | None:
        def _run():
            cursor = self.sqlite_conn.cursor()
            cursor.execute(
                "SELECT * FROM reminders WHERE med_id = ? AND status = 'pending' ORDER BY sched_time ASC LIMIT 1",
                (int(med_id),)
            )
            row = cursor.fetchone()
            return dict(row) if row else None
        return await self._execute_in_thread(_run)

    async def get_recent_dose_events(self, med_id: int, limit: int | None = 3) -> list[dict[str, Any]]:
        def _run():
            cursor = self.sqlite_conn.cursor()
            if limit:
                cursor.execute("SELECT * FROM dose_events WHERE med_id = ? ORDER BY id DESC LIMIT ?", (int(med_id), limit))
            else:
                cursor.execute("SELECT * FROM dose_events WHERE med_id = ? ORDER BY id DESC", (int(med_id),))
            return [dict(row) for row in cursor.fetchall()]
        return await self._execute_in_thread(_run)

    async def record_dose_taken(self, reminder: dict[str, Any], used_snooze: bool) -> int:
        med_id = int(reminder.get("med_id") or 0)
        patient = reminder.get("patient_name") or "المريض"
        now = datetime.datetime.now()
        today = now.date().isoformat()
        def _run():
            self._insert_record(
                "dose_events",
                {
                    "med_id": med_id,
                    "patient_name": patient,
                    "taken_at": now.isoformat(),
                    "sched_time": reminder.get("sched_time") or "",
                    "used_snooze": int(used_snooze),
                },
            )

            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT * FROM health_streaks WHERE patient_name = ? AND med_id = ?", (patient, int(med_id)))
            row = cursor.fetchone()
            row = dict(row) if row else None
            
            if used_snooze:
                streak = int(row.get("current_streak") or 0) if row else 0
            elif not row or not row.get("last_date"):
                streak = 1
            else:
                last_date = datetime.datetime.fromisoformat(str(row["last_date"])).date()
                if last_date == now.date():
                    streak = int(row.get("current_streak") or 1)
                elif last_date == now.date() - datetime.timedelta(days=1):
                    streak = int(row.get("current_streak") or 0) + 1
                else:
                    streak = 1

            data = {
                "patient_name": patient,
                "med_id": med_id,
                "current_streak": streak,
                "last_date": today,
                "updated": self._now_iso(),
            }
            if row:
                self._update_record("health_streaks", int(row["id"]), data)
            else:
                self._insert_record("health_streaks", data)
            return streak
        return await self._execute_in_thread(_run)

    async def undo_last_insert(self) -> str:
        def _run():
            cursor = self.sqlite_conn.cursor()
            cursor.execute(
                "SELECT * FROM app_events WHERE event_type = 'insert' AND table_name IN ('medications', 'memory_facts') ORDER BY id DESC LIMIT 1"
            )
            row = cursor.fetchone()
            if not row:
                return "مش لاقي حاجة قريبة أقدر أمسحها. قول لي بالضبط عايز نعدّل إيه؟"

            table = str(row["table_name"])
            row_id = int(row["row_id"])
            if table == "medications":
                cursor.execute("DELETE FROM reminders WHERE med_id = ?", (row_id,))
                cursor.execute("DELETE FROM dose_events WHERE med_id = ?", (row_id,))
                cursor.execute("DELETE FROM health_streaks WHERE med_id = ?", (row_id,))
                cursor.execute("DELETE FROM medications WHERE id = ?", (row_id,))
                label = "آخر دواء وتذكيراته"
            else:
                cursor.execute("DELETE FROM memory_facts WHERE id = ?", (row_id,))
                self._vector_delete_fact(row_id)
                label = "آخر معلومة محفوظة"
                
            cursor.execute("DELETE FROM app_events WHERE id = ?", (int(row["id"]),))
            self.sqlite_conn.commit()
            return f"مسحت {label}. قول لي الصح إيه؟"
        return await self._execute_in_thread(_run)

    async def counts(self) -> tuple[int, int]:
        def _run():
            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM chat_history")
            chats = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM medications WHERE active = 1")
            meds = cursor.fetchone()[0]
            return chats, meds
        return await self._execute_in_thread(_run)

    async def today_meds_table(self) -> str:
        def _run():
            cursor = self.sqlite_conn.cursor()
            cursor.execute("""
                SELECT r.*, m.med_name, m.dose, m.remaining_doses, m.is_chronic
                FROM reminders r
                JOIN medications m ON r.med_id = m.id
                WHERE r.status IN ('pending', 'snoozed')
                  AND m.active = 1
                ORDER BY COALESCE(r.next_attempt, r.sched_time) ASC
            """)
            rows = [dict(row) for row in cursor.fetchall()]

            today = datetime.datetime.now().date()
            filtered = []
            for row in rows:
                try:
                    due = datetime.datetime.fromisoformat(str(row.get("next_attempt") or row.get("sched_time"))).date()
                except Exception:
                    due = today
                if due <= today:
                    filtered.append(row)
            if not filtered:
                return "لا توجد أدوية مجدولة اليوم."
            header = f"{'الوقت':<8} | {'الدواء':<18} | {'الجرعة':<12} | {'المتبقي':<8} | الحالة"
            sep = "-" * len(header)
            lines = [header, sep]
            for r in filtered:
                try:
                    t = datetime.datetime.fromisoformat(str(r.get("next_attempt") or r.get("sched_time"))).strftime("%H:%M")
                except Exception:
                    t = "--:--"
                remaining = "مزمن" if int(r.get("is_chronic") or 0) else str(r.get("remaining_doses", ""))
                lines.append(f"{t:<8} | {r['med_name']:<18} | {(r.get('dose') or ''):<12} | {remaining:<8} | {r['status']}")
            return "\n".join(lines)
        return await self._execute_in_thread(_run)

    async def get_assistant_state(self) -> str:
        def _run():
            cursor = self.sqlite_conn.cursor()
            cursor.execute("SELECT assistant_state FROM assistant_settings LIMIT 1")
            row = cursor.fetchone()
            if row:
                return row[0]
            return "PASSIVE"
        return await self._execute_in_thread(_run)

    async def update_assistant_state(self, state: str):
        def _run():
            cursor = self.sqlite_conn.cursor()
            now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
            cursor.execute(
                "UPDATE assistant_settings SET assistant_state = ?, updated_at = ?",
                (state, now_iso)
            )
            self.sqlite_conn.commit()
        await self._execute_in_thread(_run)
