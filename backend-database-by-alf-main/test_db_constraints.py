# ruff: noqa: E402

from __future__ import annotations

import os
import sqlite3
import unittest
from pathlib import Path

TEST_DB_PATH = Path(__file__).resolve().parent / ".test_artifacts" / "constraints_rafiq.db"
TEST_DB_PATH.parent.mkdir(parents=True, exist_ok=True)

os.environ.setdefault("API_KEY", "test-api-key")
os.environ["RAFIQ_DB_PATH"] = str(TEST_DB_PATH)

import db


class TestRafiqDBConstraints(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        db.set_db_path(TEST_DB_PATH)
        if TEST_DB_PATH.exists():
            TEST_DB_PATH.unlink()
        db.init_db()

    @classmethod
    def tearDownClass(cls) -> None:
        db.reset_paths_from_settings()

    def setUp(self) -> None:
        with db.cursor() as cur:
            cur.execute("DELETE FROM alerts")
            cur.execute("DELETE FROM devices")
            cur.execute("DELETE FROM emergency_contacts")
            cur.execute("DELETE FROM locations")
            cur.execute("DELETE FROM reminders")
            cur.execute("DELETE FROM patients")
            cur.execute("DELETE FROM _sync_queue")

    def test_01_wal_mode_enabled(self) -> None:
        conn = sqlite3.connect(TEST_DB_PATH)
        try:
            mode = conn.execute("PRAGMA journal_mode").fetchone()[0]
        finally:
            conn.close()
        self.assertEqual(mode.lower(), "wal")

    def test_02_sql_injection_attempt_does_not_drop_tables(self) -> None:
        patient_id = db.create_patient(
            {
                "name": "Injection Guard",
                "age": 29,
                "gender": "male",
                "blood_type": "B+",
                "medical_history": "",
            }
        )
        with db.cursor() as cur:
            db._upsert_single(
                cur,
                "alerts",
                {
                    "id": 123456,
                    "patient_id": patient_id,
                    "type": "fall",
                    "message": "Injected payload should be ignored",
                    "severity": "high",
                    "DROP TABLE alerts; --": "hacked",
                },
            )

        with db.cursor() as cur:
            table_exists = cur.execute(
                "SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name='alerts'"
            ).fetchone()["c"]
            inserted = cur.execute("SELECT COUNT(*) AS c FROM alerts WHERE id = 123456").fetchone()["c"]
            row = cur.execute("SELECT type, message, severity FROM alerts WHERE id = 123456").fetchone()
        self.assertEqual(table_exists, 1)
        self.assertEqual(inserted, 1)
        self.assertEqual(row["type"], "fall")
        self.assertEqual(row["severity"], "high")

    def test_03_foreign_key_integrity(self) -> None:
        patient_id = db.create_patient(
            {
                "name": "Test",
                "age": 30,
                "gender": "male",
                "blood_type": "A+",
                "medical_history": "",
            }
        )
        db.create_alert(
            {
                "patient_id": patient_id,
                "type": "fall",
                "message": "سقوط",
                "severity": "high",
            }
        )

        with self.assertRaises(sqlite3.IntegrityError):
            db.create_alert(
                {
                    "patient_id": 9999,
                    "type": "fall",
                    "message": "سقوط",
                    "severity": "high",
                }
            )

    def test_04_sync_queue_expected_behavior(self) -> None:
        patient_id = db.create_patient(
            {
                "name": "Queue Test",
                "age": 45,
                "gender": "male",
                "blood_type": "O+",
                "medical_history": "",
            }
        )
        db.create_alert(
            {
                "patient_id": patient_id,
                "type": "fall",
                "message": "سقوط",
                "severity": "high",
            }
        )

        with db.cursor() as cur:
            queue = cur.execute("SELECT table_name, operation FROM _sync_queue").fetchall()
        self.assertEqual(len(queue), 1)
        self.assertEqual(queue[0]["table_name"], "alerts")
        self.assertEqual(queue[0]["operation"], "upsert")

    def test_05_prune_missing_from_sync_deletes_pull_rows(self) -> None:
        pid = db.create_patient(
            {
                "name": "To Be Deleted",
                "age": 50,
                "gender": "male",
                "blood_type": "A+",
                "medical_history": "",
            }
        )
        deleted = db.prune_missing_from_sync("patients", remote_ids=set())
        self.assertEqual(deleted, 1)
        self.assertIsNone(db.get_patient(pid))

    def test_06_prune_missing_from_sync_keeps_pending_reminders(self) -> None:
        patient_id = db.create_patient(
            {
                "name": "Reminder Owner",
                "age": 32,
                "gender": "female",
                "blood_type": "O+",
                "medical_history": "",
            }
        )
        reminder_id = db.add_reminder(
            {
                "patient_id": patient_id,
                "title": "Keep me",
                "description": "",
                "time": "2026-04-28T11:00:00+02:00",
                "is_active": True,
            }
        )

        deleted = db.prune_missing_from_sync("reminders", remote_ids=set())
        self.assertEqual(deleted, 0)
        with db.cursor() as cur:
            exists = cur.execute("SELECT 1 FROM reminders WHERE id = ?", (reminder_id,)).fetchone()
        self.assertIsNotNone(exists)


if __name__ == "__main__":
    unittest.main()
