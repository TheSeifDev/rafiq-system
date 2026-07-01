# benchmark_addrep_rag.py — AddRep RAG Performance & Retrieval Quality Benchmark

import os
import sys
import time
import asyncio
import shutil
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.services.who_rag import WhoRAG, WHOChunk, WHORagBundle, get_embedding


# Representative WHO clinical guideline chunks to seed
MOCK_WHO_GUIDELINES = [
    {
        "chunk_id": "guideline-heartburn-1",
        "title": "علاج حموضة المعدة وارتجاع المريء (WHO Guidelines)",
        "url": "https://www.who.int/guidelines/gastric-heartburn",
        "text": "علاج حموضة المعدة والارتجاع المريئي يشمل تجنب الأطعمة الدسمة، واستخدام مضادات الحموضة عند اللزوم لمنع ارتجاع حمض المعدة إلى المريء. Gastrointestinal care for acid reflux and stomach heartburn involves avoiding heavy meals."
    },
    {
        "chunk_id": "guideline-headache-2",
        "title": "علاج الصداع والدوخة وأعراض الغثيان (WHO Guidelines)",
        "url": "https://www.who.int/guidelines/headache-nausea",
        "text": "أعراض الصداع الشديد والدوخة والغثيان تتطلب الراحة في غرفة مظلمة، والابتعاد عن التوتر، وتناول المسكنات الموصوفة. Clinical management of severe headache, dizziness, and nausea."
    },
    {
        "chunk_id": "guideline-knee-3",
        "title": "إصابات الركبة وخشونة المفاصل (WHO Guidelines)",
        "url": "https://www.who.int/guidelines/knee-crepitus",
        "text": "ألم الركبة اليسرى وفرقعة المفاصل عند الوقوف أو الحركة تدل على خشونة الغضاريف أو التهاب الأوتار. Treatment of joint crepitus and left knee pain includes unloading weight and physical therapy."
    }
]

# Colloquial queries representing Gulf, Levantine, and Egyptian dialects
DIALECT_QUERIES = [
    {
        "region": "Gulf",
        "query": "بشتكي من حرقان شديد في المعدة بعد ما أكل كبسة",
        "mock_reframe": "حرقان المعدة حموضة عسر الهضم stomach heartburn acid reflux indigestion"
    },
    {
        "region": "Levantine",
        "query": "راسي عم يوجعني كتير وحاسس بدوخة ولعيان نفس",
        "mock_reframe": "صداع شديد دوخة غثيان severe headache dizziness nausea"
    },
    {
        "region": "Egyptian",
        "query": "عندي وجع في ركبتي الشمال وبحس بفرقعة لما بقف",
        "mock_reframe": "ألم الركبة اليسرى فرقعة المفاصل left knee pain joint crepitus standing"
    }
]


