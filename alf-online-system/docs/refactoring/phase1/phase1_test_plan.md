# 🧪 Test Plan: Phase 1 (Safety & Privacy)

This document defines the test suite required to verify that Phase 1 improvements meet the safety and privacy acceptance criteria.

---

## 📈 Test Cases

### 1. HIPAA Safe Harbor 18 Verification
* **Objective**: Ensure that all 18 identifiers are successfully redacted.
* **Test Inputs**:
  * Name variations: *"اسمي عبد الرحمن"* (compound Arabic name), *"My name is John Doe"*.
  * Phone variations: *"01123456789"* (Egyptian mobile), *"01099998888"*, International: `+201211110000`.
  * Date variations: *"تاريخ ميلادي 15/05/1984"*, *"Born on May 12, 1990"*.
  * Geographic subdivisons: *"أعيش في شارع التسعين بالتجمع الخامس"* (multi-word address).
  * MRNs: *"الملف الطبي رقم MRN-998877-A"*.
* **Expected Output**: Text returned contains no raw names, real birthdates, zip codes, or actual phone numbers.

### 2. RxNav Local Pre-Check Verification
* **Objective**: Verify that toxic drug combinations trigger warnings.
* **Test Inputs**: Ask the assistant to log taking *"Warfarin"* while already on *"Aspirin"*.
* **Expected Output**: The system must warn of the high risk of internal bleeding instantly, invoking local warnings prior to LLM generation.