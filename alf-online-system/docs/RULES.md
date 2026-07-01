# 📏 Engineering Rules & Guidelines

* **R-001**: Keep the core domain logic framework-agnostic. Domain rules (e.g. guardrails, privacy) must never import FastAPI or Electron modules.
* **R-002**: Never commit secrets or API keys. Always load from `.env` through `src.config.settings`.
* **R-003**: Every database write transaction in SQLite must have a try-except block to gracefully catch database locks and retry.
* **R-004**: Always de-identify text before sending to LLM APIs and re-identify response.