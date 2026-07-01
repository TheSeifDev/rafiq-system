# ⚠️ Risk Assessment and Mitigations

* **LLM Hallucinations**: Mitigated by forcing the LLM to search WHO databases and return references. If no WHO sources are returned, it falls back to a warning.
* **Drug Interaction Outages**: Mitigated by loading a local `drug_interactions.json` file on disk if RxNav API is unreachable.
* **Emergency Delay**: Handled by bypassing LLM altogether when local regex detects chest pain or breathing issues, showing local instructions instantly.