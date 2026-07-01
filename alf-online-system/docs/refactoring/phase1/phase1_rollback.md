# 🔄 Rollback Strategy: Phase 1

This document defines the rollback procedures if Phase 1 updates introduce errors or regressions.

---

## 🛠️ Step-by-Step Rollback

1. **Feature Flag Deactivation**:
   * If PII de-identification is malforming responses, set the environment variable:
     ```env
     RAFIQ_DISABLE_PRIVACY=1
     ```
   * This immediately bypasses `privacy.deidentify_text` and `privacy.reidentify_text` in `conv_processor.py` (Line 71 and Line 91), reverting the system to raw data pass-through.

2. **Source Code Reversion**:
   * Revert the `src/core/privacy.py` file to the pre-refactored version from Git:
     ```bash
     git checkout main -- src/core/privacy.py
     ```
   * Run the core verification test suite to ensure the system is stable:
     ```bash
     pytest tests/
     ```