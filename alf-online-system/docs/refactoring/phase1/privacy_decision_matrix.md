# 📊 Privacy Decision & ROI Matrix

This document provides a decision-making matrix and return-on-investment (ROI) analysis for the proposed refactoring options.

---

## 📈 ROI Evaluation

| Improvement Option | Engineering Effort | Privacy Improvement | Reliability Impact | User Value | Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Safe Harbor 18 Regex** | Low (2 days) | Medium (Shields text logs) | None | High (Trust) | `SAFE_TO_ADOPT` |
| **Local STT (Whisper)** | High (4 days) | High (Shields voice input) | Medium (Hardware dependencies) | Medium (Minor latency) | `ADAPT_REQUIRED` |
| **Local TTS (Piper)** | High (4 days) | High (Shields voice output) | Medium | Low (Robotic voices) | `NOT_RECOMMENDED` |
| **Hybrid TTS (Templates)** | Medium (3 days) | Medium (Shields routine alerts) | Low | High (Preserves natural voice) | `ADAPT_REQUIRED` |

---

## 🎯 Recommended Strategy

1. **Short-Term (Phase 1B)**: Implement Safe Harbor 18 text de-identification in `privacy.py` immediately to protect cloud LLM history logs.
2. **Medium-Term (Phase 4)**: Implement Local STT (local Whisper) to protect patient voice inputs.
3. **Long-Term**: Implement a **Hybrid TTS** model (synthesize standard scheduled alerts locally, use Azure Edge TTS only for dynamic, conversational responses).