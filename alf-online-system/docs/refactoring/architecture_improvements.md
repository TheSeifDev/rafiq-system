# 🏗️ Architecture Improvements Proposal

Based on the comparative analysis of external projects, we propose the following surgical refactoring improvements for Rafiq System:

---

### 1. Privacy First: Robust Safe Harbor 18 De-identification
* **Improvement**: Refactor `src/core/privacy.py` to support all 18 HIPAA Safe Harbor identifiers.
* **Mechanism**: Incorporate OpenMed's regex mappings and design a structured fallback for format-preserving fakes (e.g., mapping realistic fake names and addresses).
* **Vision Alignment**: Maintains Cloud-AI First while ensuring zero PII/PHI leakage.

### 2. Voice Pipeline: Silero VAD Integration
* **Improvement**: Integrate Silero Voice Activity Detection (VAD) into `src/services/voice_listener.py`.
* **Mechanism**: Replace volume-based thresholds with local VAD model checking to accurately detect patient speech start/stop.
* **Vision Alignment**: Retains Azure Edge TTS and Groq STT while improving local audio capture stability.

### 3. RAG System: AddRep Adaptive Query Reframing
* **Improvement**: Implement a query reframing step in `src/services/who_rag.py`.
* **Mechanism**: Use a fast LLM call (via Groq) to convert colloquial Arabic dialects into clinical English/Arabic search queries before searching ChromaDB.
* **Vision Alignment**: Improves RAG precision using cloud-AI reasoning on local clinical databases.

### 4. Memory Architecture: Multi-User Profile Isolation
* **Improvement**: Refactor database queries to support multi-user profiles.
* **Mechanism**: Partition SQLite database tables by `user_id` and segment ChromaDB vector collections dynamically.
* **Vision Alignment**: Ensures clean local memory division.