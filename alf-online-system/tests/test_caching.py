# test_caching.py — Automated Unit Tests for Phase 3 SQLite Caching System

import os
import sys
import time
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.services.cache_service import CacheManager, CACHE_METRICS
from src.services.who_rag import get_embedding, WhoRAG, WHOChunk, WHORagBundle


def safe_rmtree(path):
    import gc
    gc.collect()
    if os.path.exists(path):
        import shutil
        try:
            shutil.rmtree(path)
        except Exception:
            import time
            time.sleep(0.1)
            try:
                shutil.rmtree(path)
            except Exception:
                pass

class TestCachingSystem(unittest.TestCase):

    def setUp(self):
        # Clean up database file for isolation
        self.test_cache_db = Path("test_cache_store.db")
        # Overwrite CACHE_DB_PATH dynamically in CacheManager
        patcher = patch("src.services.cache_service.CACHE_DB_PATH", self.test_cache_db)
        self.mock_db_path = patcher.start()
        self.addCleanup(patcher.stop)
        
        # Reset connections and metrics
        CacheManager._conn = None
        CacheManager.reset_metrics()
        
        # Enable caching globally for tests
        self.flag_patch = patch("src.config.settings.ENABLE_CACHING", True)
        self.flag_patch.start()
        self.addCleanup(self.flag_patch.stop)

    def tearDown(self):
        # Close connection and remove test file
        if CacheManager._conn:
            CacheManager._conn.close()
            CacheManager._conn = None
            
        # Delete DB file and its WAL helpers
        for suffix in ["", "-wal", "-shm"]:
            f = Path(f"{self.test_cache_db}{suffix}")
            if f.exists():
                try:
                    f.unlink()
                except Exception:
                    pass

    def test_cache_set_get_metrics(self):
        # Cache Miss
        val = CacheManager.get("test_key")
        self.assertIsNone(val)
        
        # Cache Set
        CacheManager.set("test_key", {"data": "hello"}, ttl_seconds=10)
        
        # Cache Hit
        val = CacheManager.get("test_key")
        self.assertIsNotNone(val)
        self.assertEqual(val["data"], "hello")
        
        # Verify Metrics
        metrics = CacheManager.get_metrics()
        self.assertEqual(metrics["hits"], 1)
        self.assertEqual(metrics["misses"], 1)
        self.assertEqual(metrics["hit_rate"], 0.5)

    def test_cache_expiration(self):
        # Set with 1s TTL
        CacheManager.set("expire_key", "value", ttl_seconds=1)
        
        # Check immediately (Hit)
        self.assertEqual(CacheManager.get("expire_key"), "value")
        
        # Sleep to let it expire
        time.sleep(1.1)
        
        # Check after 1s (Miss / Expired)
        self.assertIsNone(CacheManager.get("expire_key"))

    def test_embedding_caching(self):
        # First call (Miss)
        # Mock get_embed_model to return a dummy model or bypass
        with patch("src.services.who_rag.get_embed_model", return_value=None):
            # Run get_embedding
            vec1 = get_embedding("clinical_text")
            
            # Second call (Hit)
            metrics_before = CacheManager.get_metrics()
            vec2 = get_embedding("clinical_text")
            metrics_after = CacheManager.get_metrics()
            
            self.assertEqual(vec1, vec2)
            self.assertEqual(metrics_after["hits"], metrics_before["hits"] + 1)

    @patch("src.services.llm_client.GLOBAL_LLM_CLIENT.generate")
    def test_reframing_caching(self, mock_generate):
        mock_generate.return_value = "clinical keywords output"
        rag = WhoRAG(cache_dir=Path("test_who_rag_dummy"))
        self.addCleanup(lambda: safe_rmtree("test_who_rag_dummy"))
        
        # Seed keys
        with patch.dict(os.environ, {"GROQ_API_KEY": "mock", "GOOGLE_API_KEY": "mock"}):
            # First call (Miss + LLM call)
            res1 = rag.reframe_query_sync("colloquial text")
            self.assertEqual(res1, "clinical keywords output")
            mock_generate.assert_called_once()
            
            # Second call (Hit - no LLM call)
            mock_generate.reset_mock()
            res2 = rag.reframe_query_sync("colloquial text")
            self.assertEqual(res2, "clinical keywords output")
            mock_generate.assert_not_called()

    def test_retrieval_bundle_caching(self):
        rag = WhoRAG(cache_dir=Path("test_who_rag_dummy2"))
        self.addCleanup(lambda: safe_rmtree("test_who_rag_dummy2"))
        
        # Mock retrieve_semantic
        mock_bundle = WHORagBundle(
            query="patient query",
            chunks=[
                WHOChunk(chunk_id="chunk1", title="WHO guidelines", url="http://who.int", text="some guidelines")
            ],
            built_from_cache=True
        )
        rag.retrieve_semantic = MagicMock(return_value=mock_bundle)
        
        # Disable reframing to isolate retrieval caching
        with patch("src.config.settings.ENABLE_ADDREP_RAG", False):
            # First retrieval (Miss + calls semantic search)
            bundle1 = rag.retrieve("patient query", top_k=2)
            self.assertEqual(len(bundle1.chunks), 1)
            rag.retrieve_semantic.assert_called_once()
            
            # Second retrieval (Hit - directly from cache)
            rag.retrieve_semantic.reset_mock()
            bundle2 = rag.retrieve("patient query", top_k=2)
            self.assertEqual(len(bundle2.chunks), 1)
            self.assertEqual(bundle1.chunks[0].chunk_id, bundle2.chunks[0].chunk_id)
            rag.retrieve_semantic.assert_not_called()

    def test_caching_disabled_flag(self):
        # Disable caching
        with patch("src.config.settings.ENABLE_CACHING", False):
            CacheManager.set("disabled_key", "value", ttl_seconds=10)
            self.assertIsNone(CacheManager.get("disabled_key"))
            
            metrics = CacheManager.get_metrics()
            self.assertEqual(metrics["hits"], 0)
            self.assertEqual(metrics["misses"], 0)


if __name__ == "__main__":
    unittest.main()
