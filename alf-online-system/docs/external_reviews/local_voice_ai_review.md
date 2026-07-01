# 🏥 External Architecture Review: Local Voice AI

## strengths
* **LiveKit Agent Orchestration**: Ultra-low latency voice/audio streaming using WebRTC.
* **Supervisor Subprocess Lifecycle**: Single parent Python script managing uvicorn, llama.cpp, and LiveKit servers.
* **Kokoro TTS Integration**: Fast, high-quality local voice synthesis on CPU.

## weaknesses
* **Heavy Docker Overhead**: Multi-gigabyte image sizes and GPU driver setup requirements make it impractical for consumer desktop installers.
* **No Medical Safeties**: Lacks clinical memory, safety guardrails, or de-identification.
* **No Offline Fallback Logic**: Standard RAG and LLM calls fail completely if local servers crash, without auto-recovery.

## ideas worth stealing
* **Python Subprocess Supervisor**: Implementing a Python daemon to manage, monitor, and restart child servers instead of bat files. `[SAFE_TO_ADOPT]`
* **WebRTC Voice Transport**: LiveKit agent framework for real-time streaming to frontend in future phases. `[ADAPT_REQUIRED]`

## components worth replacing
* None. (Azure Edge TTS and Groq are preserved for Cloud-AI First).

## components worth adapting
* **Service Lifecycle Manager**: Adapt the Python supervisor process to monitor the FastAPI uvicorn port and Electron window, replacing the `run_rafiq.bat` script. `[ADAPT_REQUIRED]`

## patterns worth adopting
* **Unidirectional Child Process Pipelines**: Running local microservices communicating purely over 127.0.0.1. `[SAFE_TO_ADOPT]`

## anti-patterns to avoid
* **Docker-Only Distribution**: Packaging desktop apps inside thick Docker containers for end-users. `[NOT_RECOMMENDED]`