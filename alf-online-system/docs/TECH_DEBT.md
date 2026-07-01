# 💸 Technical Debt Register

1. **SQLite Compatibility Shim**: `db_operational.py` contains class `_ChromaCompatConnection` which acts as a wrapper shim. This should be refactored once tests are fully migrated.
2. **PyAudio Installer**: Windows installation requires precompiled `.whl` files which must be manual.
3. **No Database Encryption**: Operational DB holds patient medication schedules in cleartext SQLite database.