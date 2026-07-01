# Rollback Plan: Enterprise Re-Architecture (Phase 3)

## Overview
Because Phase 3 involves modifying 197 import paths across 52 Python scripts alongside massive directory mutations, there is a risk of cascading module resolution failures. If `startup_validation_report.md` or `full_test_suite_validation` fails post-migration, this rollback plan must be executed immediately.

## Rollback Strategy: Git Reset
Since we are enforcing that Phase 3 is executed in a completely clean, isolated Git branch without any feature changes, the primary rollback strategy is a hard reset.

```powershell
# 1. Abort current changes and restore branch to pre-Phase 3 state
git reset --hard HEAD
git clean -fd

# 2. Re-verify runtime integrity
python rafiq_launcher.py
```

## Rollback Strategy: Manual Reversion
If Git cannot be used, the following manual steps reverse `migrate_to_enterprise.ps1`:

1. **Revert Directories**:
   - Rename `backend` back to `src`.
   - Recreate `rafiq-gui/` and move `frontend/` back to `rafiq-gui/rafiq-gui`.
   - Move `data/databases/rafiq_dev.db` back to `test_rafiq_v4_1.db`.
   - Move `backend/launcher/rafiq_launcher.py` back to `rafiq_launcher.py` in the root.
2. **Revert Python Imports**:
   - Run a global reverse find-and-replace:
     - `from backend` -> `from src`
     - `import backend` -> `import src`
     - `data/databases/rafiq_dev.db` -> `test_rafiq_v4_1.db`
3. **Revert Configurations**:
   - Restore `run_rafiq.bat` to execute `python rafiq_launcher.py`.
