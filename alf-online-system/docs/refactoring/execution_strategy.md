# 🎯 Execution Strategy - Phased Refactoring Roadmap

This document outlines the phased execution strategy for the surgical refactoring of Rafiq System, preserving its core technologies (FastAPI, Electron, SQLite, ChromaDB, Groq, Gemini, Azure Edge TTS) while maintaining a Local-Data First and Cloud-AI First architecture.

---

## 🗺️ Refactoring Phases

### Phase 1: Safety and Privacy
* **Objectives**: Expand de-identification to cover all 18 HIPAA Safe Harbor identifiers with format-preserving fakes. Integrate RxNav checks as local safety pre-processing before cloud execution.
* **Architecture Complexity**: 4/10
* **Technical Debt Reduction**: High (Removes basic regex matching limitations)
* **User Impact**: High (Critical privacy and safety guarantees)
* **Migration Cost**: Low
* **Backward Compatibility Risk**: Low
* **Classification**: `SAFE`
* **Affected Files**: `src/core/privacy.py`, `src/services/conv_processor.py`, `src/core/medical_guardrails.py`
* **Dependencies**: None
* **Risks**: Potential performance overhead in regex matches on long inputs.
* **Rollback Strategy**: Maintain original regex filters inside `privacy.py` and fall back via a feature flag.
* **Tests Required**: Unit tests checking PII redaction of synthetic inputs containing names, phones, addresses.
* **Acceptance Criteria**: 100% de-identification of all 18 Safe Harbor identifiers without leakage to LLM logs.
* **Estimated Effort**: 2 days

### Phase 2: Structured Outputs with Pydantic
* **Objectives**: Enforce Pydantic validation schemas on all LLM responses, ensuring structured responses for clinical memory extraction.
* **Architecture Complexity**: 3/10
* **Technical Debt Reduction**: Medium (Eliminates raw JSON parser logic in helpers)
* **User Impact**: Medium (Prevents UI crashes due to malformed LLM responses)
* **Migration Cost**: Low
* **Backward Compatibility Risk**: Low
* **Classification**: `SAFE`
* **Affected Files**: `src/services/llm_client.py`, `src/utils/helpers.py`, `src/database/db_operational.py`
* **Dependencies**: Phase 1 (Safety and Privacy)
* **Risks**: Cloud model failing to follow JSON schema strictly.
* **Rollback Strategy**: Fallback to raw regex JSON extraction helpers in case of validation failures.
* **Tests Required**: Unit tests for JSON extraction and Pydantic parsing with synthetic LLM outputs.
* **Acceptance Criteria**: All structured parameters (reminders, medications) are parsed via Pydantic model objects.
* **Estimated Effort**: 2 days

### Phase 3: RAG Improvements
* **Objectives**: Implement AddRep (Adaptive Retrieval and Augmentation) query reframing using a fast LLM call (via Groq) to convert Arabic dialects into clinical English/Standard Arabic search queries before ChromaDB lookup.
* **Architecture Complexity**: 5/10
* **Technical Debt Reduction**: Medium (Cleans up raw lookup logic)
* **User Impact**: High (Significantly better search accuracy for patient questions)
* **Migration Cost**: Medium
* **Backward Compatibility Risk**: Low
* **Classification**: `SAFE`
* **Affected Files**: `src/services/who_rag.py`, `src/services/trusted_web.py`
* **Dependencies**: Phase 2 (Structured Outputs)
* **Risks**: Minor latency increase due to the extra query-reframing LLM step.
* **Rollback Strategy**: Bypass query reframer and perform direct string lookup on ChromaDB if latency exceeds threshold.
* **Tests Required**: Integration tests validating search queries in Gulf/Egyptian/Levantine dialects resolve to correct WHO document vectors.
* **Acceptance Criteria**: Vector search recall increases by >10% on dialect queries.
* **Estimated Effort**: 3 days

### Phase 4: Voice Pipeline
* **Objectives**: Integrate Silero Voice Activity Detection (VAD) locally to replace energy-threshold end-pointing, resolving premature voice cut-offs.
* **Architecture Complexity**: 6/10
* **Technical Debt Reduction**: High (Removes basic volume check issues)
* **User Impact**: High (Much smoother natural voice conversations)
* **Migration Cost**: Medium
* **Backward Compatibility Risk**: Medium
* **Classification**: `CAUTION`
* **Affected Files**: `src/services/voice_listener.py`, `src/services/stt_service.py`
* **Dependencies**: None
* **Risks**: CPU spike on low-end machines running VAD models locally.
* **Rollback Strategy**: Fall back to volume energy-threshold checker via `.env` parameter `RAFIQ_USE_SIMPLE_VAD=1`.
* **Tests Required**: Recording end-to-end tests validating speech detection under varying background noise levels.
* **Acceptance Criteria**: Stop recording only when speech activity ceases for >800ms.
* **Estimated Effort**: 4 days

