# test_structured_outputs.py — Verification of Phase 1 SAFE Pydantic Schemas

import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.core.schemas import (
    MemoryFact,
    MemoryFactList,
    MedicationIntent,
    ReminderIntent,
    parse_memory_facts,
    parse_medication_intent,
    parse_reminder_intent,
    get_validation_metrics,
    STRUCTURED_OUTPUT_METRICS,
)


class TestStructuredOutputs(unittest.TestCase):

    def setUp(self):
        # Reset metrics
        STRUCTURED_OUTPUT_METRICS["validation_success_count"] = 0
        STRUCTURED_OUTPUT_METRICS["validation_failure_count"] = 0
        STRUCTURED_OUTPUT_METRICS["fallback_usage_count"] = 0

    def test_memory_fact_valid(self):
        valid_json = '{"facts": [{"category": "personal", "key": "name", "value": "Ahmad"}]}'
        res = parse_memory_facts(valid_json)
        self.assertIsNotNone(res)
        self.assertEqual(len(res["facts"]), 1)
        self.assertEqual(res["facts"][0]["category"], "personal")
        self.assertEqual(res["facts"][0]["key"], "name")
        self.assertEqual(res["facts"][0]["value"], "Ahmad")
        
        metrics = get_validation_metrics()
        self.assertEqual(metrics["validation_success_count"], 1)
        self.assertEqual(metrics["validation_failure_count"], 0)
        self.assertEqual(metrics["validation_success_rate"], 1.0)

    def test_memory_fact_invalid_fallback(self):
        # Invalid JSON with incorrect category structure (category is Literal)
        invalid_json = '{"facts": [{"category": "unknown_cat", "key": "name", "value": "Ahmad"}]}'
        # This will fail Pydantic validation and fall back to regex.
        # But wait, does regex (extract_json_from_text) succeed in parsing it as a dict?
        # Yes, regex just does json.loads. So it returns the dict.
        res = parse_memory_facts(invalid_json)
        self.assertIsNotNone(res)
        self.assertEqual(res["facts"][0]["category"], "unknown_cat")
        
        metrics = get_validation_metrics()
        self.assertEqual(metrics["validation_success_count"], 0)
        self.assertEqual(metrics["validation_failure_count"], 1)
        self.assertEqual(metrics["fallback_usage_count"], 1)
        self.assertEqual(metrics["validation_failure_rate"], 1.0)

    def test_medication_intent_valid_with_meal(self):
        valid_json = '{"med_name": "Aspirin", "condition": "heart", "dose": "1 pill", "time_str": "morning", "food_relation": "before_meal", "supply_info": "30 pills"}'
        res = parse_medication_intent(valid_json)
        self.assertIsNotNone(res)
        self.assertEqual(res["med_name"], "Aspirin")
        self.assertEqual(res["food_relation"], "before_meal")
        
        metrics = get_validation_metrics()
        self.assertEqual(metrics["validation_success_count"], 1)

    def test_medication_intent_valid_legacy_before(self):
        valid_json = '{"med_name": "Aspirin", "condition": "heart", "dose": "1 pill", "time_str": "morning", "food_relation": "before", "supply_info": "30 pills"}'
        res = parse_medication_intent(valid_json)
        self.assertIsNotNone(res)
        self.assertEqual(res["med_name"], "Aspirin")
        self.assertEqual(res["food_relation"], "before")

    def test_medication_intent_invalid_fallback(self):
        # Invalid food_relation value for MedicationIntent
        invalid_json = '{"med_name": "Aspirin", "food_relation": "invalid_food_value"}'
        res = parse_medication_intent(invalid_json)
        self.assertIsNotNone(res)
        self.assertEqual(res["food_relation"], "invalid_food_value")
        
        metrics = get_validation_metrics()
        self.assertEqual(metrics["validation_failure_count"], 1)
        self.assertEqual(metrics["fallback_usage_count"], 1)

    def test_reminder_intent_valid(self):
        valid_json = '{"title": "doctor appointment", "time_str": "tomorrow 5pm", "details": "bring test results"}'
        res = parse_reminder_intent(valid_json)
        self.assertIsNotNone(res)
        self.assertEqual(res["title"], "doctor appointment")
        self.assertEqual(res["time_str"], "tomorrow 5pm")
        
        metrics = get_validation_metrics()
        self.assertEqual(metrics["validation_success_count"], 1)

    def test_reminder_intent_partial_empty_title(self):
        # ReminderIntent has defaults so empty fields should pass validation
        valid_json = '{"title": "", "time_str": "tomorrow 5pm", "details": ""}'
        res = parse_reminder_intent(valid_json)
        self.assertIsNotNone(res)
        self.assertEqual(res["title"], "")
        self.assertEqual(res["time_str"], "tomorrow 5pm")
        
        metrics = get_validation_metrics()
        self.assertEqual(metrics["validation_success_count"], 1)
        self.assertEqual(metrics["validation_failure_count"], 0)

    def test_markdown_code_block_stripping(self):
        md_json = '```json\n{"title": "exam", "time_str": "9 AM", "details": "math"}\n```'
        res = parse_reminder_intent(md_json)
        self.assertIsNotNone(res)
        self.assertEqual(res["title"], "exam")
        
        metrics = get_validation_metrics()
        self.assertEqual(metrics["validation_success_count"], 1)

    def test_feature_flag_disabled(self):
        valid_json = '{"facts": [{"category": "personal", "key": "name", "value": "Ahmad"}]}'
        with patch("src.config.settings.ENABLE_STRUCTURED_OUTPUTS", False):
            res = parse_memory_facts(valid_json)
            self.assertIsNotNone(res)
            # Metrics should not change when flag is disabled
            metrics = get_validation_metrics()
            self.assertEqual(metrics["validation_success_count"], 0)
            self.assertEqual(metrics["validation_failure_count"], 0)


if __name__ == "__main__":
    unittest.main()
