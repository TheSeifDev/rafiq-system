# 📋 Product Requirements Document (PRD) - Rafiq System MVP

## 1. Product Scope
Rafiq is an Electron-based desktop application wrapping a Python FastAPI backend. It provides text and voice interaction for medication management, safety alerts, and general medical queries.

## 2. Core Functional Requirements
* **Voice Flow**: Wake word activation -> audio recording -> local de-identification -> cloud transcription -> LLM processing -> local re-identification -> text-to-speech output.
* **Medication Management**: Track pill schedules, dose events (taken/skipped), and stock level depletion.
* **Safety Guards**: Intercept questions via a local medical router, block dangerous advice, check drug interactions via RxNav.
* **Emergency Hub**: Trigger local fallback emergency alerts immediately for life-threatening queries without waiting for LLMs.

## 3. Non-Functional Requirements
* **Latency**: Voice loop response within 2.5 seconds.
* **Privacy**: 100% local database storage. Strict PHI redaction filtering in all logs.