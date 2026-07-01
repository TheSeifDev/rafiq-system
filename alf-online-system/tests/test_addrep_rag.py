# test_addrep_rag.py — Automated Unit Tests for AddRep RAG Query Reframer

import os
import sys
import asyncio
import unittest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pathlib import Path
from src.services.who_rag import WhoRAG
from src.config.settings import ENABLE_ADDREP_RAG


class TestAddRepRAG(unittest.TestCase):

    def setUp(self):
        # We need a dummy directory to initialize WhoRAG
        self.dummy_cache_dir = "test_who_rag_cache"
        self.rag = WhoRAG(cache_dir=Path(self.dummy_cache_dir))
        
        # Ensure API keys are mocked as present to allow reframing logic to proceed
        self.os_env_patch = patch.dict(os.environ, {
            "GROQ_API_KEY": "dummy_groq_key_12345",
            "GOOGLE_API_KEY": "dummy_google_key_12345",
            "RAFIQ_ADDREP_RAG": "1"
        })
        self.os_env_patch.start()
        
        self.caching_patch = patch("src.config.settings.ENABLE_CACHING", False)
        self.caching_patch.start()

    def tearDown(self):
        self.caching_patch.stop()
        self.os_env_patch.stop()
        # Release reference to WhoRAG client to close file locks
        self.rag = None
        import gc
        gc.collect()
        # Clean up dummy index directory
        import shutil
        if os.path.exists(self.dummy_cache_dir):
            try:
                shutil.rmtree(self.dummy_cache_dir)
            except Exception:
                pass

    @patch("src.services.llm_client.GLOBAL_LLM_CLIENT.generate")
    def test_reframe_query_success(self, mock_generate):
        # Setup mock return value for LLM reframing
        mock_generate.return_value = "صداع شديد دوخة غثيان severe headache dizziness nausea"
        
        dialect_query = "راسي عم يوجعني كتير وحاسس بدوخة ولعيان نفس"
        reframed = self.rag.reframe_query_sync(dialect_query)
        
        self.assertEqual(reframed, "صداع شديد دوخة غثيان severe headache dizziness nausea")
        mock_generate.assert_called_once()

    @patch("src.services.llm_client.GLOBAL_LLM_CLIENT.generate")
    def test_reframe_query_timeout(self, mock_generate):
        # Mock LLM generation to simulate high latency by sleeping longer than the 1.5s timeout
        async def slow_generate(*args, **kwargs):
            await asyncio.sleep(2.0)
            return "too late"
            
        mock_generate.side_effect = slow_generate
        
        dialect_query = "عندي وجع ببطني"
        # Since it times out (>1.5s), it should safely return the original query
        reframed = self.rag.reframe_query_sync(dialect_query)
        self.assertEqual(reframed, dialect_query)

    @patch("src.services.llm_client.GLOBAL_LLM_CLIENT.generate")
    def test_reframe_query_api_error(self, mock_generate):
        # Mock LLM generation to raise an exception
        mock_generate.side_effect = Exception("API rate limit exceeded")
        
        dialect_query = "عندي وجع ببطني"
        # It should catch the error and safely return the original query
        reframed = self.rag.reframe_query_sync(dialect_query)
        self.assertEqual(reframed, dialect_query)

    def test_feature_flag_disabled(self):
        # Disable feature flag via environment variable patching
        with patch("src.config.settings.ENABLE_ADDREP_RAG", False):
            # Even if RAG has collections, retrieve should skip reframing
            # Let's mock reframe_query_sync to see if it is bypassed
            self.rag.reframe_query_sync = MagicMock(return_value="reframed_term")
            
            # Mock retrieve_semantic
            mock_bundle = MagicMock()
            mock_bundle.found = True
            mock_bundle.chunks = []
            mock_bundle.built_from_cache = True
            self.rag.retrieve_semantic = MagicMock(return_value=mock_bundle)
            
            dialect_query = "عندي حرقان بالمعدة"
            self.rag.retrieve(dialect_query)
            
            # reframe_query_sync should not have been called because flag is disabled
            self.rag.reframe_query_sync.assert_not_called()
            # retrieve_semantic should be called with original query
            self.rag.retrieve_semantic.assert_called_once_with(dialect_query, top_k=4)

    @patch("src.services.llm_client.GLOBAL_LLM_CLIENT.generate")
    def test_feature_flag_enabled(self, mock_generate):
        mock_generate.return_value = "حموضة胃 acid reflux"
        
        with patch("src.config.settings.ENABLE_ADDREP_RAG", True):
            # Mock retrieve_semantic
            mock_bundle = MagicMock()
            mock_bundle.found = True
            mock_bundle.chunks = []
            mock_bundle.built_from_cache = True
            self.rag.retrieve_semantic = MagicMock(return_value=mock_bundle)
            
            dialect_query = "عندي حرقان بالمعدة"
            self.rag.retrieve(dialect_query)
            
            # retrieve_semantic should be called with reframed query
            self.rag.retrieve_semantic.assert_called_once_with("حموضة胃 acid reflux", top_k=4)


if __name__ == "__main__":
    unittest.main()
