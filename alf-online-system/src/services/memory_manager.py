import threading
import os
import logging
from src.database.clinical_memory import ClinicalMemory

log = logging.getLogger("rafiq.memory_manager")

class MemoryServiceManager:
    """
    Dedicated layer for background memory loading, readiness tracking,
    failure isolation, and graceful fallback.
    """
    def __init__(self, groq_api_key: str, chroma_path: str):
        self._groq_api_key = groq_api_key
        self._chroma_path = chroma_path
        self._instance = None
        self._ready = False
        self._failed = False
        self._loading_thread = None

    def start_background_loading(self):
        if self._loading_thread and self._loading_thread.is_alive():
            return
        
        def _load():
            log.info("MemoryServiceManager: Starting background load of ClinicalMemory...")
            try:
                # Synchronous and slow loading
                instance = ClinicalMemory(groq_api_key=self._groq_api_key, chroma_path=self._chroma_path)
                self._instance = instance
                self._ready = True
                log.info("MemoryServiceManager: ClinicalMemory loaded and ready.")
            except Exception as e:
                log.error(f"MemoryServiceManager: Failed to load ClinicalMemory: {e}")
                self._failed = True

        self._loading_thread = threading.Thread(target=_load, daemon=True)
        self._loading_thread.start()

    def is_ready(self) -> bool:
        return self._ready

    def has_failed(self) -> bool:
        return self._failed

    def get_instance(self) -> ClinicalMemory | None:
        return self._instance
