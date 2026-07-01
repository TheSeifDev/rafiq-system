# 🧪 Refactoring Testing Strategy

To ensure zero regressions and maintain backward compatibility, we enforce the following testing strategy during refactoring:

---

## 📈 Test Requirements

### 1. Mocking Framework
* External cloud endpoints (Groq, Gemini, Azure Edge) must be fully mocked inside `tests/conftest.py`.
* Tests must run completely offline.

### 2. Unit Testing
* **PII Filter**: Feed 100 synthetic prompts containing varying structures of names, addresses, and credit cards. Verify zero leakage.
* **Pydantic Schemas**: Assert validation schemas reject invalid formats (e.g. malformed time strings in medication triggers).

### 3. Integration Testing
* **Speech-to-Text VAD**: Simulate audio streaming chunks and assert VAD model endpoints accurately under background noise.
* **Database Migrations**: Execute test migrations on standard test database snapshots and assert data consistency.

### 4. Regression Verification
* Execute the core test suite:
  ```bash
  pytest tests/
  ```
* Code coverage target for modified modules is **>90%**.