# 🕵️ Privacy and PHI Redaction Model

## De-identification Flow
1. Patient inputs: *"اسمي أحمد وأعيش في القاهرة وعندي صداع"* (My name is Ahmed, I live in Cairo, I have a headache).
2. The `Pseudonymizer` registers:
   * `"أحمد"` -> `"يوسف علي"` (male name mapping).
   * `"القاهرة"` -> `"طنطا"` (location mapping).
3. System sends to LLM: *"اسمي يوسف علي وأعيش في طنطا وعندي صداع"*.
4. LLM returns response using the fake name and fake location.
5. `Pseudonymizer` replaces fake names and locations back with original values before presenting to patient.