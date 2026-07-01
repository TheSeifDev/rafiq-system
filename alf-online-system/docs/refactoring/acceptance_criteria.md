# ✅ Phase Acceptance Criteria

For each refactoring phase to be considered complete, it must satisfy the following criteria:

---

## 📋 Acceptance Checklist

### Phase 1: Safety & Privacy
* `[ ]` Safe Harbor 18 identifiers successfully redacted in tests.
* `[ ]` Log files verify zero PII leaks.
* `[ ]` RxNav drug check runs before LLM call.

### Phase 2: Structured Outputs
* `[ ]` Pydantic models validate all structured clinical facts.
* `[ ]` No raw JSON regex extraction calls in new modules.

### Phase 3: RAG Improvements
* `[ ]` Search query dialect reframer resolves Gulf/Egyptian terms correctly.
* `[ ]` RAG retrieval returns valid WHO documents.

### Phase 4: Voice Pipeline
* `[ ]` Voice listener utilizes Silero VAD.
* `[ ]` Speech end-pointing does not cut off normal patient pauses.

### Phase 5: Agent Architecture
* `[ ]` Routing flow executes cleanly via state machine steps.
* `[ ]` Maximum iteration guards prevent loops.

### Phase 6: Event Bus
* `[ ]` Async bus successfully broadcasts voice state changes to GUI bridge.
* `[ ]` Zero UI freezes under rapid event bursts.

### Phase 7: Observability
* `[ ]` Logs use structured JSON format.
* `[ ]` Log filters strip all database secrets and patient data.

### Phase 8: Caching
* `[ ]` Cached embedding retrieval takes <15ms.
* `[ ]` Cache hits avoid external API requests.

### Phase 9: Multi-User Memory
* `[ ]` Migration script moves single user data to multi-profile schemas without loss.
* `[ ]` User profile data is isolated (User A cannot access User B facts).