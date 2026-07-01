# ⚡ Performance Tuning

* **Lazy Loading**: LLM and speech clients (`_stt_client`, `GLOBAL_LLM_CLIENT`) are lazily initialized only when the first chat request is received to keep startup time under 1 second.
* **SQLite Indexes**: Indexes are placed on `chat_history.timestamp`, `reminders.trigger_time`, and `audit_logs.created_at`.
* **ChromaDB Caching**: Vector database queries are cached locally to reduce disk reads.