async def run_benchmark():
    print("=========================================================")
    print("📊 ADDREP RAG PERFORMANCE & RETRIEVAL QUALITY BENCHMARK")
    print("=========================================================")

    test_dir = Path("test_rag_benchmark_dir")
    if test_dir.exists():
        shutil.rmtree(test_dir)
        
    os.environ["GROQ_API_KEY"] = "mock_key"
    os.environ["GOOGLE_API_KEY"] = "mock_key"

    # Initialize RAG Engine
    rag = WhoRAG(cache_dir=test_dir)

    # Seed vector DB with mock chunks
    print("\n1. Seeding Vector DB with WHO Clinical Guidelines...")
    chunks = [
        WHOChunk(
            chunk_id=item["chunk_id"],
            title=item["title"],
            url=item["url"],
            text=item["text"]
        ) for item in MOCK_WHO_GUIDELINES
    ]
    
    ids = [c.chunk_id for c in chunks]
    documents = [c.text for c in chunks]
    metadatas = [{
        "title": c.title,
        "url": c.url,
        "source": c.source,
        "updated": c.updated
    } for c in chunks]
    embeddings = [get_embedding(f"{c.title} {c.text}") for c in chunks]
    
    rag.collection.upsert(
        ids=ids,
        documents=documents,
        metadatas=metadatas,
        embeddings=embeddings
    )
    print(f"   Indexed {rag.collection.count()} guideline documents in ChromaDB.")

    # ----------------------------------------------------
    # Quality and Latency Comparison Run
    # ----------------------------------------------------
    print("\n2. Executing Dialect Queries and Measuring Quality & Latency...")

    for case in DIALECT_QUERIES:
        region = case["region"]
        original_query = case["query"]
        reframed_query = case["mock_reframe"]

        print(f"\n---------------------------------------------------------")
        print(f"🌍 Dialect: {region}")
        print(f"📝 Original Query: \"{original_query}\"")
        print(f"🔄 Reframed Query: \"{reframed_query}\"")

        # --- A. Retrieve WITHOUT AddRep ---
        start_time = time.time()
        bundle_before = rag.retrieve_semantic(original_query, top_k=1)
        latency_before = (time.time() - start_time) * 1000  # ms

        # --- B. Retrieve WITH AddRep ---
        start_time = time.time()
        bundle_after = rag.retrieve_semantic(reframed_query, top_k=1)
        latency_after = (time.time() - start_time) * 1000  # ms

        # Output Results
        print("\n   [Retrieved Chunk BEFORE AddRep]")
        if bundle_before.chunks:
            chunk = bundle_before.chunks[0]
            print(f"   - Title: {chunk.title}")
            print(f"   - Match Score (Similarity): {chunk.score:.4f}")
            print(f"   - Excerpt: {chunk.text[:80]}...")
        else:
            print("   - No matching chunk found.")

        print("\n   [Retrieved Chunk AFTER AddRep]")
        if bundle_after.chunks:
            chunk = bundle_after.chunks[0]
            print(f"   - Title: {chunk.title}")
            print(f"   - Match Score (Similarity): {chunk.score:.4f}")
            print(f"   - Excerpt: {chunk.text[:80]}...")
            
            # Compare improvements
            if bundle_before.chunks:
                score_diff = chunk.score - bundle_before.chunks[0].score
                score_pct = (score_diff / bundle_before.chunks[0].score) * 100 if bundle_before.chunks[0].score > 0 else 0
                print(f"\n   📈 Quality Gain: Similarity score increased by +{score_diff:.4f} (+{score_pct:.1f}%)")
        else:
            print("   - No matching chunk found.")

        print(f"\n   ⏱️ Latency Before (Search Only): {latency_before:.2f} ms")
        print(f"   ⏱️ Latency After (Search Only): {latency_after:.2f} ms")

    # ----------------------------------------------------
    # Latency & Timeout Fallback Simulation
    # ----------------------------------------------------
    print("\n=========================================================")
    print("⏱️ LATENCY AND TIMEOUT FALLBACK SIMULATION")
    print("=========================================================")

    # Test Case 1: Healthy fast reframing (via mock LLM client returning in 200ms)
    async def mock_fast_generate(*args, **kwargs):
        await asyncio.sleep(0.200)  # 200ms
        return "حرقان المعدة stomach heartburn"

    # Test Case 2: Slow reframing exceeding 1.5s timeout boundary
    async def mock_slow_generate(*args, **kwargs):
        await asyncio.sleep(1.8)  # 1.8s (exceeds 1.5s timeout)
        return "too late"

    print("\n1. Testing Fast Reframing Latency (200ms LLM Response)...")
    with patch("src.services.llm_client.GLOBAL_LLM_CLIENT.generate", side_effect=mock_fast_generate), \
         patch("src.config.settings.ENABLE_ADDREP_RAG", True):
        
        start_time = time.time()
        bundle = rag.retrieve("بشتكي من حرقان شديد في المعدة", top_k=1)
        total_latency = (time.time() - start_time) * 1000  # ms
        
        print(f"   - Retrieval succeeded in: {total_latency:.2f} ms")
        print(f"   - Bundle Query used: {bundle.query}")
        print(f"   - Top chunk: {bundle.chunks[0].title if bundle.chunks else 'None'}")

    print("\n2. Testing Slow Reframing Timeout (1.8s LLM Delay)...")
    with patch("src.services.llm_client.GLOBAL_LLM_CLIENT.generate", side_effect=mock_slow_generate), \
         patch("src.config.settings.ENABLE_ADDREP_RAG", True):
        
        start_time = time.time()
        bundle = rag.retrieve("بشتكي من حرقان شديد في المعدة", top_k=1)
        total_latency_timeout = (time.time() - start_time) * 1000  # ms
        
        print(f"   - Retrieval completed (with fallback) in: {total_latency_timeout:.2f} ms")
        print(f"   - Fallback activated cleanly: {total_latency_timeout < 1700} (Completed within 1.5s timeout window + search overhead)")
        print(f"   - Chunks found under original query: {len(bundle.chunks) > 0}")

    # Clean up
    if test_dir.exists():
        try:
            shutil.rmtree(test_dir)
        except Exception:
            pass


if __name__ == "__main__":
    asyncio.run(run_benchmark())
