# Rafiq V3 Hardening Provenance

This document records why changes were made, what alternatives were considered, and the tradeoffs chosen during the hardening pass.

## 1) Security configuration decisions

- **Decision:** `API_KEY` is now mandatory by default.
- **Why:** Random per-process keys create operational drift and can silently break clients after restart.
- **Alternative rejected:** keep random fallback in production.  
  Rejected because it weakens deployment predictability.
- **Compromise kept:** explicit local-only fallback via `ALLOW_INSECURE_DEV_API_KEY=1`.

## 2) Import side-effects removal

- **Decision:** removed `db.init_db()` execution on module import.
- **Why:** import-time writes make tests flaky and cause hidden state mutations.
- **Alternative rejected:** keep auto-init and add more test cleanup.  
  Rejected because side-effects remain implicit and fragile.

## 3) Timezone strictness for reminders

- **Decision:** reminder `time` now uses timezone-aware validation.
- **Why:** project policy requires Cairo-aware scheduling and explicit timezone correctness.
- **Alternative rejected:** regex-only validation with optional timezone.  
  Rejected because it allows ambiguous local times.

## 4) Error contract unification

- **Decision:** all API failures now return `{success: false, error: {code, message, details?}}`.
- **Why:** clients and tests need stable machine-readable errors.
- **Alternative rejected:** keep mixed FastAPI default `detail` payloads.

## 5) Sync queue hardening

- **Decision:** queue processing now drops invalid table/operation records explicitly and reports `dropped`.
- **Why:** previous behavior could fail repeatedly without clear classification.
- **Alternative rejected:** keep retry-only behavior for malformed queue entries.

## 6) Test isolation strategy

- **Decision:** tests use dedicated DB path under `.test_artifacts` and clear state per test.
- **Why:** prevents contamination of runtime DB and avoids global-state leaks.
- **Alternative rejected:** reuse `rafiq.db` and truncate after suite.

## 7) Quality gate choice

- **Decision:** added `quality_gate.py` with strict sequence:
  - unit tests
  - ruff
  - mypy (strict profile)
  - bandit
  - pip-audit
- **Why:** gives a single deterministic acceptance path before delivery.

## 8) Null update safety for patient names

- **Decision:** `PatientUpdate` now rejects explicit `name: null`, and API maps SQLite integrity failures to 422 `invalid_update`.
- **Why:** `patients.name` is `NOT NULL`; accepting explicit null caused incorrect server-side failure paths.
- **Alternative rejected:** rely only on DB constraints and return generic 500.

## 9) Pull-scope enforcement for `/sync/pull`

- **Decision:** `/sync/pull` now calls `pull_fresh()` (only pull-capable tables), not `pull_all()`.
- **Why:** prevents accidental ingestion of PUSH-only tables from remote.
- **Alternative rejected:** keep global table pull and depend on downstream ignores.

## 10) Delete propagation from remote

- **Decision:** added `prune_missing_from_sync(table, remote_ids)` and invoked it after successful pull completion.
- **Why:** upsert-only pull leaves stale local rows when remote rows are deleted.
- **Alternative rejected:** keep additive-only sync and accept orphan accumulation.
- **Constraint kept:** reminders with pending local queue operations are preserved during prune.

## 11) Stable pagination ordering on pull

- **Decision:** pull requests now include `order=id.asc`.
- **Why:** offset pagination without explicit ordering can duplicate/skip rows during concurrent writes.
- **Alternative rejected:** offset-only pagination with unspecified order.
