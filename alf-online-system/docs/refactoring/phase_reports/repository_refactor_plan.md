# Repository Refactoring Plan

## Executive Summary
This document outlines the strategy for migrating the `rafiq-system` repository to an enterprise-grade structure, strictly adhering to the requirements provided.

## Phase 1: Directory Structure Alignment
1. **backend/**: Rename `src/` to `backend/`. Move `rafiq_launcher.py` to `backend/launcher/`.
2. **frontend/**: Rename `rafiq-gui/rafiq-gui/` to `frontend/` and delete empty parent folder `rafiq-gui/`.
3. **data/**:
   - Rename `test_rafiq_v4_1.db/` to `data/databases/rafiq_dev.db/`.
   - Ensure all chroma directories are placed under `data/chroma/` (Note: we will update the config to separate SQLite files and Chroma directories instead of bundling them in the `.db` folder).
4. **tests/**: Update `benchmark_*.py` files into `tests/benchmark/`.
5. **docs/**:
   - Rename `ARCHITECTURE_DECISIONS/` to `docs/adr/`.
   - Consolidate root markdown files (`MISSION.md`, `VISION.md`, `ROADMAP.md`, `PROJECT_IDENTITY.md`, `CONTRIBUTING.md`, `DECISIONS.md`, `PRD.md`) into `docs/`.
   - Ensure `memory/`, `agents/`, `scratch/` are correctly placed in `docs/archive/`.
6. **tests/fixtures/**: Rename `benchmark_who_rag_dir/` to `tests/fixtures/who_rag/`.

## Phase 2: Imports & Configuration Migration
1. Global Search and Replace for Python imports:
   - `src.` -> `backend.`
   - `from src` -> `from backend`
   - `import src` -> `import backend`
2. Update `.env` paths or copy it to `backend/.env`. Ensure config maps appropriately.
3. Update `backend/config/settings.py` to reflect new data structure (`data/databases/` and `data/chroma/`).
4. Modify `run_rafiq.bat` to launch `python backend/launcher/rafiq_launcher.py`.
5. Ensure `backend/launcher/rafiq_launcher.py` starts the `frontend/` Electron app properly and loads `backend.gui_bridge`.

## Phase 3: Testing & Runtime Policy Compliance
1. Audit all tests in `tests/` to guarantee they use `tests/runtime/` for all SQLite and Chroma stores.
2. Implement teardown fixtures to automatically remove `tests/runtime/` after test runs.

## Phase 4: Final Cleanup & Validation
1. Verify root directory compliance (only `run_rafiq.bat`, `README.md`, `requirements.txt`, `.env.example`).
2. Generate all post-migration reports.
3. Execute `run_rafiq.bat` and all tests for validation.
