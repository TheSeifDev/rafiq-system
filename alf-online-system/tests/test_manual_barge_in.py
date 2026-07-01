# tests/test_manual_barge_in.py — Automated Unit Tests for Manual Barge-In

import os
import sys
import asyncio
import unittest
import shutil
from pathlib import Path
from unittest.mock import patch, MagicMock

# Ensure import paths work
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from src.database.db_operational import RafiqDB
from fastapi.testclient import TestClient

class TestManualBargeIn(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        os.environ["RAFIQ_OFFLINE"] = "1"
        self.test_db_path = "test_barge_in_db.db"
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

    async def test_manual_barge_in_endpoint(self):
        # Initialize database
        db = await RafiqDB.create(path=self.test_db_path)
        
        # Import gui_bridge app to test FastAPI endpoints
        import src.gui_bridge as gui_bridge
        
        # Mock database, scheduler, engine
        gui_bridge.db = db
        gui_bridge.scheduler = MagicMock()
        gui_bridge.engine = MagicMock()
        
        # Setup TestClient for app_api
        client = TestClient(gui_bridge.app_api)

        # Ensure starting state is PASSIVE
        await db.update_assistant_state("PASSIVE")

        # Mock tts_service stop_current_speech and clear_queue
        with patch("src.services.tts_service.stop_current_speech") as mock_stop, \
             patch("src.services.tts_service.clear_queue") as mock_clear:
             
            # Call barge_in endpoint
            response = client.post("/assistant/barge_in", headers={"X-API-Key": gui_bridge.BRIDGE_KEY})
            
            # Assert response is successful
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["status"], "ok")
            self.assertEqual(response.json()["assistant_state"], "LISTENING")

            # Assert tts methods were called (stops active speech and clears queue)
            mock_stop.assert_called_once()
            mock_clear.assert_called_once()

            # Assert state in DB updated to LISTENING
            state = await db.get_assistant_state()
            self.assertEqual(state, "LISTENING")

        await db.close()

if __name__ == "__main__":
    unittest.main()
