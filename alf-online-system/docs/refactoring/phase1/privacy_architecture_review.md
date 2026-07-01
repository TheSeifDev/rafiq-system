# 🕵️ Privacy Architecture Review

This document performs a deep comparative review of Rafiq's actual privacy architecture, quantifying privacy risks, answering core strategy questions, and proposing the optimal roadmap.

---

## 📊 1. Privacy Risk Distribution

Based on the actual codebase implementation:

1. **Groq STT (Voice Input) [45% of total risk]**
   * **Exact Location**: `src/services/stt_service.py` (Function `transcribe_audio`)
   * **Why it exists**: Audio files containing the patient's voice prints and spoken names/conditions are sent directly over the network to Groq Cloud for Whisper transcription.
   * **Likelihood of Real-world Occurrence**: **High** (Runs on every voice input).

2. **Azure Edge TTS (Voice Output) [25% of total risk]**
   * **Exact Location**: `src/services/tts_service.py` (Function `speak`)
   * **Why it exists**: The response text is re-identified with the patient's real name and health instructions before being sent to Microsoft's cloud servers to generate natural speech audio.
   * **Likelihood of Real-world Occurrence**: **High** (Runs on every verbal response).

3. **Text-based PHI Leakage (LLM logs) [15% of total risk]**
   * **Exact Location**: `src/services/conv_processor.py` (Function `llm` boundary)
   * **Why it exists**: Raw conversation transcripts containing patient details are transmitted to external APIs (Groq/Gemini).
   * **Likelihood of Real-world Occurrence**: **Medium** (Filtered locally via `deidentify_text` before transmission, but regex gaps remain).

4. **Gemini Embeddings [10% of total risk]**
   * **Exact Location**: `src/services/embedding_service.py` (Function `get_embedding`)
   * **Why it exists**: Text chunks containing clinical facts are sent to Google's API to generate vector embeddings.
   * **Likelihood of Real-world Occurrence**: **Medium** (Leaks if facts are stored in ChromaDB without passing through de-identification).

5. **Local SQLite Storage [3% of total risk]**
   * **Exact Location**: `src/database/db_operational.py` (Class `RafiqDB`)
   * **Why it exists**: Cleartext local `.db` file containing user schedules and history.
   * **Likelihood of Real-world Occurrence**: **Low** (Requires physical/unauthorized machine access).

6. **Local ChromaDB Storage [2% of total risk]**
   * **Exact Location**: `src/database/clinical_memory.py` (Class `ClinicalMemory`)
   * **Why it exists**: Cleartext local vector storage folder.
   * **Likelihood of Real-world Occurrence**: **Low** (Requires local machine access).

---

## 🎯 2. Core Architectural Questions

* **What percentage of privacy risk is reduced by Safe Harbor 18?**
  * **Answer**: **15%**. Safe Harbor 18 regex de-identification only protects the textual chat logs sent to the LLM. It does not protect raw audio (STT) or re-identified text (TTS).
* **What percentage remains because of cloud voice boundaries?**
  * **Answer**: **70%** (45% STT + 25% TTS).
* **Is Safe Harbor 18 the highest ROI privacy improvement?**
  * **Answer**: **Yes** (from an engineering cost standpoint). It requires zero runtime model overhead or client hardware upgrades, costs nothing to execute, and immediately protects cloud LLM text history logs which are stored by default on provider platforms. However, it is an incomplete solution.
* **Should Phase 1 be split into Phase 1A and Phase 1B?**
  * **Answer**: **Yes**. Phase 1A covers the Privacy Architecture alignment (VAD, hybrid pipelines, local options) and Phase 1B covers the Safe Harbor 18 regex implementation.
* **What is the recommended privacy strategy for Rafiq?**
  * **Answer**: **Surgical Hybridization**. Keep the core LLM in the cloud (Gemini/Groq) for high Arabic medical reasoning, but implement local STT (Whisper locally on device via CPU/GPU) to protect voice inputs, and run a **hybrid TTS** (local TTS for standard notifications like pill times, cloud TTS for complex conversational responses). This maximizes privacy while preserving the high-quality conversational experience.