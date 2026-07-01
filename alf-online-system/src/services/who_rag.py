from __future__ import annotations

import json
import math
import os
import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlparse
import chromadb

from src.services import trusted_web


DEFAULT_INDEX_TTL_SECONDS = 14 * 24 * 60 * 60
DEFAULT_CHUNK_CHARS = 900
DEFAULT_CHUNK_OVERLAP = 160

_EMBED_MODEL = None

def get_embed_model():
    """Lazily loads the sentence-transformers embedding model from centralized cache."""
    global _EMBED_MODEL
    if os.environ.get("RAFIQ_USE_SENTENCE_TRANSFORMERS", "0") != "1":
        return False
    if _EMBED_MODEL is None:
        try:
            from src.services.embedding_service import EmbeddingService
            model_name = "BAAI/bge-m3"
            if os.environ.get("RAFIQ_OFFLINE", "0") == "1":
                model_name = "sentence-transformers/all-MiniLM-L6-v2"
            _EMBED_MODEL = EmbeddingService().get_model(model_name)
        except Exception:
            # Set to False to prevent repeated failed import attempts
            _EMBED_MODEL = False
    return _EMBED_MODEL


def get_embedding(text: str, dim: int | None = None) -> list[float]:
    """Generates embeddings using sentence-transformers, or falls back to stable hashing if unavailable. Results are cached."""
    from src.config.settings import ENABLE_CACHING, CACHE_TTL_EMBED
    from src.services.cache_service import CacheManager
    import hashlib
    
    text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
    cache_key = f"embed:{text_hash}"
    if ENABLE_CACHING:
        cached = CacheManager.get(cache_key)
        if cached is not None:
            return cached
            
    model = get_embed_model()
    vec = None
    if model:
        try:
            vec = model.encode(text).tolist()
        except Exception:
            pass
            
    if vec is None:
        if dim is None:
            # Match the embedding dimensions of the configured model
            if os.environ.get("RAFIQ_OFFLINE", "0") == "1":
                dim = 384
            else:
                dim = 1024
        # Hashing fallback matching voice_brain's logic
        vec = [0.0] * dim
        tokens = re.findall(r"[0-9a-zA-Z\u0600-\u06FF]+", text.lower())
        if not tokens:
            return vec
        for tok in tokens:
            digest = hashlib.sha256(tok.encode("utf-8")).digest()
            idx = int.from_bytes(digest[:4], "little") % dim
            sign = 1.0 if digest[4] % 2 else -1.0
            vec[idx] += sign
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        vec = [v / norm for v in vec]
        
    if ENABLE_CACHING and vec:
        CacheManager.set(cache_key, vec, CACHE_TTL_EMBED)
        
    return vec


@dataclass(frozen=True)
class WHOChunk:
    chunk_id: str
    title: str
    url: str
    text: str
    source: str = "WHO"
    updated: str = ""
    score: float = 0.0


@dataclass(frozen=True)
class WHORagBundle:
    query: str
    chunks: list[WHOChunk] = field(default_factory=list)
    built_from_cache: bool = False

    @property
    def found(self) -> bool:
        return bool(self.chunks)

    @property
    def sources(self) -> list[str]:
        seen: set[str] = set()
        sources: list[str] = []
        for chunk in self.chunks:
            if chunk.url not in seen:
                sources.append(chunk.url)
                seen.add(chunk.url)
        return sources

    def context_text(self, max_chars: int = 4200) -> str:
        if not self.chunks:
            return ""
        lines = [
            "WHO_ONLY_CONTEXT: استخدم النصوص التالية فقط لأي معلومة طبية. ممنوع الاستنتاج من خارجها.",
        ]
        total = len(lines[0])
        for i, chunk in enumerate(self.chunks, start=1):
            block = (
                f"\n[WHO-{i}]\n"
                f"Title: {chunk.title}\n"
                f"URL: {chunk.url}\n"
                f"Excerpt: {chunk.text.strip()}\n"
            )
            if total + len(block) > max_chars:
                break
            lines.append(block)
            total += len(block)
        return "\n".join(lines)


