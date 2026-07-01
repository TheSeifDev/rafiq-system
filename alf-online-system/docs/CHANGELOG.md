# 📝 Changelog

## [v4.1.0] - 2026-06-13
* **Added**: Unified LLM Client wrapper (`GLOBAL_LLM_CLIENT`) supporting Groq, Gemini, and OpenRouter fallbacks.
* **Added**: ChromaDB vector index synchronization with legacy SQLite database.
* **Added**: `Pseudonymizer` class in `src/core/privacy.py` for dynamic location and male/female name mappings.
* **Fixed**: PyAudio thread locking on audio device release.