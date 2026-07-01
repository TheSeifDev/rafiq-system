# 🎯 Phase 1 Design Document: Safety & Privacy

This document outlines the architectural design for the Phase 1 refactoring of Rafiq System, focusing on complete HIPAA Safe Harbor 18 de-identification coverage and pre-processing safety checks.

---

## 🏗️ Design Pillars

### 1. Robust Safe Harbor 18 De-identification
* **Location**: `src/core/privacy.py` (Class `Pseudonymizer`, method `deidentify`)
* **Objective**: Replace simple regexes with a comprehensive list of all 18 HIPAA Safe Harbor identifiers.
* **Mechanism**:
  * Implement dynamic maps for names, addresses, and phone numbers.
  * Implement date-shifting logic that preserves intervals but masks absolute dates.
  * Mask geographic subdivisions smaller than a state (e.g. zip codes, street names) with format-preserving fakes.
  * Detect alphanumeric Medical Record Numbers (MRNs) and replace them with synthetic codes.

### 2. Local RxNav Pre-processing Guard
* **Location**: `src/core/medical_guardrails.py` (Method `validate_medical_answer`)
* **Objective**: Intercept clinical interactions locally to verify drug-to-drug safety before transmitting data to cloud LLMs.
* **Mechanism**: Use the local SQLite and RxNav database files to check interaction risks dynamically, updating the system prompt with warnings before the LLM generates advice.