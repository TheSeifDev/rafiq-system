# ⚙️ File Impact Analysis: Phase 1

This document assesses the exact files impacted by Phase 1 improvements, detailing current implementations, proposed implementations, justifications, and risk classifications.

---

## 📁 Impact Analysis Table

### 1. `src/core/privacy.py`
* **Target Class/Function**: `Pseudonymizer` (Class), `deidentify` (Function)
* **Current Implementation**: Lines 135-250. Simple regex mapping of names, standard emails, and standard 10+ digit long IDs. Simple dynamic location checking using Arabic prepositions.
* **Proposed Implementation**: Integrate 18 Safe Harbor identifier matching, including date shifting, alphanumeric MRNs, ZIP codes, and multi-word street address extraction.
* **Justification**: Eliminates PHI leakage risk of unmapped identifiers (like birth dates, zip codes, and custom IDs).
* **Compatibility Impact**: None. The public signature `deidentify_text` remains backward-compatible.
* **Risk Level**: `SAFE`
* **Migration Complexity**: Low

### 2. `src/core/medical_guardrails.py`
* **Target Class/Function**: `validate_medical_answer` (Function)
* **Current Implementation**: Lines 104-125. Static checks for dosage terms and personal diagnosis patterns via regexes.
* **Proposed Implementation**: Integrate dynamic RxNav interaction pre-check before LLM transmission.
* **Justification**: Prevents toxic drug combinations from being evaluated in the cloud without immediate local context.
* **Compatibility Impact**: Modifies helper signatures; requires updating `conv_processor.py` callers.
* **Risk Level**: `SAFE`
* **Migration Complexity**: Low

### 3. `src/services/conv_processor.py`
* **Target Class/Function**: `llm` (Function)
* **Current Implementation**: Lines 68-100. Calls `privacy.deidentify_text` before transmitting chat logs to the LLM client.
* **Proposed Implementation**: Intercept messages to execute safety checks (like RxNav and guardrails) before calling `GLOBAL_LLM_CLIENT`.
* **Justification**: Enforces unified safety boundaries.
* **Compatibility Impact**: None.
* **Risk Level**: `SAFE`
* **Migration Complexity**: Low