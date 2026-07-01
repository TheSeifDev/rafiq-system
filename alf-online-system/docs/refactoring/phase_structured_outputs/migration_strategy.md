# 🔄 Migration Strategy & Schema Phasing

We implement an incremental migration strategy to safely introduce Pydantic validation.

---

## 🗺️ Phasing Plan

### Horizon 1: Background Memory (SAFE)
* **Target**: `MemoryFact` extraction in `conv_processor.py`.
* **Strategy**: Introduce `MemoryFact` validation in `extract_memory_bg`. If it fails, fall back to logging the error and write an empty fact, ensuring zero user-facing crash.

### Horizon 2: Medication & Reminder Intent parsing (CAUTION)
* **Target**: `MedicationIntent` and `ReminderIntent` in `conv_processor.py`.
* **Strategy**: Update prompts to request the specific JSON schema. Catch `ValidationError` and fall back to the original regex parser.

### Horizon 3: Agentic Routing (HIGH_RISK)
* **Target**: `MedicalResponse` and `QueryRoute` in `medical_agents.py` and `medical_router.py`.
* **Strategy**: Update core ReAct nodes to return structured JSON. Requires comprehensive testing of LLM accuracy in returning schema compliance under high temperatures.