# 🔄 Rollback & Recovery Protocols

Each surgical refactoring phase is equipped with a specific rollback strategy to prevent system outages.

---

## 🛠️ Phase Rollback Procedures

### Phase 1 & 2 (Privacy & Structured Outputs)
* **Trigger**: Malformed JSON responses or PII leaks.
* **Protocol**: Toggle `RAFIQ_DISABLE_PRIVACY=1` and bypass Pydantic validations, falling back to original regex JSON extraction helper functions.

### Phase 3 (RAG Improvements)
* **Trigger**: Latency spike (>2.0s overhead) during query reframing.
* **Protocol**: Set `RAFIQ_ENABLE_QUERY_REFRAMING=0` to bypass LLM rewriting and run standard vector keyword searches.

### Phase 4 (Voice Pipeline)
* **Trigger**: PyAudio thread locks or high CPU usage on client machine.
* **Protocol**: Toggle `RAFIQ_USE_SIMPLE_VAD=1` to switch back to the original volume energy-threshold end-pointing.

### Phase 5 & 6 (Agentic Flow & Event Bus)
* **Trigger**: Infinite agent transitions or frozen Electron windows.
* **Protocol**: Revert Git branch to the pre-refactored modular agent branch.

### Phase 9 (Multi-user Memory)
* **Trigger**: SQLite migration crashes or locks database file.
* **Protocol**:
  1. Terminate FastAPI processes.
  2. Restore SQLite backup file (`*.db.bak`) created automatically before migration.
  3. Clear ChromaDB collection paths and re-synchronize from restored database.