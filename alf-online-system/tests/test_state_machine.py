# tests/test_state_machine.py — Automated Unit Tests for Sprint 2A State Machine

import os
import sys
import asyncio
import unittest
import tempfile
import shutil
from pathlib import Path
from unittest.mock import patch, MagicMock

# Ensure import paths work
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from src.database.db_operational import RafiqDB
from src.config.settings import STATE_DISABLED, STATE_PASSIVE, STATE_LOCKED
from fastapi.testclient import TestClient

class TestStateMachine(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        os.environ["RAFIQ_OFFLINE"] = "1"
        self.test_db_path = "test_state_machine_db.db"
        
        def mock_init_chroma(db_self):
            db_self.vector_enabled = False
            db_self.vector_collection = None
            db_self.chroma_client = None
            
        self.chroma_patch = patch("src.database.db_operational.RafiqDB._init_chroma", mock_init_chroma)
        self.chroma_patch.start()
        
        import sys
        if "src.gui_bridge" in sys.modules:
            sys.modules["src.gui_bridge"].db = None
        import gc
        gc.collect()
        if os.path.exists(self.test_db_path):
            try:
                shutil.rmtree(self.test_db_path)
            except Exception:
                pass

    def tearDown(self):
        self.chroma_patch.stop()
        import sys
        if "src.gui_bridge" in sys.modules:
            sys.modules["src.gui_bridge"].db = None
        import gc
        gc.collect()
        if os.path.exists(self.test_db_path):
            try:
                shutil.rmtree(self.test_db_path)
            except Exception as e:
                print(f"FAILED TO DELETE STATE MACHINE DB: {e}")

    async def test_database_state_persistence(self):
        # Initialize database
        db = await RafiqDB.create(path=self.test_db_path)
        
        # Initial state should default to PASSIVE
        initial = await db.get_assistant_state()
        self.assertEqual(initial, "PASSIVE")

        # Update to DISABLED
        await db.update_assistant_state("DISABLED")
        state = await db.get_assistant_state()
        self.assertEqual(state, "DISABLED")

        # Update to LOCKED
        await db.update_assistant_state("LOCKED")
        state = await db.get_assistant_state()
        self.assertEqual(state, "LOCKED")

        await db.close()

    async def test_api_rejection_when_disabled_or_locked(self):
        # Initialize database
        db = await RafiqDB.create(path=self.test_db_path)
        
        # Import gui_bridge app to test FastAPI endpoints
        import src.gui_bridge as gui_bridge
        
        # Mock database inside gui_bridge with our test database
        gui_bridge.db = db
        gui_bridge.scheduler = MagicMock()
        gui_bridge.engine = MagicMock()
        
        # Setup TestClient for app_api
        client = TestClient(gui_bridge.app_api)

        # 1. State: PASSIVE (Should allow requests, mock processing)
        await db.update_assistant_state("PASSIVE")
        with patch("src.gui_bridge.process_chat_background") as mock_background:
            response = client.post("/chat", json={"text": "مرحباً"}, headers={"X-API-Key": gui_bridge.BRIDGE_KEY})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["status"], "ok")
            mock_background.assert_called_once()

        # 2. State: DISABLED (Should reject requests with Arabic message)
        await db.update_assistant_state("DISABLED")
        response = client.post("/chat", json={"text": "مرحباً"}, headers={"X-API-Key": gui_bridge.BRIDGE_KEY})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "error")
        self.assertIn("معطل", response.json()["message"])

        # 3. State: LOCKED (Should reject requests with PIN lock message)
        await db.update_assistant_state("LOCKED")
        response = client.post("/chat", json={"text": "مرحباً"}, headers={"X-API-Key": gui_bridge.BRIDGE_KEY})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "error")
        self.assertIn("PIN", response.json()["message"])

        # Test toggle endpoint
        await db.update_assistant_state("PASSIVE")
        response = client.post("/assistant/toggle", headers={"X-API-Key": gui_bridge.BRIDGE_KEY})
        self.assertEqual(response.json()["assistant_state"], "DISABLED")
        
        # Toggle back
        response = client.post("/assistant/toggle", headers={"X-API-Key": gui_bridge.BRIDGE_KEY})
        self.assertEqual(response.json()["assistant_state"], "PASSIVE")

        await db.close()

if __name__ == "__main__":
    unittest.main()
