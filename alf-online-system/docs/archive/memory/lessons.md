# 🎓 Lessons Learned

* **Whisper API Latency**: Groq Whisper is highly responsive but requires clean WAV files. Sending audio with low sample rates causes transcription errors.
* **ChromaDB Path Issues**: Under Windows, absolute file paths for ChromaDB need careful forward slash conversion to avoid locking databases.