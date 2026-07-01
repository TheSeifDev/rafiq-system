# ⚡ Risk Assessment & Mitigations

Below is a detailed risk matrix outlining potential architectural failure modes during surgical refactoring and their mitigations.

---

## 🛡️ Risk Matrix

| Risk ID | Risk Description | Severity | Likelihood | Mitigation Strategy | Risk Category |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **R-01** | PII De-identification regex fails on nested Arabic/English sentences. | Critical | Low | Safe Harbor 18 compliance validation checks with synthetic tests before deployment. | **SAFE** |
| **R-02** | Extra LLM step for AddRep query reframing increases conversation latency. | Medium | High | Add a timeout and latency threshold checker to dynamically bypass reframing. | **SAFE** |
| **R-03** | Local Silero VAD crashes due to missing PyAudio dependencies or CPU spikes. | High | Medium | Provide a robust fallback switch (`RAFIQ_USE_SIMPLE_VAD=1`) to standard energy check. | **CAUTION** |
| **R-04** | LangGraph agent routes user into an infinite loop state. | Critical | Low | Implement maximum transition depth counters on the agent runner. | **CAUTION** |
| **R-05** | Decoupled event bus locks the main thread, freezing the Electron UI. | High | Medium | Run the event loop in a dedicated background worker, communicating over async queues. | **HIGH RISK** |
| **R-06** | Multi-user database schema migration corrupts existing patient histories. | Critical | Medium | Trigger an automatic SQLite database backup script before running any migration. | **HIGH RISK** |