# 🧪 Test Plan: Structured Outputs

This document defines the test suite required to verify schema validation and parser fallback logic.

---

## 📈 Test Cases

### 1. Schema Validation Unit Tests
* **Objective**: Assert Pydantic models validate valid JSON and reject invalid JSON cleanly.
* **Method**: Use `pytest` to run assertions against the `schema_catalog.md` valid/invalid payloads.

### 2. LLM Prompt Conformity Tests
* **Objective**: Verify that the Groq LLM outputs follow the Pydantic schema when configured.
* **Method**: Call `GLOBAL_LLM_CLIENT` with structured output prompts and verify that it parses cleanly without throwing `ValidationError`.

### 3. Fallback Parser Tests
* **Objective**: Assert that if a `ValidationError` occurs, the system successfully falls back to standard regex/hacks extraction.
* **Method**: Inject malformed JSON text (e.g. `{"med_name": "Aspirin", "food_relation": "invalid_enum"}`) and assert that the fallback parser extracts the name "Aspirin" anyway.