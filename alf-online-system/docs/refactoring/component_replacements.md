# 🔄 Component Replacements and Adaptations

Rafiq preserves its core systems (FastAPI, Electron, SQLite, ChromaDB, Groq, Gemini, Azure Edge TTS) but surgically replaces or adapts specific subcomponents.

| Subsystem | Current Rafiq | External Source | Proposed Solution | Classification | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PII De-identification** | Regex-based `privacy.py` | OpenMed | Adapt Safe Harbor 18 regexes & format fakes | `ADAPT_REQUIRED` | **High** |
| **Voice End-pointing** | Volume threshold | OpenOcto | Integrate Silero VAD locally | `ADAPT_REQUIRED` | **Medium** |
| **RAG Querying** | Direct text lookup | KidneyTalk (AddRep) | Add an agentic LLM query reframer | `SAFE_TO_ADOPT` | **Medium** |
| **Multi-User Memory** | Single User DB | OpenOcto | Partition SQLite/ChromaDB by `user_id` | `SAFE_TO_ADOPT` | **Low** |
| **System Daemon** | Batch launcher (`.bat`) | Local Voice AI | Parent Python supervisor daemon | `SAFE_TO_ADOPT` | **Low** |
| **Local LLM Engine** | None | Ollama / llama.cpp | Do NOT adopt (Keep Cloud-AI First) | `NOT_RECOMMENDED` | **None** |