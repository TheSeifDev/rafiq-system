# 🛡️ Medical Guardrails

## Core Rules
1. **No Dosage Advice**: Block explicit metric terms like `500mg` or `2 tablets` in LLM output.
2. **Diagnosis Block**: Prevent absolute diagnostic statements (e.g. "أنت مصاب بـ" or "You have"). Instead, recommend consulting a doctor.
3. **Source Verification**: Ensure every medical advice contains valid URL references pointing to approved domains.