# benchmark_caching.py — Phase 3 Caching Performance Benchmark

import os
import sys
import time
import shutil
import asyncio
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.services.cache_service import CacheManager
from src.services.who_rag import WhoRAG, WHOChunk, WHORagBundle, get_embedding

def safe_rmtree(path):
    if os.path.exists(path):
        try:
            shutil.rmtree(path)
        except Exception:
            pass

async def run_benchmark():
    print("=========================================================")
    print("⚡ PHASE 3: CACHING SYSTEM PERFORMANCE BENCHMARK")
    print("=========================================================")

    # Setup isolated benchmark database
    bench_db = Path("benchmark_cache_store.db")
    if bench_db.exists():
        bench_db.unlink()
    for suffix in ["-wal", "-shm"]:
        f = Path(f"benchmark_cache_store.db{suffix}")
        if f.exists():
            f.unlink()

    # Dynamically patch CACHE_DB_PATH
    import src.services.cache_service
    src.services.cache_service.CACHE_DB_PATH = bench_db

    # Clean cache connection & metrics
    CacheManager._conn = None
    CacheManager.reset_metrics()

    # Enable caching globally
    import src.config.settings
    src.config.settings.ENABLE_CACHING = True

    # 1. Initialize WHO RAG with dummy cache directory
    dummy_rag_dir = Path("tests/fixtures/who_rag")
    safe_rmtree(dummy_rag_dir)
    rag = WhoRAG(cache_dir=dummy_rag_dir)

    print("\n[Setup] Isolated benchmark DB initialized.")

    # ---------------------------------------------------------
    # Layer 1: Embedding Request Caching
    # ---------------------------------------------------------
    print("\n--- Layer 1: Embedding Generation Caching ---")
    test_text = "clinical guidelines for diabetes management and symptoms"
    
    # Measure first run (Cache Miss / Generation)
    # Mock get_embed_model to simulate moderate local embedding generation delay
    def mock_encode(text):
        time.sleep(0.150)  # Simulate 150ms embedding generation latency
        return [0.1] * 1024

    mock_model = MagicMock()
    mock_model.encode.side_effect = mock_encode

    with patch("src.services.who_rag.get_embed_model", return_value=mock_model):
        start = time.time()
        vec1 = get_embedding(test_text)
        miss_latency_embed = (time.time() - start) * 1000

        # Measure second run (Cache Hit)
        start = time.time()
        vec2 = get_embedding(test_text)
        hit_latency_embed = (time.time() - start) * 1000

    print(f"   - Cache Miss Latency: {miss_latency_embed:.2f} ms")
    print(f"   - Cache Hit Latency:  {hit_latency_embed:.2f} ms")
    print(f"   - Speedup:            {miss_latency_embed / max(0.001, hit_latency_embed):.1f}x")

    # ---------------------------------------------------------
    # Layer 2: AddRep Query Reframing Caching
    # ---------------------------------------------------------
    print("\n--- Layer 2: AddRep Query Reframing Caching ---")
    dialect_query = "عندي وجع بصدري وضيق نفس شديد"
    reframed_val = "ألم في الصدر ضيق التنفس chest pain dyspnea"

    async def mock_generate(*args, **kwargs):
        await asyncio.sleep(0.350)  # Simulate 350ms LLM round-trip latency
        return reframed_val

    # First run (Cache Miss / LLM call)
    with patch("src.services.llm_client.GLOBAL_LLM_CLIENT.generate", side_effect=mock_generate):
        start = time.time()
        res1 = rag.reframe_query_sync(dialect_query)
        miss_latency_reframe = (time.time() - start) * 1000

        # Second run (Cache Hit)
        start = time.time()
        res2 = rag.reframe_query_sync(dialect_query)
        hit_latency_reframe = (time.time() - start) * 1000

    print(f"   - Cache Miss Latency: {miss_latency_reframe:.2f} ms")
    print(f"   - Cache Hit Latency:  {hit_latency_reframe:.2f} ms")
    print(f"   - Speedup:            {miss_latency_reframe / max(0.001, hit_latency_reframe):.1f}x")

    # ---------------------------------------------------------
    # Layer 3: WHO Retrieval Results Caching
    # ---------------------------------------------------------
    print("\n--- Layer 3: WHO Retrieval Results Caching ---")
    search_query = "ألم الصدر وضيق التنفس"
    
    mock_bundle = WHORagBundle(
        query=search_query,
        chunks=[
            WHOChunk(chunk_id="c1", title="WHO Cardiology", url="https://who.int/cardio", text="chest pain guidelines")
        ],
        built_from_cache=False
    )

    # First run (Cache Miss / chroma query + reframe query)
    # We patch retrieve_semantic to take some time, and disable reframing to isolate retrieval
    def mock_retrieve_semantic(q, top_k):
        time.sleep(0.080)  # Simulate 80ms ChromaDB query / scoring time
        return mock_bundle

    rag.retrieve_semantic = MagicMock(side_effect=mock_retrieve_semantic)

    with patch("src.config.settings.ENABLE_ADDREP_RAG", False):
        start = time.time()
        bundle1 = rag.retrieve(search_query, top_k=1)
        miss_latency_retrieve = (time.time() - start) * 1000

        # Second run (Cache Hit)
        start = time.time()
        bundle2 = rag.retrieve(search_query, top_k=1)
        hit_latency_retrieve = (time.time() - start) * 1000

    print(f"   - Cache Miss Latency: {miss_latency_retrieve:.2f} ms")
    print(f"   - Cache Hit Latency:  {hit_latency_retrieve:.2f} ms")
    print(f"   - Speedup:            {miss_latency_retrieve / max(0.001, hit_latency_retrieve):.1f}x")

    # ---------------------------------------------------------
    # Summary of Metrics
    # ---------------------------------------------------------
    print("\n=========================================================")
    print("📈 CACHE SYSTEM METRICS SUMMARY")
    print("=========================================================")
    metrics = CacheManager.get_metrics()
    print(f"   - Hits:      {metrics['hits']}")
    print(f"   - Misses:    {metrics['misses']}")
    print(f"   - Hit Rate:  {metrics['hit_rate'] * 100:.2f}%")
    print("=========================================================")

    # Print final Markdown Table for documentation
    print("\nBefore/After Latency Markdown Table:")
    print("| Cache Layer | Cache Miss (Before) | Cache Hit (After) | Speedup Factor |")
    print("|-------------|---------------------|-------------------|----------------|")
    print(f"| Embedding Request | {miss_latency_embed:.2f} ms | {hit_latency_embed:.2f} ms | {miss_latency_embed / max(0.001, hit_latency_embed):.1f}x |")
    print(f"| Query Reframing  | {miss_latency_reframe:.2f} ms | {hit_latency_reframe:.2f} ms | {miss_latency_reframe / max(0.001, hit_latency_reframe):.1f}x |")
    print(f"| WHO Retrieval    | {miss_latency_retrieve:.2f} ms | {hit_latency_retrieve:.2f} ms | {miss_latency_retrieve / max(0.001, hit_latency_retrieve):.1f}x |")
    print()

    # Clean up DB
    if CacheManager._conn:
        CacheManager._conn.close()
        CacheManager._conn = None
    if bench_db.exists():
        bench_db.unlink()
    for suffix in ["-wal", "-shm"]:
        f = Path(f"benchmark_cache_store.db{suffix}")
        if f.exists():
            f.unlink()
    safe_rmtree(dummy_rag_dir)

if __name__ == "__main__":
    asyncio.run(run_benchmark())
