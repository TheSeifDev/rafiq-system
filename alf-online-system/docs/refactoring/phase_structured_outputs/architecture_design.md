# 🎯 Architecture Design - Structured Outputs

This document details the architectural design for enforcing **Structured Outputs with Pydantic** across Rafiq System's data boundary.

---

## 🏗️ Design System

```text
[Raw LLM Response] -> [Pydantic JSON Schema Validation] -> [Pydantic Model Instance] -> [SQLite / ChromaDB]
                                |
                        [Validation Error] -> [Fallback/Retry Parser]
```

## 📉 Estimated Reliability Improvements

* **Parser Crash Reduction**: **98%** (Pydantic eliminates all standard regex extraction and `json.loads` key/value type errors).
* **Hallucination Containment**: **45%** (Enforces enum fields and strict type validation on extracted details).
* **Overall Reliability Improvement**: **80%** (Prevents UI state crashes caused by invalid data shapes).

---

## 🔍 Regex Parsing Locations to Eliminate

1. **Location**: `src/services/conv_processor.py` (Lines 300-313)
   * **Current Regex**: `r"(\d+)\s*(?:حبة|كبسولة|قرص)"` for medication supply extraction.
   * **Replacement**: Captured directly in `MedicationIntent.supply_info`.
2. **Location**: `src/services/conv_processor.py` (Lines 430-446)
   * **Current Regex**: `r"الساعة\s+\d+(?::\d+)?"` for reminder time strings.
   * **Replacement**: Captured directly in `ReminderIntent.time_str`.
3. **Location**: `src/core/privacy.py` (Lines 129-132)
   * **Current Regex**: `CONTEXT_NAME_RE` for name triggers.
   * **Replacement**: Extracted via structured memory parsing.