def tokenize(text: str) -> list[str]:
    return re.findall(r"[0-9a-zA-Z\u0600-\u06FF]+", text.lower())


def _expanded_tokens(text: str) -> list[str]:
    tokens = tokenize(text)
    lowered = text.lower()
    for arabic, english in trusted_web._ARABIC_TO_WHO_TERMS.items():
        if arabic in lowered:
            tokens.extend(tokenize(english))
    return tokens


def _chunk_text(text: str, chunk_chars: int = DEFAULT_CHUNK_CHARS, overlap: int = DEFAULT_CHUNK_OVERLAP) -> list[str]:
    clean = re.sub(r"\s+", " ", text).strip()
    if len(clean) <= chunk_chars:
        return [clean] if clean else []
    chunks: list[str] = []
    start = 0
    while start < len(clean):
        end = min(len(clean), start + chunk_chars)
        if end < len(clean):
            boundary = max(clean.rfind(". ", start, end), clean.rfind("؟ ", start, end), clean.rfind("! ", start, end))
            if boundary > start + chunk_chars // 2:
                end = boundary + 1
        chunks.append(clean[start:end].strip())
        if end >= len(clean):
            break
        start = max(0, end - overlap)
    return [chunk for chunk in chunks if chunk]


class WhoRAG:
    def __init__(
        self,
        cache_dir: Path,
        timeout: float = 5.0,
        index_ttl_seconds: int = DEFAULT_INDEX_TTL_SECONDS,
        chunk_chars: int = DEFAULT_CHUNK_CHARS,
    ):
        self.cache_dir = cache_dir
        self.index_dir = cache_dir / "who_rag"
        self.index_path = self.index_dir / "chunks.jsonl"
        self.timeout = timeout
        self.index_ttl_seconds = index_ttl_seconds
        self.chunk_chars = chunk_chars
        self.index_dir.mkdir(parents=True, exist_ok=True)
        self._chunks_cache: list[WHOChunk] | None = None
        self._is_refreshing = False

        # Initialize ChromaDB persistent client and collection for WHO RAG
        chroma_path = self.index_dir / "who_chroma"
        chroma_path.mkdir(parents=True, exist_ok=True)
        self.chroma_client = chromadb.PersistentClient(path=str(chroma_path))
        self.collection = self.chroma_client.get_or_create_collection(
            name="rafiq_who_rag",
            metadata={"hnsw:space": "cosine"}
        )

    def _seed_topics(self) -> list[dict[str, str]]:
        topics: list[dict[str, str]] = []
        for title, url in trusted_web._WHO_TOPIC_ALIASES.values():
            if trusted_web.is_allowed_medical_url(url):
                topics.append({"title": title, "url": url})
        return topics

    def _index_is_fresh(self) -> bool:
        return self.index_path.exists() and time.time() - self.index_path.stat().st_mtime <= self.index_ttl_seconds

    def _load_index(self) -> list[WHOChunk]:
        if self._chunks_cache is not None:
            return self._chunks_cache
        if not self.index_path.exists():
            return []
        chunks: list[WHOChunk] = []
        try:
            for line in self.index_path.read_text(encoding="utf-8").splitlines():
                if not line.strip():
                    continue
                data = json.loads(line)
                if trusted_web.is_allowed_medical_url(data.get("url", "")):
                    chunks.append(WHOChunk(**data))
        except (OSError, json.JSONDecodeError, TypeError):
            return []
        self._chunks_cache = chunks

        # Populate ChromaDB from chunks if ChromaDB count is 0
        if chunks and self.collection.count() == 0:
            try:
                ids = [c.chunk_id for c in chunks]
                documents = [c.text for c in chunks]
                metadatas = [{
                    "title": c.title,
                    "url": c.url,
                    "source": c.source,
                    "updated": c.updated
                } for c in chunks]
                embeddings = [get_embedding(f"{c.title} {c.text}") for c in chunks]
                self.collection.upsert(
                    ids=ids,
                    documents=documents,
                    metadatas=metadatas,
                    embeddings=embeddings
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning("Failed to populate Chroma DB from cached chunks: %s", e)

        return chunks

    def _write_index(self, chunks: list[WHOChunk]):
        with self.index_path.open("w", encoding="utf-8") as handle:
            for chunk in chunks:
                handle.write(
                    json.dumps(
                        {
                            "chunk_id": chunk.chunk_id,
                            "title": chunk.title,
                            "url": chunk.url,
                            "text": chunk.text,
                            "source": chunk.source,
                            "updated": chunk.updated,
                            "score": 0.0,
                        },
                        ensure_ascii=False,
                    )
                    + "\n"
                )
        self._chunks_cache = chunks

        # Update ChromaDB collection
        if chunks:
            try:
                ids = [c.chunk_id for c in chunks]
                documents = [c.text for c in chunks]
                metadatas = [{
                    "title": c.title,
                    "url": c.url,
                    "source": c.source,
                    "updated": c.updated
                } for c in chunks]
                embeddings = [get_embedding(f"{c.title} {c.text}") for c in chunks]
                self.collection.upsert(
                    ids=ids,
                    documents=documents,
                    metadatas=metadatas,
                    embeddings=embeddings
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).error("Failed to write chunks to Chroma DB: %s", e)

    def refresh_index(self, max_topics: int = 24) -> list[WHOChunk]:
        client = trusted_web.TrustedMedicalWebClient(cache_dir=self.cache_dir, timeout=self.timeout)
        chunks: list[WHOChunk] = []
        for topic in self._seed_topics()[:max_topics]:
            url = topic["url"]
            try:
                text = client._read_page_text(url)
            except Exception:
                continue
            for i, chunk_text in enumerate(_chunk_text(text, chunk_chars=self.chunk_chars)):
                chunks.append(
                    WHOChunk(
                        chunk_id=f"{urlparse(url).path.strip('/').replace('/', '-')}-{i}",
                        title=topic["title"],
                        url=url,
                        text=chunk_text,
                        updated="",
                    )
                )
        if chunks:
            self._write_index(chunks)
        return chunks

    def ensure_index(self) -> list[WHOChunk]:
        import threading
        chunks = self._load_index()
        if not chunks:
            if not self._is_refreshing:
                self._is_refreshing = True
                threading.Thread(target=self._safe_refresh, daemon=True).start()
            return []
        if not self._index_is_fresh():
            if not self._is_refreshing:
                self._is_refreshing = True
                threading.Thread(target=self._safe_refresh, daemon=True).start()
            return chunks
        return chunks

    def _safe_refresh(self):
        try:
            self.refresh_index()
        except Exception:
            pass
        finally:
            self._is_refreshing = False

    def _score(self, query: str, chunk: WHOChunk) -> float:
        q_tokens = _expanded_tokens(query)
        if not q_tokens:
            return 0.0
        q_set = set(q_tokens)
        doc_tokens = tokenize(f"{chunk.title} {chunk.url} {chunk.text}")
        if not doc_tokens:
            return 0.0
        doc_set = set(doc_tokens)
        overlap = q_set & doc_set
        title_bonus = len(q_set & set(tokenize(chunk.title))) * 2.5
        exact_bonus = 3.0 if query.lower() in chunk.text.lower() else 0.0
        density = len(overlap) / math.sqrt(len(doc_set))
        return len(overlap) + title_bonus + exact_bonus + density

    def retrieve_from_chunks(self, query: str, chunks: list[WHOChunk], top_k: int = 4) -> WHORagBundle:
        ranked = [
            WHOChunk(
                chunk_id=chunk.chunk_id,
                title=chunk.title,
                url=chunk.url,
                text=chunk.text,
                source=chunk.source,
                updated=chunk.updated,
                score=self._score(query, chunk),
            )
            for chunk in chunks
            if trusted_web.is_allowed_medical_url(chunk.url)
        ]
        ranked = [chunk for chunk in ranked if chunk.score > 0]
        ranked.sort(key=lambda chunk: chunk.score, reverse=True)
        return WHORagBundle(query=query, chunks=ranked[:top_k], built_from_cache=True)

    def retrieve_semantic(self, query: str, top_k: int = 4) -> WHORagBundle:
        """Query ChromaDB using semantic vector embeddings."""
        self.ensure_index()
        if self.collection.count() == 0:
            return WHORagBundle(query=query, chunks=[], built_from_cache=True)

        try:
            query_embedding = get_embedding(query)
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                include=["documents", "metadatas", "distances"]
            )
            
            chunks: list[WHOChunk] = []
            if results and results.get("ids") and len(results["ids"]) > 0:
                ids = results["ids"][0]
                documents = results["documents"][0]
                metadatas = results["metadatas"][0]
                distances = results["distances"][0]
                
                for i in range(len(ids)):
                    meta = metadatas[i] or {}
                    url = meta.get("url", "")
                    if trusted_web.is_allowed_medical_url(url):
                        # Convert distance to a similarity score (cosine distance ranges from 0 to 2)
                        score = max(0.0, 1.0 - float(distances[i]))
                        chunks.append(
                            WHOChunk(
                                chunk_id=ids[i],
                                title=meta.get("title", ""),
                                url=url,
                                text=documents[i],
                                source=meta.get("source", "WHO"),
                                updated=meta.get("updated", ""),
                                score=score
                            )
                        )
            
            chunks.sort(key=lambda c: c.score, reverse=True)
            return WHORagBundle(query=query, chunks=chunks, built_from_cache=True)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error("Semantic search failed: %s. Falling back to term match.", e)
            # Fallback to term overlap matching
            chunks = self._load_index()
            return self.retrieve_from_chunks(query, chunks, top_k=top_k)

    def reframe_query_sync(self, query: str) -> str:
        """Reframes colloquial Arabic medical query to standard clinical keywords. Results are cached."""
        import asyncio
        import os
        from src.config.settings import ENABLE_CACHING, CACHE_TTL_REFRAME
        from src.services.cache_service import CacheManager
        from src.services.llm_client import GLOBAL_LLM_CLIENT
        
        cache_key = f"reframe:{query}"
        if ENABLE_CACHING:
            cached = CacheManager.get(cache_key)
            if cached is not None:
                return cached
        
        async def _reframe():
            prompt = [
                {"role": "system", "content": (
                    "You are a medical search query reframer. Your task is to rewrite a patient's query "
                    "(often in colloquial Arabic dialects like Egyptian, Gulf, or Levantine) into clear, "
                    "concise, and professional clinical search terms.\n"
                    "Produce terms in BOTH standard medical Arabic (الفصحى) and clinical English.\n"
                    "Keep it strictly under 10 words, separated by spaces.\n"
                    "Output ONLY the search terms, without any conversational filler, explanation, quotes, or markdown block tags.\n\n"
                    "Example 1:\n"
                    "Input: عندي حرقان شديد في المعدة بعد ما أكل كبسة\n"
                    "Output: حرقان المعدة حموضة عسر الهضم stomach heartburn acid reflux indigestion\n\n"
                    "Example 2:\n"
                    "Input: راسي عم يوجعني كتير وحاسس بدوخة ولعيان نفس\n"
                    "Output: صداع شديد دوخة غثيان severe headache dizziness nausea"
                )},
                {"role": "user", "content": f"Input: {query}"}
            ]
            # 1.5 seconds timeout protection
            return await asyncio.wait_for(
                GLOBAL_LLM_CLIENT.generate(prompt, temp=0.0, max_tok=128),
                timeout=1.5
            )
            
        try:
            if not os.environ.get("GROQ_API_KEY") and not os.environ.get("GOOGLE_API_KEY"):
                return query
                
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                reframed = executor.submit(asyncio.run, _reframe()).result()
                if reframed and reframed.strip():
                    res = reframed.strip()
                    if ENABLE_CACHING:
                        CacheManager.set(cache_key, res, CACHE_TTL_REFRAME)
                    return res
        except Exception as e:
            import logging
            logging.getLogger("rafiq.who_rag").warning(f"AddRep RAG query reframing failed/timed out: {e}. Using original query.")
            
        return query

    def retrieve(self, query: str, top_k: int = 4) -> WHORagBundle:
        """Retrieves using semantic search first, and falls back to live web scraping if none found."""
        from src.config.settings import ENABLE_ADDREP_RAG, ENABLE_CACHING, CACHE_TTL_RETRIEVE
        from src.services.cache_service import CacheManager
        import logging
        
        cache_key = f"who_retrieve:{query}:{top_k}"
        if ENABLE_CACHING:
            cached = CacheManager.get(cache_key)
            if cached is not None:
                chunks = [
                    WHOChunk(
                        chunk_id=c["chunk_id"],
                        title=c["title"],
                        url=c["url"],
                        text=c["text"],
                        source=c.get("source", "WHO"),
                        updated=c.get("updated", ""),
                        score=c.get("score", 0.0)
                    ) for c in cached.get("chunks", [])
                ]
                return WHORagBundle(
                    query=query,
                    chunks=chunks,
                    built_from_cache=cached.get("built_from_cache", True)
                )
        
        search_query = query
        if ENABLE_ADDREP_RAG:
            reframed = self.reframe_query_sync(query)
            if reframed != query:
                logging.getLogger("rafiq.who_rag").info(f"AddRep RAG Query Reframed: '{query}' -> '{reframed}'")
                search_query = reframed
                
        from src.utils.beta_telemetry import record_rag_result
        from src.utils.observability import measure_latency
        t0 = time.monotonic()
        with measure_latency("rag", extra_info={"query": query, "top_k": top_k}):
            bundle = self.retrieve_semantic(search_query, top_k=top_k)
            
            final_bundle = None
            if bundle.found:
                final_bundle = WHORagBundle(query=query, chunks=bundle.chunks, built_from_cache=bundle.built_from_cache)
            else:
                # Fallback to web search scrape
                client = trusted_web.TrustedMedicalWebClient(cache_dir=self.cache_dir, timeout=self.timeout)
                results = client.search(search_query, max_results=top_k)
                fallback_chunks = [
                    WHOChunk(
                        chunk_id=f"live-{i}",
                        title=result.title,
                        url=result.url,
                        text=result.snippet,
                        score=1.0,
                    )
                    for i, result in enumerate(results, start=1)
                    if trusted_web.is_allowed_medical_url(result.url)
                ]
                final_bundle = WHORagBundle(query=query, chunks=fallback_chunks, built_from_cache=False)
            
            record_rag_result(len(final_bundle.chunks) if final_bundle else 0, (time.monotonic() - t0) * 1000)
            
        if ENABLE_CACHING and final_bundle:
            serialized = {
                "query": final_bundle.query,
                "built_from_cache": final_bundle.built_from_cache,
                "chunks": [
                    {
                        "chunk_id": c.chunk_id,
                        "title": c.title,
                        "url": c.url,
                        "text": c.text,
                        "source": c.source,
                        "updated": c.updated,
                        "score": c.score
                    } for c in final_bundle.chunks
                ]
            }
            CacheManager.set(cache_key, serialized, CACHE_TTL_RETRIEVE)
            
        return final_bundle
