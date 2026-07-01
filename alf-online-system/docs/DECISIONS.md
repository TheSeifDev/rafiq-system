# 🧠 Product Decisions Log

* **PD-001**: Selected Electron over pure Web browser deployment to allow direct access to local audio hardware (Whisper, PyAudio, Edge TTS) and local databases.
* **PD-002**: Chose a hybrid DB setup: SQLite for structured relational tables (schedules, audit logs) and ChromaDB for vector-based clinical memory.
* **PD-003**: Enforced strict client-side pseudonymization (`Pseudonymizer`) before calling cloud APIs, rather than sending raw text, to comply with HIPAA/GDPR constraints.