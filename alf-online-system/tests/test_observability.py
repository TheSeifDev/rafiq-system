# test_observability.py — Automated Unit Tests for Phase 5 Observability & Logging

import io
import os
import sys
import json
import logging
import unittest
import sqlite3
import time
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import src.utils.observability as obs
from src.utils.observability import (
    request_id_var,
    session_id_var,
    setup_structured_logging,
    log_latency,
    log_cache_event,
    log_exception,
    measure_latency,
    generate_daily_report,
)

class TestObservabilitySubsystem(unittest.TestCase):

    def setUp(self):
        # Setup clean isolated test database path
        self.test_db = Path("test_observability_store.db")
        if self.test_db.exists():
            self.test_db.unlink()
            
        # Patch OBS_DB_PATH
        patcher = patch("src.utils.observability.OBS_DB_PATH", self.test_db)
        self.mock_db_path = patcher.start()
        self.addCleanup(patcher.stop)
        
        # Reset context variables
        request_id_var.set("-")
        session_id_var.set("-")
        
        # Reset database connection
        obs._db_conn = None

    def tearDown(self):
        # Close internal connection
        if obs._db_conn:
            obs._db_conn.close()
            obs._db_conn = None
            
        # Clean up database files
        for suffix in ["", "-wal", "-shm"]:
            f = Path(f"{self.test_db}{suffix}")
            if f.exists():
                try:
                    f.unlink()
                except Exception:
                    pass

    def test_json_logging_format(self):
        # Capturing stdout log output
        log_capture = io.StringIO()
        logger = logging.getLogger("test_json_logger")
        
        # Setup custom handler for capturing
        handler = logging.StreamHandler(log_capture)
        handler.setFormatter(obs.JSONFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False
        
        # Set context vars
        request_id_var.set("test_req_123")
        session_id_var.set("test_sess_456")
        
        # Write log
        logger.info("Test message for JSON logging validation.")
        
        log_output = log_capture.getvalue().strip()
        parsed = json.loads(log_output)
        
        # Assertions on JSON structure
        self.assertEqual(parsed["level"], "INFO")
        self.assertEqual(parsed["logger"], "test_json_logger")
        self.assertEqual(parsed["message"], "Test message for JSON logging validation.")
        self.assertEqual(parsed["request_id"], "test_req_123")
        self.assertEqual(parsed["session_id"], "test_sess_456")
        self.assertIn("timestamp", parsed)

    def test_latency_logging_and_db_persistence(self):
        log_latency("llm", 124.5, {"model": "llama3"})
        
        # Query test DB to check persistence
        db = obs.get_obs_db()
        cursor = db.cursor()
        cursor.execute("SELECT metric_type, latency_ms, extra_info FROM latency_metrics")
        row = cursor.fetchone()
        
        self.assertIsNotNone(row)
        self.assertEqual(row[0], "llm")
        self.assertEqual(row[1], 124.5)
        self.assertEqual(json.loads(row[2])["model"], "llama3")

    def test_cache_metrics_logging(self):
        log_cache_event("who_retrieve", "hit", "who_retrieve:query_term:4")
        
        db = obs.get_obs_db()
        cursor = db.cursor()
        cursor.execute("SELECT metric_type, hit_or_miss, cache_key FROM cache_metrics")
        row = cursor.fetchone()
        
        self.assertIsNotNone(row)
        self.assertEqual(row[0], "who_retrieve")
        self.assertEqual(row[1], "hit")
        self.assertEqual(row[2], "who_retrieve:query_term:4")

    def test_exception_logging_and_aggregation(self):
        try:
            raise ValueError("Test value error for observability.")
        except ValueError as e:
            log_exception(e, context="unit_test_verification")
            
        db = obs.get_obs_db()
        cursor = db.cursor()
        cursor.execute("SELECT error_class, error_message, context FROM error_logs")
        row = cursor.fetchone()
        
        self.assertIsNotNone(row)
        self.assertEqual(row[0], "ValueError")
        self.assertEqual(row[1], "Test value error for observability.")
        self.assertEqual(row[2], "unit_test_verification")

    def test_measure_latency_context_manager(self):
        with measure_latency("tts", {"voice": "Ava"}):
            time.sleep(0.05)  # Simulate small delay
            
        db = obs.get_obs_db()
        cursor = db.cursor()
        cursor.execute("SELECT metric_type, latency_ms FROM latency_metrics")
        row = cursor.fetchone()
        
        self.assertIsNotNone(row)
        self.assertEqual(row[0], "tts")
        self.assertTrue(row[1] >= 45.0)

    def test_daily_report_generation(self):
        # Seed dummy metric data in DB
        log_latency("llm", 150.0, {"provider": "groq"})
        log_latency("llm", 250.0, {"provider": "groq"})
        log_latency("stt", 80.0, {"model": "whisper"})
        
        log_cache_event("embed", "hit", "embed_key_1")
        log_cache_event("embed", "miss", "embed_key_2")
        
        try:
            raise KeyError("Missing model configuration.")
        except KeyError as e:
            log_exception(e, context="startup_init")
            
        # Generate Report
        report = generate_daily_report()
        
        # Verify markdown contents
        self.assertIn("# 📊 Rafiq Daily System Metrics Summary Report", report)
        self.assertIn("## ⏱️ Subsystem Latency Metrics", report)
        self.assertIn("## 💾 Cache Hit / Miss Ratios", report)
        self.assertIn("## ⚠️ Aggregated Error Logs", report)
        
        # Verify specific calculations
        self.assertIn("LLM", report)
        self.assertIn("200.00 ms", report)  # Average (150+250)/2
        self.assertIn("50.0%", report)      # Cache hit rate (1 hit, 1 miss)
        self.assertIn("KeyError", report)
        self.assertIn("startup_init", report)

if __name__ == "__main__":
    unittest.main()
