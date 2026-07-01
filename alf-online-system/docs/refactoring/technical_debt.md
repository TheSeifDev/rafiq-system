# 💸 Rafiq System Technical Debt Register

Below is the documented technical debt identified in the current Rafiq System codebase, categorized by priority and impact.

---

### 1. SQLite Compatibility Shim (High Debt)
* **Location**: `src/database/db_operational.py` (`_ChromaCompatConnection` & `_ChromaCompatCursor`)
* **Description**: A temporary bridge wrapper that exposes SQLite queries in a format expected by legacy code.
* **Impact**: Increases maintenance overhead and obfuscates standard async database calls.
* **Refactor Plan**: Refactor legacy callers to use standard SQLite commands directly.

### 2. Simple Regex-Based Pseudonymizer (Medium Debt)
* **Location**: `src/core/privacy.py`
* **Description**: Uses basic regular expressions to identify patient names, phones, and emails.
* **Impact**: Risks leaking PHI if a patient formats their name or contact info in an unexpected way.
* **Refactor Plan**: Adapt OpenMed's comprehensive PII regex rules and incorporate local Presidio or lightweight token-based classifications.

### 3. Energy-Threshold Voice End-pointing (Medium Debt)
* **Location**: `src/services/voice_listener.py`
* **Description**: Detects the end of patient speech using basic audio volume thresholds.
* **Impact**: Prone to premature cut-offs during pauses or indefinite recording in noisy environments.
* **Refactor Plan**: Adapt Silero VAD (Voice Activity Detection) for robust, local end-pointing.

### 4. Single-User Database Design (Low Debt)
* **Location**: `src/database/db_operational.py` & `src/database/clinical_memory.py`
* **Description**: Assumes only one user profile exists per installation.
* **Impact**: Prevents multiple family members from using the system concurrently.
* **Refactor Plan**: Implement multi-user directory partitioning and SQLite column isolation based on OpenOcto's model.