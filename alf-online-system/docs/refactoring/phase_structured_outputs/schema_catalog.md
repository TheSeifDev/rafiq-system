# 📖 Pydantic Schema Catalog

This catalog outlines all Pydantic schemas derived from actual Rafiq outputs.

---

## 1. MemoryFact
* **Model Purpose**: Extracted patient background facts.
* **Fields**:
  * `category`: `str` (allowed: `personal`, `medical`, `preference`, `mood`).
  * `key`: `str` (the attribute name).
  * `value`: `str` (the value details).
* **Validation Rules**: Category must be one of the four enums. Key and value cannot be empty.
* **Example Valid Payload**:
  ```json
  {"category": "medical", "key": "allergies", "value": "Penicillin"}
  ```
* **Example Invalid Payload**:
  ```json
  {"category": "random_category", "key": "", "value": "None"}
  ```

---

## 2. MedicationIntent
* **Model Purpose**: Extracted medication details for database insertion.
* **Fields**:
  * `med_name`: `str` (brand/generic name).
  * `condition`: `str` (indication).
  * `dose`: `str` (dosage text).
  * `time_str`: `str` (timing details).
  * `food_relation`: `str` (allowed: `before_meal`, `after_meal`, `with_meal`, `none`).
  * `supply_info`: `str` (pill count).
* **Validation Rules**: Food relation must match enums.
* **Example Valid Payload**:
  ```json
  {"med_name": "Aspirin", "condition": "Heart care", "dose": "81mg", "time_str": "9 AM", "food_relation": "after_meal", "supply_info": "30 pills"}
  ```
* **Example Invalid Payload**:
  ```json
  {"med_name": "Aspirin", "food_relation": "invalid_enum_val"}
  ```

---

## 3. ReminderIntent
* **Model Purpose**: Calendar and reminder event parameters.
* **Fields**:
  * `title`: `str` (event name).
  * `time_str`: `str` (raw time details).
  * `details`: `str` (additional notes).
* **Validation Rules**: Title and time_str are required.
* **Example Valid Payload**:
  ```json
  {"title": "موعد طبيب الأسنان", "time_str": "الساعة 5 مساءً", "details": "عيادة النور"}
  ```
* **Example Invalid Payload**:
  ```json
  {"details": "No title or time present"}
  ```

---

## 4. MedicalResponse
* **Model Purpose**: Output from the medical consultation ReAct agent.
* **Fields**:
  * `arabic_response`: `str`
  * `who_sources_used`: `list[str]`
  * `requires_doctor_referral`: `bool`
* **Example Valid Payload**:
  ```json
  {"arabic_response": "أنصحك بالراحة وشرب السوائل.", "who_sources_used": ["https://www.who.int"], "requires_doctor_referral": false}
  ```
* **Example Invalid Payload**:
  ```json
  {"who_sources_used": "Not a list"}
  ```

---

## 5. EmergencyAssessment
* **Model Purpose**: Triage evaluation.
* **Fields**:
  * `is_emergency`: `bool`
  * `severity`: `str` (allowed: `critical`, `high`, `medium`, `low`)
  * `primary_symptom`: `str`
  * `suggested_action`: `str`
* **Example Valid Payload**:
  ```json
  {"is_emergency": true, "severity": "critical", "primary_symptom": "Chest pain", "suggested_action": "Call ambulance"}
  ```
* **Example Invalid Payload**:
  ```json
  {"is_emergency": "not_a_boolean"}
  ```

---

## 6. DrugInteractionResult
* **Model Purpose**: RxNav/local DB check outputs.
* **Fields**:
  * `has_interaction`: `bool`
  * `severity`: `str`
  * `description`: `str`
  * `source`: `str`
* **Example Valid Payload**:
  ```json
  {"has_interaction": true, "severity": "major", "description": "خطر النزيف عند استخدام الدوائين معاً", "source": "RxNav"}
  ```
* **Example Invalid Payload**:
  ```json
  {"has_interaction": true, "source": ""}
  ```

---

## 7. SearchIntent
* **Model Purpose**: RAG search query parameters.
* **Fields**:
  * `query`: `str`
  * `reframed_query`: `str`
  * `is_medical`: `bool`
* **Example Valid Payload**:
  ```json
  {"query": "عندي صداع", "reframed_query": "headache symptoms", "is_medical": true}
  ```
* **Example Invalid Payload**:
  ```json
  {"is_medical": "Yes"}
  ```

---

## 8. WHOQueryResult
* **Model Purpose**: Matching ChromaDB document vectors.
* **Fields**:
  * `chunk_id`: `str`
  * `title`: `str`
  * `url`: `str`
  * `text`: `str`
* **Example Valid Payload**:
  ```json
  {"chunk_id": "chunk_1", "title": "WHO Headache guidelines", "url": "https://who.int/headache", "text": "Supportive treatments..."}
  ```
* **Example Invalid Payload**:
  ```json
  {"chunk_id": "", "url": "not-a-valid-url"}
  ```