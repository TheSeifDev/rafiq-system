# Root Directory Reduction Plan

## Current State Evaluation
The root directory currently houses multiple active components, configuration files, and transient test directories that pollute the enterprise-grade structure.

## Target Violations
The following items are NOT permitted in the root directory under the Enterprise Target Structure:
- `rafiq_launcher.py` (Functional Code)
- `test_rafiq_v4_1.db/` (Runtime Data)
- `.rafiq_cache/` (Runtime Cache)
- `.rafiq_test_runtime/` (Testing Artifacts)
- `rafiq-gui/` (Non-standard naming for frontend)
- `src/` (Non-standard naming for backend)

## Relocation Strategy
1. **rafiq_launcher.py**: Move to `backend/launcher/rafiq_launcher.py`. Update `run_rafiq.bat` to execute `python backend/launcher/rafiq_launcher.py`.
2. **test_rafiq_v4_1.db/**: Rename to `rafiq_dev.db/` and move into `data/databases/`.
3. **.rafiq_cache/**: Update cache configs to place this inside `data/.rafiq_cache/`. Delete the root version.
4. **.rafiq_test_runtime/**: Update test configs to use `tests/runtime/`. Delete the root version.
5. **rafiq-gui/ & src/**: Rename to `frontend/` and `backend/`.

## Remaining Root Components (Approved)
After reduction, ONLY the following items will be permitted to reside in the root directory:
- `.env`
- `.env.example`
- `.git/`
- `.github/`
- `.gitignore`
- `README.md`
- `requirements.txt`
- `run_rafiq.bat`
- `backend/`
- `frontend/`
- `data/`
- `docs/`
- `tests/`
- `tools/`
- `logs/`
