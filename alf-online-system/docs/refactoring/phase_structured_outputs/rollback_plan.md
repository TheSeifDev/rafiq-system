# 🔄 Rollback Strategy: Structured Outputs

This document details the recovery protocols if structured outputs cause system crashes.

---

## 🛠️ Step-by-Step Rollback

1. **Global Schema Bypass Toggle**:
   * Add a flag `RAFIQ_BYPASS_SCHEMAS=1` in the local `.env` configuration file.
   * If this flag is enabled, all Pydantic `model_validate_json` calls will be bypassed, immediately routing raw responses to the original regex-based JSON extraction helper functions.

2. **Source Code Reversion**:
   * Revert modified files (`conv_processor.py`, `medical_agents.py`, `helpers.py`) to the pre-refactored version from Git:
     ```bash
     git checkout main -- src/services/conv_processor.py
     ```
   * Run the test suite:
     ```bash
     pytest tests/
     ```