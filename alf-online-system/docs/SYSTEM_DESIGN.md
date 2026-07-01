# ⚙️ Detailed System Design

## 1. Threading and Concurrency
* Python's GIL is mitigated by using a thread pool executor (`_pool`) with a default of 16 workers for CPU-bound tasks like embedding generation and transcription.
* Non-blocking async/await calls are enforced for all HTTP/SSE operations in FastAPI.

## 2. Audio Pipeline
* **Capture**: PyAudio records voice input when activated.
* **Transcription**: Audio chunks are sent to Groq Whisper API for quick text transcription.
* **Speech Generation**: Text output is converted to audio bytes via Azure Edge TTS and played locally using system player (`ffplay`).