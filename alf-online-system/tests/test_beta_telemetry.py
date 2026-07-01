import unittest
import os
import sys
import tempfile
import sqlite3
from pathlib import Path

# Ensure import paths work
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Mock the database path for settings so tests don't overwrite production data
import src.config.settings as settings
temp_db_dir = tempfile.TemporaryDirectory()
temp_db_path = Path(temp_db_dir.name) / "observability.db"
settings.BETA_DB_PATH = temp_db_path

from src.utils.beta_telemetry import (
    record_vad_event,
    record_stt_result,
    record_rag_result,
    record_structured_output,
    record_llm_latency,
    record_error,
    get_beta_summary,
    _get_conn
)

class TestBetaTelemetry(unittest.TestCase):
    def setUp(self):
        # Clear out connection and database file
        import src.utils.beta_telemetry as bt
        conn = _get_conn()
        try:
            conn.execute("DELETE FROM beta_sessions")
            conn.commit()
        except Exception:
            pass

    def tearDown(self):
        pass

    def test_database_creation(self):
        conn = _get_conn()
        self.assertIsNotNone(conn)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='beta_sessions'")
        table = cursor.fetchone()
        self.assertEqual(table[0], "beta_sessions")

    def test_full_pipeline_record(self):
        # 1. Record VAD Event
        record_vad_event(vad_method="silero", speech_detected=True, duration_ms=450.0)
        
        # 2. Record STT
        record_stt_result(latency_ms=120.0, text="يا رفيق", language="ar")
        
        # 3. Record RAG
        record_rag_result(chunks_returned=3, latency_ms=85.0)
        
        # 4. Record Structured Output Success
        record_structured_output(success=True, fallback_used=False)
        
        # 5. Record LLM Latency
        record_llm_latency(latency_ms=1500.0)
        
        # Get Summary
        summary = get_beta_summary()
        self.assertEqual(summary["total_sessions"], 1)
        self.assertEqual(summary["speech_detected"], 1)
        self.assertEqual(summary["no_speech_timeout"], 0)
        self.assertEqual(summary["stt_latency_avg_ms"], 120.0)
        self.assertEqual(summary["rag_queries"], 1)
        self.assertEqual(summary["rag_avg_chunks"], 3.0)
        self.assertEqual(summary["rag_avg_latency_ms"], 85.0)
        self.assertEqual(summary["structured_output_successes"], 1)
        self.assertEqual(summary["structured_output_failures"], 0)
        self.assertEqual(summary["fallback_parser_used"], 0)
        self.assertEqual(summary["llm_latency_avg_ms"], 1500.0)

    def test_multiple_sessions_and_failures(self):
        # Session 1: Success with RAG and Structured Output
        record_vad_event("silero", speech_detected=True, duration_ms=500.0)
        record_stt_result(150.0, "سجل الدواء", "ar")
        record_rag_result(2, 60.0)
        record_structured_output(success=False, fallback_used=True)
        record_llm_latency(1800.0)

        # Session 2: Silence / No Speech
        record_vad_event("silero", speech_detected=False, duration_ms=5000.0)

        # Session 3: Error
        record_vad_event("webrtcvad", speech_detected=True, duration_ms=300.0)
        record_stt_result(100.0, "خطأ", "ar")
        record_error("OpenAI Rate Limit Exceeded")

        # Verify Summary
        summary = get_beta_summary()
        self.assertEqual(summary["total_sessions"], 3)
        self.assertEqual(summary["speech_detected"], 2)
        self.assertEqual(summary["no_speech_timeout"], 1)
        self.assertEqual(summary["structured_output_failures"], 1)
        self.assertEqual(summary["fallback_parser_used"], 1)
        self.assertEqual(summary["error_count"], 1)
        self.assertEqual(summary["stt_latency_avg_ms"], 125.0) # (150 + 100) / 2

if __name__ == "__main__":
    unittest.main()
