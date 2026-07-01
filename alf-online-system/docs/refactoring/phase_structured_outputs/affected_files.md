# ⚙️ Affected Files & Parser Mapping

Below is the impact analysis detailing files, functions, and migration risk levels.

---

## 📁 Parser Mapping Table

### 1. `src/services/conv_processor.py`
* **Function**: `extract_memory_bg` (Line 159)
* **Current Parser**: `extract_json_from_text(resp)` using regex `\{.*\}` and `json.loads`.
* **New Parser**: `MemoryFactList.model_validate_json(resp)`
* **Migration Risk**: `SAFE` (Requires fallback on validation error).

### 2. `src/services/conv_processor.py`
* **Function**: `_extract_llm` (Line 314)
* **Current Parser**: `extract_json_from_text(resp)` using `json.loads`.
* **New Parser**: `MedicationIntent.model_validate_json(resp)`
* **Migration Risk**: `SAFE`.

### 3. `src/services/conv_processor.py`
* **Function**: `step` (Line 448 - Reminder parsing block)
* **Current Parser**: `extract_json_from_text(resp)` using `json.loads`.
* **New Parser**: `ReminderIntent.model_validate_json(resp)`
* **Migration Risk**: `SAFE`.

### 4. `src/core/medical_agents.py`
* **Function**: `run_medical_consultation` (Line 21)
* **Current Parser**: Custom string formatting.
* **New Parser**: `MedicalResponse.model_validate_json(resp)`
* **Migration Risk**: `CAUTION` (Requires adjusting the ChatGroq system prompts to strictly output JSON).

### 5. `src/core/medical_router.py`
* **Function**: `route_query` (Line 263)
* **Current Parser**: Manual regex logic in helper functions (`is_urgent_emergency`, `is_medical_query`).
* **New Parser**: `QueryRoute.model_validate_json(resp)` (via LLM router call).
* **Migration Risk**: `CAUTION`.