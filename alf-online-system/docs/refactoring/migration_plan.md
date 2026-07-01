# 🗺️ Incremental Refactoring & Migration Plan

This document outlines the multi-horizon roadmap to surgically refactor Rafiq System's technical debt and incorporate improvements without breaking backward compatibility.

---

## 📅 Roadmap Horizons

### Horizon 1: Quick Wins (1 Day)
* **Task**: Clean up `db_operational.py` legacy SQLite compat shims.
* **Impact**: Reduces backend technical debt and simplifies database calls.
* **Risk**: Low (requires careful refactoring of test suites).
* **Classification**: `SAFE_TO_ADOPT`

### Horizon 2: Short-Term Improvements (1 Week)
* **Task**: Enhance PII de-identification in `privacy.py` using OpenMed's Safe Harbor regexes.
* **Impact**: Significantly reduces the risk of leaking clinical PHI.
* **Risk**: Low.
* **Classification**: `ADAPT_REQUIRED`

### Horizon 3: Medium-Term Improvements (1 Month)
* **Task**: Integrate Silero VAD into `voice_listener.py` and AddRep query reframing in `who_rag.py`.
* **Impact**: Improves conversational voice endpoints and RAG accuracy for Arabic dialects.
* **Risk**: Medium (adds minor latency to RAG searches; requires testing VAD on low-end machines).
* **Classification**: `ADAPT_REQUIRED`

### Horizon 4: Long-Term Improvements (3 Months)
* **Task**: Implement multi-user isolated profiles in SQLite/ChromaDB.
* **Impact**: Supports multi-family home use.
* **Risk**: Medium (requires database schema migration).
* **Classification**: `SAFE_TO_ADOPT`

---

## 🎯 Subsystem Learning Map

Identify which external project each Rafiq subsystem should draw architectural inspiration from:

* **PII & Privacy Filter**: Learn from **OpenMed** (HIPAA Safe Harbor 18 mapping and on-device anonymization).
* **Voice VAD End-pointing**: Learn from **OpenOcto** (Silero VAD integration).
* **RAG Enhancement**: Learn from **KidneyTalk-open** (AddRep multi-agent query reframing).
* **Service Lifecycle Supervisor**: Learn from **Local Voice AI** (Python child process management).