# test_privacy_leakage.py — Automated Privacy location de-identification and re-identification test
# Updated (Step 1.5): All tests now use explicit session_id; removed reliance on deprecated _dyn_loc_map property.

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import unittest
from src.core import privacy

# Fixed session IDs for tests — each test uses its own session to avoid interference
_SESSION_STATIC = "test_static_loc"
_SESSION_DYNAMIC = "test_dynamic_loc"
_SESSION_EXCLUSION = "test_exclusion"

class TestPrivacyLeakage(unittest.TestCase):
    def setUp(self):
        self.original_disable_privacy = os.environ.get("RAFIQ_DISABLE_PRIVACY")
        os.environ["RAFIQ_DISABLE_PRIVACY"] = "0"
        self.pseudonymizer = privacy.get_pseudonymizer()
        # Reset each test session's dynamic location maps directly via _get_session
        for sess_id in [_SESSION_STATIC, _SESSION_DYNAMIC, _SESSION_EXCLUSION]:
            sess = self.pseudonymizer._get_session(sess_id)
            sess["dyn_loc_map"].clear()
            sess["reverse_dyn_loc_map"].clear()
            sess["name_map"].clear()
            sess["reverse_name_map"].clear()

    def tearDown(self):
        if self.original_disable_privacy is not None:
            os.environ["RAFIQ_DISABLE_PRIVACY"] = self.original_disable_privacy
        else:
            os.environ.pop("RAFIQ_DISABLE_PRIVACY", None)


    def test_static_location_mapping(self):
        # Riyadh should be pseudonymized to Dammam and re-identified back to Riyadh
        original = "أنا أعيش في الرياض"
        deidentified = privacy.deidentify_text(original, session_id=_SESSION_STATIC)
        self.assertNotIn("الرياض", deidentified)
        self.assertIn("الدمام", deidentified)

        reidentified = privacy.reidentify_text(deidentified, session_id=_SESSION_STATIC)
        self.assertIn("الرياض", reidentified)
        self.assertNotIn("الدمام", reidentified)

    def test_dynamic_location_mapping(self):
        # Arbitrary city (حلب) should be de-identified using a dynamic pseudonym and re-identified back
        original = "سافرت من حلب إلى دمشق أمس"
        deidentified = privacy.deidentify_text(original, session_id=_SESSION_DYNAMIC)
        
        self.assertNotIn("حلب", deidentified)
        self.assertNotIn("دمشق", deidentified)
        
        # Verify that dynamic pseudonyms were registered — access session directly (not via deprecated property)
        sess = self.pseudonymizer._get_session(_SESSION_DYNAMIC)
        self.assertTrue(len(sess["dyn_loc_map"]) >= 2,
                        f"Expected >=2 dynamic mappings, got: {sess['dyn_loc_map']}")

        reidentified = privacy.reidentify_text(deidentified, session_id=_SESSION_DYNAMIC)
        self.assertIn("حلب", reidentified)
        self.assertIn("دمشق", reidentified)
        self.assertEqual(original, reidentified)

    def test_exclusion_rules(self):
        # Stopwords or exclusions (like 'الطبيب' or 'المستشفى') should NOT be de-identified as locations
        original = "ذهبت إلى المستشفى لمقابلة الطبيب في الصباح"
        deidentified = privacy.deidentify_text(original, session_id=_SESSION_EXCLUSION)
        self.assertIn("المستشفى", deidentified)
        self.assertIn("الطبيب", deidentified)
        
        reidentified = privacy.reidentify_text(deidentified, session_id=_SESSION_EXCLUSION)
        self.assertEqual(original, reidentified)

    def test_session_isolation(self):
        # Test that two different sessions have isolated pseudonym mappings
        text_a = "سافرت من حلب إلى دمشق"
        
        deidentified_a = privacy.deidentify_text(text_a, session_id="session_A")
        
        # Verify both were de-identified
        self.assertNotIn("حلب", deidentified_a)
        self.assertNotIn("دمشق", deidentified_a)
        
        # Verify that their reverse mappings are isolated: session_B (unused) cannot reidentify session_A's deidentified text
        reidentified_a_with_b = privacy.reidentify_text(deidentified_a, session_id="session_B")
        self.assertNotIn("حلب", reidentified_a_with_b)
        self.assertNotIn("دمشق", reidentified_a_with_b)
        
        # Reidentifying with correct sessions must work perfectly
        self.assertEqual(text_a, privacy.reidentify_text(deidentified_a, session_id="session_A"))

    def test_conv_engine_session_isolation(self):
        from unittest.mock import patch, AsyncMock
        from src.services.conv_processor import ConvEngine
        
        class DummyDB:
            async def get_patient_name(self): return "أحمد"
            async def get_relevant_facts_text(self, text): return ""
            async def get_history(self, limit): return []
            async def save_msg(self, role, content): pass
            async def get_patient_id(self): return "1"
        
        class DummyScheduler:
            active = None
            pending_shift_minutes = 0
            pending_shift_med_id = 0
        
        db = DummyDB()
        sched = DummyScheduler()
        
        import asyncio
        
        async def run_test():
            engine = ConvEngine(db, sched)
            
            with patch("src.services.conv_processor.llm", new_callable=AsyncMock) as mock_llm, \
                 patch("src.services.conv_processor.llm_stream", new_callable=AsyncMock) as mock_llm_stream:
                mock_llm.return_value = "أهلاً بك! أنا رفيق المساعد الطبي."
                
                # Use a general non-medical query to force general LLM path
                await engine.process("أهلاً أنا اسمي خالد عمر وأعيش في الرياض، كيف حالك اليوم وما هو طقس اليوم؟", session_id="session_A")
                
                self.assertTrue(mock_llm.called or mock_llm_stream.called)
                
                # Check that session A and session B session objects are different
                sess_a = privacy.get_pseudonymizer()._get_session("session_A")
                sess_b = privacy.get_pseudonymizer()._get_session("session_B")
                self.assertIsNot(sess_a, sess_b)
                
        asyncio.run(run_test())

if __name__ == "__main__":
    unittest.main()

