# ⚡ Risk Review: Phase 1

This document assesses the architectural risks associated with the Phase 1 de-identification and safety guardrail refactoring.

---

## 🛡️ Risk Matrix

### 1. False Positives in PII Redaction
* **Exact File**: `src/core/privacy.py`
* **Target Function**: `Pseudonymizer.deidentify`
* **Code Location**: Lines 243-356.
* **Why it exists**: Regex matching for ages or zip codes might accidentally capture valid clinical dosages (e.g. "take 50 mg") or measurements.
* **Likelihood**: High (occurs frequently when users state medication strengths or diagnostic values).

### 2. Performance Latency of Regex Compiles
* **Exact File**: `src/core/privacy.py`
* **Target Function**: `deidentify`
* **Why it exists**: Compiling and executing multiple complex regular expressions on every chat message adds processing overhead.
* **Likelihood**: Medium (negligible for short chat lines, but can add up to 150ms on long paragraphs).