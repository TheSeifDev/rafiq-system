# 🔒 Security and Vulnerability Model

## Threat Modeling
1. **API Key Theft**: Blocked by loading keys only from local `.env` and warning users against committing config files.
2. **Log Leakage**: Prevented by applying `PHIRedactingFilter` to all root and local loggers in `src/core/privacy.py`.
3. **Database Compromise**: SQLite and Chroma DB stores are stored locally. In future phases, SQLite database encryption (SQLCipher) will be activated.