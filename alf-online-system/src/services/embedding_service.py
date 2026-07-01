import threading
import asyncio
from sentence_transformers import SentenceTransformer
from src.config import settings

class EmbeddingService:
    """Thread-safe singleton service managing versioned in-memory caches

    for SentenceTransformer models.
    """
    _instance = None
    _singleton_lock = threading.RLock()

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            with cls._singleton_lock:
                if not cls._instance:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, "_initialized"):
            self._models = {}
            self._lock = threading.Lock()
            self._initialized = True

    def get_model(self, model_name: str) -> SentenceTransformer:
        """Fetch the SentenceTransformer model instance from cache or load it."""
        if model_name not in self._models:
            with self._lock:
                if model_name not in self._models:
                    # Dynamically instantiate and cache under versioned model name
                    self._models[model_name] = SentenceTransformer(model_name)
        return self._models[model_name]

    def encode(self, texts: list[str], model_name: str = "all-MiniLM-L6-v2", **kwargs) -> list:
        """Synchronously encode texts using the requested cached model."""
        model = self.get_model(model_name)
        return model.encode(texts, **kwargs)

    async def aencode(self, texts: list[str], model_name: str = "all-MiniLM-L6-v2", **kwargs) -> list:
        """Asynchronously encode texts offloaded to the global ThreadPoolExecutor."""
        loop = asyncio.get_running_loop()
        executor = settings._pool
        return await loop.run_in_executor(
            executor,
            lambda: self.encode(texts, model_name=model_name, **kwargs)
        )
