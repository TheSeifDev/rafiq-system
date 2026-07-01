# tests/test_medication_confirmation_flow.py — Automated Unit Tests for Sprint 2A Reminder Flow

import os
import sys
import asyncio
import unittest
import datetime
import shutil
from pathlib import Path
from unittest.mock import patch

# Ensure import paths work
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from src.database.db_operational import RafiqDB
from src.services.scheduler_service import ReminderScheduler
from src.config.settings import STATE_AWAITING_REMINDER_RESPONSE, STATE_PASSIVE, STATE_DISABLED

class TestMedicationConfirmationFlow(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        os.environ["RAFIQ_OFFLINE"] = "1"
        self.test_db_path = "test_medication_flow_db.db"
        
        def mock_init_chroma(db_self):
            db_self.vector_enabled = False
            db_self.vector_collection = None
            db_self.chroma_client = None
            
        self.chroma_patch = patch("src.database.db_operational.RafiqDB._init_chroma", mock_init_chroma)
        self.chroma_patch.start()
        
        import gc
        gc.collect()
        if os.path.exists(self.test_db_path):
            try:
                shutil.rmtree(self.test_db_path)
            except Exception:
                pass

    def tearDown(self):
        self.chroma_patch.stop()
        import gc
        gc.collect()
        if os.path.exists(self.test_db_path):
            try:
                shutil.rmtree(self.test_db_path)
            except Exception:
                pass

    async def test_medication_lifecycle_flow(self):
        # 1. Initialize database and scheduler
        db = await RafiqDB.create(path=self.test_db_path)
        scheduler = ReminderScheduler(db)

        # 2. Add a medication
        med_id = await db.add_medication({
            "patient_name": "أحمد",
            "med_name": "بنادول",
            "condition": "صداع",
            "dose": "حبة",
            "food_relation": "none",
            "time_str": "12:00",
            "total_doses": 10,
            "remaining_doses": 10,
            "is_chronic": 0,
            "notes": "",
            "active": 1
        })

        # 3. Add a reminder due now
        now = datetime.datetime.now()
        rid = await db.add_reminder(med_id, "أحمد", "حان موعد البنادول", now)

        # 4. Mock the speak function to avoid actual audio output in tests
        with patch("src.services.scheduler_service.speak") as mock_speak:
            # Run _tick
            await scheduler._tick()
            
            # Assert speak was called with the motivation message
            mock_speak.assert_called_once()
            
            # Assert state transitioned to awaiting_confirmation
            self.assertIsNotNone(scheduler.active)
            self.assertEqual(scheduler.active["id"], rid)
            self.assertEqual(scheduler.active["status"], "awaiting_confirmation")
            self.assertTrue(scheduler.just_fired)

            # Check status in database is awaiting_confirmation
            reminder_db = db._get_record("reminders", rid)
            self.assertEqual(reminder_db["status"], "awaiting_confirmation")

            # 5. Confirm the reminder
            result = await scheduler.confirm(rid, source="user_voice")
            
            # Assert active state is cleared
            self.assertIsNone(scheduler.active)
            self.assertFalse(scheduler.just_fired)
            
            # Assert dose is decremented
            self.assertEqual(result["remaining_doses"], 9)
            
            # Assert confirmation source & time were written
            reminder_db = db._get_record("reminders", rid)
            self.assertEqual(reminder_db["confirmation_source"], "user_voice")
            self.assertIsNotNone(reminder_db["confirmation_time"])
            self.assertEqual(reminder_db["status"], "pending")  # Recycled to pending

        await db.close()

    async def test_snooze_flow(self):
        db = await RafiqDB.create(path=self.test_db_path)
        scheduler = ReminderScheduler(db)

        med_id = await db.add_medication({
            "patient_name": "أحمد",
            "med_name": "بنادول",
            "condition": "صداع",
            "dose": "حبة",
            "food_relation": "none",
            "time_str": "12:00",
            "total_doses": 10,
            "remaining_doses": 10,
            "is_chronic": 0,
            "notes": "",
            "active": 1
        })

        now = datetime.datetime.now()
        rid = await db.add_reminder(med_id, "أحمد", "حان موعد البنادول", now)

        with patch("src.services.scheduler_service.speak"):
            await scheduler._tick()
            self.assertEqual(scheduler.active["status"], "awaiting_confirmation")

            # Snooze reminder
            await scheduler.snooze(rid, source="user_voice")

            # Assert active is cleared
            self.assertIsNone(scheduler.active)

            # Assert status in DB is snoozed, attempts incremented
            reminder_db = db._get_record("reminders", rid)
            self.assertEqual(reminder_db["status"], "snoozed")
            self.assertEqual(reminder_db["attempts"], 1)
            self.assertIsNotNone(reminder_db["next_attempt"])

        await db.close()

    async def test_skip_flow(self):
        db = await RafiqDB.create(path=self.test_db_path)
        scheduler = ReminderScheduler(db)

        med_id = await db.add_medication({
            "patient_name": "أحمد",
            "med_name": "بنادول",
            "condition": "صداع",
            "dose": "حبة",
            "food_relation": "none",
            "time_str": "12:00",
            "total_doses": 10,
            "remaining_doses": 10,
            "is_chronic": 0,
            "notes": "",
            "active": 1
        })

        now = datetime.datetime.now()
        rid = await db.add_reminder(med_id, "أحمد", "حان موعد البنادول", now)

        with patch("src.services.scheduler_service.speak"):
            await scheduler._tick()
            self.assertEqual(scheduler.active["status"], "awaiting_confirmation")

            # Skip reminder
            await scheduler.skip(rid, source="user_voice")

            # Assert active is cleared
            self.assertIsNone(scheduler.active)

            # Assert doses did NOT decrement
            med_db = db._get_record("medications", med_id)
            self.assertEqual(med_db["remaining_doses"], 10)

            # Assert status was recycled to pending
            reminder_db = db._get_record("reminders", rid)
            self.assertEqual(reminder_db["status"], "pending")
            self.assertEqual(reminder_db["attempts"], 0)

        await db.close()

    async def test_cancel_flow(self):
        db = await RafiqDB.create(path=self.test_db_path)
        scheduler = ReminderScheduler(db)

        med_id = await db.add_medication({
            "patient_name": "أحمد",
            "med_name": "بنادول",
            "condition": "صداع",
            "dose": "حبة",
            "food_relation": "none",
            "time_str": "12:00",
            "total_doses": 10,
            "remaining_doses": 10,
            "is_chronic": 0,
            "notes": "",
            "active": 1
        })

        now = datetime.datetime.now()
        rid = await db.add_reminder(med_id, "أحمد", "حان موعد البنادول", now)

        with patch("src.services.scheduler_service.speak"):
            await scheduler._tick()
            self.assertEqual(scheduler.active["status"], "awaiting_confirmation")

            # Cancel reminder
            await scheduler.cancel(rid, source="user_voice")

            self.assertIsNone(scheduler.active)

            # Doses should NOT decrement
            med_db = db._get_record("medications", med_id)
            self.assertEqual(med_db["remaining_doses"], 10)

            # Status should be pending
            reminder_db = db._get_record("reminders", rid)
            self.assertEqual(reminder_db["status"], "pending")

        await db.close()

    async def test_overdue_expiry_flow(self):
        db = await RafiqDB.create(path=self.test_db_path)
        scheduler = ReminderScheduler(db)

        med_id = await db.add_medication({
            "patient_name": "أحمد",
            "med_name": "بنادول",
            "condition": "صداع",
            "dose": "حبة",
            "food_relation": "none",
            "time_str": "12:00",
            "total_doses": 10,
            "remaining_doses": 10,
            "is_chronic": 0,
            "notes": "",
            "active": 1
        })

        # Set sched_time to more than 24 hours ago
        overdue_time = datetime.datetime.now() - datetime.timedelta(hours=25)
        rid = await db.add_reminder(med_id, "أحمد", "حان موعد البنادول", overdue_time)

        # Update reminder status and next_attempt directly
        await db.update_reminder(rid, status="pending", next_attempt=overdue_time.isoformat())

        with patch("src.services.scheduler_service.speak") as mock_speak:
            # Tick
            await scheduler._tick()

            # Speak should NOT have been called because it expired silently
            mock_speak.assert_not_called()

            # Active should NOT be set
            self.assertIsNone(scheduler.active)

            # DB should have recycled it to pending for the next day, resetting attempts
            reminder_db = db._get_record("reminders", rid)
            self.assertEqual(reminder_db["status"], "pending")
            self.assertEqual(reminder_db["attempts"], 0)
            
            # Next attempt should be scheduled ~24h after the original (or interval)
            next_sched = datetime.datetime.fromisoformat(reminder_db["sched_time"])
            self.assertTrue(next_sched > datetime.datetime.now() - datetime.timedelta(hours=1))

        await db.close()

    async def test_auto_snooze_timeout(self):
        db = await RafiqDB.create(path=self.test_db_path)
        scheduler = ReminderScheduler(db)

        med_id = await db.add_medication({
            "patient_name": "أحمد",
            "med_name": "بنادول",
            "condition": "صداع",
            "dose": "حبة",
            "food_relation": "none",
            "time_str": "12:00",
            "total_doses": 10,
            "remaining_doses": 10,
            "is_chronic": 0,
            "notes": "",
            "active": 1
        })

        now = datetime.datetime.now()
        rid = await db.add_reminder(med_id, "أحمد", "حان موعد البنادول", now)

        with patch("src.services.scheduler_service.speak"):
            await scheduler._tick()
            self.assertEqual(scheduler.active["status"], "awaiting_confirmation")

            # Back-date fired_at to simulate > 60 seconds passing
            scheduler.fired_at = datetime.datetime.now() - datetime.timedelta(seconds=61)

            # Run tick again to trigger auto-snooze scanner
            await scheduler._tick()

            # Assert active is cleared after auto-snooze
            self.assertIsNone(scheduler.active)

            # Assert status in DB is snoozed, attempts incremented
            reminder_db = db._get_record("reminders", rid)
            self.assertEqual(reminder_db["status"], "snoozed")
            self.assertEqual(reminder_db["attempts"], 1)

        await db.close()

if __name__ == "__main__":
    unittest.main()