### Phase 5: Agent Architecture
* **Objectives**: Refactor sequential helper agents in `src/core/medical_agents.py` into a modular LangGraph or event-driven agent model.
* **Architecture Complexity**: 7/10
* **Technical Debt Reduction**: High (Structured state management)
* **User Impact**: Medium (More consistent medical advice flow)
* **Migration Cost**: Medium
* **Backward Compatibility Risk**: Medium
* **Classification**: `CAUTION`
* **Affected Files**: `src/core/medical_agents.py`, `src/services/conv_processor.py`
* **Dependencies**: Phase 2, Phase 3
* **Risks**: Infinite agent loop states if edges are not terminated cleanly.
* **Rollback Strategy**: Retain original linear routing scripts in `conv_processor.py` as a fallback module.
* **Tests Required**: Validation testing of agent transitions (General -> Medical -> Emergency -> General).
* **Acceptance Criteria**: State transitions occur deterministically with explicit state variable audits.
* **Estimated Effort**: 5 days

### Phase 6: Event Bus
* **Objectives**: Introduce an asynchronous event bus (like PyPubSub or an async task queue) to decouple backend systems and bridge communication.
* **Architecture Complexity**: 7/10
* **Technical Debt Reduction**: High (Decouples tight component bindings)
* **User Impact**: Medium (Predictable real-time event updates)
* **Migration Cost**: Medium
* **Backward Compatibility Risk**: High
* **Classification**: `HIGH RISK`
* **Affected Files**: `src/gui_bridge.py`, `src/services/conv_processor.py`, `src/services/scheduler_service.py`
* **Dependencies**: None
* **Risks**: Event loop locks, deadlocks, and missed events leading to unresponsive GUI.
* **Rollback Strategy**: Maintain direct synchronous function call bridges as fallback.
* **Tests Required**: Event broadcasting tests with mock publishers/subscribers verifying no memory leaks or thread blocks.
* **Acceptance Criteria**: GUI bridge processes updates from other modules asynchronously via registered event listeners.
* **Estimated Effort**: 5 days

### Phase 7: Observability and Logging
* **Objectives**: Implement structured logging with JSON formatting and unified metrics tracking, ensuring PII redaction filters are applied.
* **Architecture Complexity**: 4/10
* **Technical Debt Reduction**: Medium (Cleans up scattered print statements)
* **User Impact**: Low (Developer/caregiver diagnostics only)
* **Migration Cost**: Low
* **Backward Compatibility Risk**: Low
* **Classification**: `SAFE`
* **Affected Files**: `src/utils/helpers.py`, `src/core/privacy.py`
* **Dependencies**: None
* **Risks**: Redaction filter missing on custom log paths.
* **Rollback Strategy**: Revert logger formatters to standard Python StreamHandlers.
* **Tests Required**: Asserting JSON format structures and checking log files for any raw PII patterns.
* **Acceptance Criteria**: Log output uses a standard JSON schema containing keys: `timestamp`, `level`, `module`, `message`.
* **Estimated Effort**: 2 days

### Phase 8: Caching
* **Objectives**: Implement caching layers for embedding generation and query results to minimize redundant API calls.
* **Architecture Complexity**: 4/10
* **Technical Debt Reduction**: Medium (Avoids repetitive network calls)
* **User Impact**: High (Immediate responses on repeated queries)
* **Migration Cost**: Low
* **Backward Compatibility Risk**: Low
* **Classification**: `SAFE`
* **Affected Files**: `src/services/embedding_service.py`, `src/services/llm_client.py`
* **Dependencies**: Phase 2 (Structured Outputs)
* **Risks**: Cache invalidation issues leading to stale clinical facts.
* **Rollback Strategy**: Disable caching layer via `RAFIQ_DISABLE_CACHE=1` flag.
* **Tests Required**: Verifying embedding queries return cached results without hitting external APIs on second call.
* **Acceptance Criteria**: Latency drops from ~600ms to <10ms for cached embedding retrieval.
* **Estimated Effort**: 2 days

### Phase 9: Multi-user Memory
* **Objectives**: Partition the local SQLite operational database tables and ChromaDB vector collections by `user_id` to allow multiple profiles.
* **Architecture Complexity**: 8/10
* **Technical Debt Reduction**: High (Prepares for multi-patient support)
* **User Impact**: High (Isolated histories per family member)
* **Migration Cost**: High
* **Backward Compatibility Risk**: High
* **Classification**: `HIGH RISK`
* **Affected Files**: `src/database/db_operational.py`, `src/database/clinical_memory.py`, `src/services/conv_processor.py`
* **Dependencies**: Phase 1, Phase 2, Phase 3
* **Risks**: Database migration errors leading to loss of existing patient schedule history.
* **Rollback Strategy**: Automated database backups before migration; fallback script to restore single-user table structures.
* **Tests Required**: Migration script dry-runs, profile isolation assertions verifying User A cannot read User B's clinical memory facts.
* **Acceptance Criteria**: Multi-profile creation operates with completely isolated context/reminder states.
* **Estimated Effort**: 7 days