"""
Rafiq v4.1 — Verification Test Suite
Tests ClinicalMemory, MedicalAgents (LangGraph), PromptOptimizer, TrainingCollector, MedicalNLP, and MotivationManager.
"""
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import unittest
from unittest.mock import patch, MagicMock
import logging
import datetime
import shutil
from src.database.clinical_memory import ClinicalMemory
from src.core.medical_nlp import MedicalTextProcessor
from src.services.training_collector import TrainingCollector

# Set up testing logs
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("rafiq.v4_test")

class TestRafiqV4(unittest.IsolatedAsyncioTestCase):
    
    def setUp(self):
        os.environ["RAFIQ_OFFLINE"] = "1"
        self.groq_key = os.environ.get("GROQ_API_KEY", "")
        self.test_chroma_path = "test_chroma_db_v4"
        
        def mock_init_chroma(db_self):
            db_self.vector_enabled = False
            db_self.vector_collection = None
            db_self.chroma_client = None
            
        self.chroma_patch = patch("src.database.db_operational.RafiqDB._init_chroma", mock_init_chroma)
        self.chroma_patch.start()
        
    def tearDown(self):
        self.chroma_patch.stop()
        # Clean up test directories if needed
        if os.path.exists(self.test_chroma_path):
            try:
                shutil.rmtree(self.test_chroma_path)
            except Exception:
                pass
        if os.path.exists("test_training_data.jsonl"):
            try:
                os.remove("test_training_data.jsonl")
            except Exception:
                pass
        if os.path.exists("test_rafiq_v4_1.db"):
            try:
                os.remove("test_rafiq_v4_1.db")
            except Exception:
                pass

    def test_medical_nlp_normalization(self):
        """Tests Arabic medical colloquial-to-formal normalization."""
        processor = MedicalTextProcessor()
        text = "المريض يشتكي من سكر وضغط"
        normalized = processor.normalize_arabic_medical(text)
        self.assertIn("داء السكري", normalized)
        self.assertIn("ارتفاع ضغط الدم", normalized)

    def test_medical_nlp_extraction(self):
        """Tests medication and symptom extraction."""
        processor = MedicalTextProcessor()
        text = "أخذت حبة بنادول وعندي صداع"
        entities = processor.extract_entities(text)
        self.assertIn("paracetamol", entities["drugs"])
        self.assertIn("صداع", entities["symptoms"])

    def test_medical_nlp_negation_fallback(self):
        """Tests simple regex negation fallback."""
        processor = MedicalTextProcessor()
        text = "لا يوجد صداع"
        negations = processor.check_negation(text)
        symptom_negated = False
        for neg in negations:
            if neg["text"] == "صداع" and neg["negated"] is True:
                symptom_negated = True
        self.assertTrue(symptom_negated)

    def test_training_collector(self):
        """Tests recording and counting doctor corrections."""
        collector = TrainingCollector(path="test_training_data.jsonl")
        self.assertEqual(collector.count_examples(), 0)
        
        collector.record_correction(
            query="عندي صداع ينفع أخد بنادول؟",
            original_answer="نعم بنادول مناسب.",
            corrected_answer="نعم بنادول مناسب لكن لا تزيد عن 4 جرام يومياً.",
            who_context="منظمة الصحة العالمية تنصح بحد أقصى للباراسيتامول.",
            doctor_id="doc_1"
        )
        
        self.assertEqual(collector.count_examples(), 1)
        dataset = collector.load_dataset()
        self.assertEqual(len(dataset), 1)
        self.assertEqual(dataset[0]["corrected_answer"], "نعم بنادول مناسب لكن لا تزيد عن 4 جرام يومياً.")

    def test_clinical_memory_init(self):
        """Tests initialization of Clinical Memory."""
        memory = ClinicalMemory(groq_api_key=self.groq_key, chroma_path=self.test_chroma_path)
        self.assertIsNotNone(memory)
        if not self.groq_key:
            log.info("Skipping live ClinicalMemory tests (GROQ_API_KEY not set).")

    async def test_clinical_memory_live(self):
        """Tests ClinicalMemory add/search with mocked Mem0 and Groq."""
        # Mock sys.modules for mem0 to avoid import errors if not installed, and mock Memory behavior
        mock_mem0 = MagicMock()
        mock_memory_class = MagicMock()
        mock_mem0.Memory = mock_memory_class
        
        mock_mem_instance = MagicMock()
        mock_memory_class.from_config.return_value = mock_mem_instance
        
        # Setup search response
        mock_mem_instance.search.return_value = [
            {"memory": "المريض يعاني من حساسية البنسلين"}
        ]
        
        with patch.dict("sys.modules", {"mem0": mock_mem0}), \
             patch.dict("os.environ", {"RAFIQ_ENABLE_CLINICAL_MEMORY": "1"}):
            memory = ClinicalMemory(groq_api_key="dummy_gsk_12345678901234567890", chroma_path=self.test_chroma_path)
            self.assertTrue(memory.enabled)
            
            # Test adding patient memories
            added = await memory.remember_patient_info("patient_123", "المريض يعاني من حساسية البنسلين")
            self.assertTrue(added)
            
            # Test search
            context = await memory.get_patient_context("patient_123", "حساسية")
            self.assertIn("حساسية البنسلين", context)

    def test_medical_agents_init(self):
        """Tests building the multi-agent graph."""
        from src.core.medical_agents import get_medical_graph, LANGGRAPH_AVAILABLE
        graph = get_medical_graph()
        if LANGGRAPH_AVAILABLE:
            self.assertIsNotNone(graph)
            log.info("Medical agents LangGraph successfully verified.")
        else:
            self.assertIsNone(graph)

    async def test_motivation_generation(self):
        """Tests that MotivationManager generates appropriate messages."""
        from src.services.motivation_manager import MotivationManager
        msg_sad = await MotivationManager.generate_message(
            med_name="بنادول", patient_name="أحمد", streak=0, mood="sad"
        )
        msg_happy = await MotivationManager.generate_message(
            med_name="بنادول", patient_name="أحمد", streak=5, mood="positive"
        )
        self.assertTrue(len(msg_sad) > 0)
        self.assertTrue(len(msg_happy) > 0)
        self.assertIn("أحمد", msg_sad)

    async def test_adaptive_scheduler_shift(self):
        """Tests delay calculation and shift suggestion."""
        from src.database.db_operational import RafiqDB
        from src.services.scheduler_service import ReminderScheduler
        db = await RafiqDB.create(path="test_rafiq_v4_1.db")
        scheduler = ReminderScheduler(db)
        
        # Setup dummy medication and events
        med_id = await db.add_medication({
            "patient_name": "أحمد", "med_name": "بنادول", "condition": "صداع",
            "dose": "حبة", "food_relation": "none", "time_str": "12:00",
            "total_doses": 10, "remaining_doses": 10, "is_chronic": 1, "notes": ""
        })
        
        # Record 3 delayed doses (1 hour late each)
        base = datetime.datetime.now()
        for i in range(3):
            sched_time = (base - datetime.timedelta(days=i, hours=1)).isoformat()
            taken_time = (base - datetime.timedelta(days=i)).isoformat()
            await db.conn.execute(
                "INSERT INTO dose_events (med_id, patient_name, taken_at, sched_time, used_snooze, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (med_id, "أحمد", taken_time, sched_time, 1, taken_time)
            )
        await db.conn.commit()
        
        # Mock active reminder to confirm
        reminder = {
            "med_id": med_id, "patient_name": "أحمد", "sched_time": base.isoformat(),
            "time_str": "12:00", "attempts": 1
        }
        scheduler.active = reminder
        
        # Create a dummy reminder record in database to update
        rid = await db.add_reminder(med_id, "أحمد", "موعد دواء أحمد", base)
        
        res = await scheduler.confirm(rid)
        self.assertIn("بالمناسبة، لاحظت إنك بتاخد جرعاتك متأخرة", res["shift_suggestion"])
        self.assertEqual(scheduler.pending_shift_minutes, 40)
        self.assertEqual(scheduler.pending_shift_med_id, med_id)
        
        await db.close()

    async def test_multi_hour_schedule(self):
        """Tests that interval schedules (e.g. every 8 hours) are correctly rescheduled."""
        from src.database.db_operational import RafiqDB
        from src.services.scheduler_service import ReminderScheduler
        db = await RafiqDB.create(path="test_rafiq_v4_1.db")
        scheduler = ReminderScheduler(db)
        
        med_id = await db.add_medication({
            "patient_name": "أحمد", "med_name": "بنادول", "condition": "صداع",
            "dose": "حبة", "food_relation": "none", "time_str": "كل 8 ساعات",
            "total_doses": 10, "remaining_doses": 10, "is_chronic": 1, "notes": ""
        })
        
        base = (datetime.datetime.now() + datetime.timedelta(hours=2)).replace(microsecond=0)
        reminder = {
            "med_id": med_id, "patient_name": "أحمد", "sched_time": base.isoformat(),
            "time_str": "كل 8 ساعات", "attempts": 0
        }
        scheduler.active = reminder
        
        rid = await db.add_reminder(med_id, "أحمد", "موعد دواء أحمد", base)
        await scheduler.confirm(rid)
        
        # Next reminder should be scheduled in 8 hours (same day at 20:00:00)
        row = await db._fetchone(
            "SELECT sched_time FROM reminders WHERE med_id=? AND status='pending'",
            (med_id,)
        )
        self.assertIsNotNone(row)
        expected_time = (base + datetime.timedelta(hours=8)).isoformat()
        self.assertEqual(row["sched_time"], expected_time)
        
        await db.close()

    def test_medical_knowledge_graph(self):
        """Tests that MedicalKnowledgeGraph correctly loads and queries clinical relations."""
        from src.database.medical_knowledge_graph import MedicalKnowledgeGraph
        mkg = MedicalKnowledgeGraph()
        # Test direct relations retrieval
        facts = mkg.get_related_facts("داء السكري")
        self.assertTrue(len(facts) > 0)
        
        # Test full context query with user text
        context = mkg.get_medical_context("عندي سكر وأريد الكورتيزون")
        self.assertIn("الكورتيزون", context)
        self.assertIn("داء السكري", context)

    def test_arabic_medical_ner(self):
        """Tests that ArabicMedicalNER extracts entities using either model or dictionary fallback."""
        from src.core.medical_ner import extract_medical_entities
        text = "أخذت حبة بنادول وعندي صداع خفيف"
        entities = extract_medical_entities(text)
        self.assertIn("بنادول", entities["أدوية"])
        self.assertIn("صداع", entities["أعراض"])

    def test_voice_emotion_detection(self):
        """Tests that VoiceEmotionDetector returns the expected format, falling back to neutral."""
        from src.services.voice_emotion import EmotionDetector
        detector = EmotionDetector()
        res = detector.detect("non_existent_file.wav")
        self.assertEqual(res["emotion"], "neutral")
        self.assertEqual(res["confidence"], 1.0)

if __name__ == "__main__":
    unittest.main()
