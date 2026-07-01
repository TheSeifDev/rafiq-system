# 🕵️ PHI Leakage & Cloud Boundary Assessment

Below is a detailed analysis of the cloud data transmission boundaries in Rafiq System and the associated privacy leakage risks.

---

## 🔍 Boundary Analysis

### 1. Groq STT Privacy Boundary
* **File Name**: `src/services/stt_service.py`
* **Function/Class**: `transcribe_audio` / `LAST_VOICE_EMOTION`
* **Code Location**: Lines 1-70.
* **Leakage Source**: Spoken audio containing patient voice features and raw PII (names, conditions) sent directly to Groq Whisper cloud endpoint for transcription.
* **Example Scenario**: Patient says: *"أهلاً يا رفيق، أنا أحمد ومريض سكري وعنواني شارع الهرم"* (I am Ahmed, diabetic, Cairo, etc.).
* **Current Protection**: None. Audio bytes are transmitted directly over the network to Groq Cloud.
* **Remaining Risk**: High. Patient voice signature and spoken PII are exposed to Groq.
* **Recommended Mitigation**: None in Phase 1 (Groq STT is preserved). Long-term mitigation: Migrate to local Whisper inference.
* **Risk Level**: **HIGH**
* **Likelihood**: High (every voice interaction transmits spoken PII).

### 2. Gemini Embedding Boundary
* **File Name**: `src/services/embedding_service.py`
* **Function/Class**: `get_embedding`
* **Code Location**: Lines 1-50.
* **Leakage Source**: Vector embedding request sending text chunks of clinical facts to Google Gemini Embedding API.
* **Example Scenario**: Storing the fact *"أحمد يأخذ دواء الأنسولين يومياً"* (Ahmed takes insulin daily) in ChromaDB triggers an embedding call to Google.
* **Current Protection**: Partially filtered if the facts are written via `conv_processor` which de-identifies names. However, if facts are written directly to ChromaDB without passing through the de-identifier, they leak.
* **Remaining Risk**: Medium.
* **Recommended Mitigation**: Enforce `deidentify_text` on all text chunks before calling `get_embedding`.
* **Risk Level**: **MEDIUM**
* **Likelihood**: Medium.

### 3. Azure Edge TTS Boundary
* **File Name**: `src/services/tts_service.py`
* **Function/Class**: `speak`
* **Code Location**: Lines 100-200.
* **Leakage Source**: Re-identified text sent to Microsoft Azure Edge TTS to generate natural speech audio.
* **Example Scenario**: Backend tells the user: *"أهلاً يا أحمد، حان وقت جرعة الأنسولين"* (Hello Ahmed, it is time for your insulin). The text containing "أحمد" is sent to Azure.
* **Current Protection**: None. The text is re-identified so that the patient hears their real name in the generated audio.
* **Remaining Risk**: High. Patient names and health reminders are sent to Microsoft's cloud servers.
* **Recommended Mitigation**: Document as an inherent cloud boundary limitation. Long-term mitigation: Migrate to a fully local speech synthesizer (like Kokoro or Piper).
* **Risk Level**: **HIGH**
* **Likelihood**: High (every spoken response sends PII to Azure).

### 4. ChromaDB Storage Boundary
* **File Name**: `src/database/clinical_memory.py`
* **Function/Class**: `ClinicalMemory` / `store_fact`
* **Code Location**: Lines 1-120.
* **Leakage Source**: Local database storage on the host machine disk.
* **Example Scenario**: Storing patient medical history facts locally.
* **Current Protection**: Chroma DB folders (`rafiq_chroma_v4`) are stored locally.
* **Remaining Risk**: Low. If an attacker gains physical or remote access to the host machine, they can read cleartext database files.
* **Recommended Mitigation**: Implement database folder encryption (e.g. BitLocker or folder level encryption) for production.
* **Risk Level**: **LOW**
* **Likelihood**: Low.

### 5. SQLite Storage Boundary
* **File Name**: `src/database/db_operational.py`
* **Function/Class**: `RafiqDB`
* **Code Location**: Lines 63-95.
* **Leakage Source**: Cleartext SQLite database file `test_rafiq_v4_1.db` stored locally.
* **Example Scenario**: Attacker accesses the SQLite file and reads patient chat history and medication schedule records.
* **Current Protection**: Relies on host operating system file access permissions.
* **Remaining Risk**: Low.
* **Recommended Mitigation**: Migrate to SQLCipher to encrypt the SQLite database file on disk.
* **Risk Level**: **LOW**
* **Likelihood**: Low.