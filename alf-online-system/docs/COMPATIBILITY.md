# 🔄 Backward Compatibility

* **Database Migration**: If database schema changes occur, `db_operational.py` runs `_maybe_migrate_legacy_sqlite` to copy old patient logs and schedules to the new schema without losing data.
* **API Versioning**: GUI bridge paths do not version yet, but future endpoints will be prefixed with `/api/v1/`.