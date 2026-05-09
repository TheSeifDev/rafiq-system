# ruff: noqa: E402

from __future__ import annotations

import os
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

TEST_DB_PATH = Path(__file__).resolve().parent / ".test_artifacts" / "test_rafiq.db"
TEST_DB_PATH.parent.mkdir(parents=True, exist_ok=True)

os.environ.setdefault("API_KEY", "test-api-key")
os.environ.setdefault("ALLOW_INSECURE_DEV_API_KEY", "0")
os.environ["RAFIQ_DB_PATH"] = str(TEST_DB_PATH)

import db
from api import API_KEY, app


class TestRafiqV3(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        db.set_db_path(TEST_DB_PATH)
        db.init_db()
        cls.client = TestClient(app)
        cls.client.__enter__()
        cls.client.headers.update({"X-API-Key": API_KEY})

    @classmethod
    def tearDownClass(cls) -> None:
        cls.client.__exit__(None, None, None)
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

    def _create_patient(self) -> int:
        response = self.client.post(
            "/patients",
            json={
                "name": "Test Patient",
                "age": 70,
                "gender": "male",
            },
        )
        self.assertEqual(response.status_code, 201)
        return response.json()["data"]["id"]

    def test_01_health_check(self) -> None:
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])

    def test_02_create_patient_and_fetch(self) -> None:
        patient_id = self._create_patient()
        response = self.client.get(f"/patients/{patient_id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["name"], "Test Patient")

    def test_03_create_alert_invalid_patient(self) -> None:
        response = self.client.post(
            "/alerts",
            json={
                "patient_id": 999999,
                "type": "heart_rate",
                "message": "High HR",
                "severity": "high",
            },
        )
        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertFalse(payload["success"])
        self.assertEqual(payload["error"]["code"], "invalid_foreign_key")

    def test_04_api_key_auth(self) -> None:
        missing = self.client.get("/patients", headers={"X-API-Key": ""})
        self.assertEqual(missing.status_code, 401)
        wrong = self.client.get("/patients", headers={"X-API-Key": "wrong-key"})
        self.assertEqual(wrong.status_code, 401)

    def test_05_input_validation(self) -> None:
        invalid_age = self.client.post(
            "/patients",
            json={
                "name": "Invalid Age",
                "age": 200,
                "gender": "male",
            },
        )
        self.assertEqual(invalid_age.status_code, 422)
        self.assertEqual(invalid_age.json()["error"]["code"], "validation_error")

        patient_id = self._create_patient()
        invalid_phone = self.client.post(
            "/contacts",
            json={
                "patient_id": patient_id,
                "name": "Emergency",
                "phone_number": "invalid-phone",
                "priority": 1,
            },
        )
        self.assertEqual(invalid_phone.status_code, 422)
        self.assertEqual(invalid_phone.json()["error"]["code"], "validation_error")

    def test_06_pagination(self) -> None:
        for idx in range(3):
            self.client.post(
                "/patients",
                json={"name": f"P{idx}", "age": 30, "gender": "female"},
            )
        response = self.client.get("/patients?limit=2&skip=0")
        self.assertEqual(response.status_code, 200)
        self.assertLessEqual(len(response.json()["data"]), 2)

    def test_07_update_patient_not_found(self) -> None:
        response = self.client.put("/patients/999999", json={"name": "Ghost"})
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["error"]["code"], "not_found")

    def test_08_reminder_requires_timezone(self) -> None:
        patient_id = self._create_patient()
        bad = self.client.post(
            "/reminders",
            json={
                "patient_id": patient_id,
                "title": "دواء الضغط",
                "description": "حبة بعد الإفطار",
                "time": "2026-04-28T14:30:00",
                "is_active": True,
            },
        )
        self.assertEqual(bad.status_code, 422)
        self.assertEqual(bad.json()["error"]["code"], "validation_error")

        good = self.client.post(
            "/reminders",
            json={
                "patient_id": patient_id,
                "title": "دواء الضغط",
                "description": "حبة بعد الإفطار",
                "time": "2026-04-28T14:30:00+02:00",
                "is_active": True,
            },
        )
        self.assertEqual(good.status_code, 201)

    def test_09_push_tables_enqueue_to_sync_queue(self) -> None:
        patient_id = self._create_patient()
        response = self.client.post(
            "/alerts",
            json={
                "patient_id": patient_id,
                "type": "heart_rate",
                "message": "High HR",
                "severity": "high",
            },
        )
        self.assertEqual(response.status_code, 201)

        with db.cursor() as cur:
            count = cur.execute(
                "SELECT COUNT(*) AS c FROM _sync_queue WHERE table_name = 'alerts' AND operation = 'upsert'"
            ).fetchone()["c"]
        self.assertEqual(count, 1)

    def test_10_update_patient_null_name_rejected(self) -> None:
        patient_id = self._create_patient()
        response = self.client.put(f"/patients/{patient_id}", json={"name": None})
        self.assertEqual(response.status_code, 422)
        payload = response.json()
        self.assertFalse(payload["success"])
        self.assertEqual(payload["error"]["code"], "validation_error")


if __name__ == "__main__":
    unittest.main()
