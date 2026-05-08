# Rafiq V3 Hardening Audit Report

Date: 2026-04-28
Scope: `testv3` only

## What was audited

- API behavior and authentication
- DB layer safety and side effects
- Supabase sync queue behavior
- Test isolation and regression coverage
- Static quality and security gates

## Implemented hardening outcomes

1. **Security baseline**
- `API_KEY` is required by default.
- Explicit development-only fallback (`ALLOW_INSECURE_DEV_API_KEY`) added.
- Unified API error envelope for machine-readable client handling.

2. **Side-effect control**
- Removed DB auto-initialization at import time.
- DB initialization now happens at app lifespan startup.
- Test DB path is isolated from runtime DB.

3. **Timezone correctness**
- Reminder input now requires timezone-aware datetime.
- Naive datetimes are rejected with validation errors.

4. **Sync robustness**
- Queue flush now reports `dropped` malformed entries.
- Unknown operations and invalid queue table names are dropped explicitly.

5. **Project hygiene**
- Source-only cleanup done (runtime DB and zip artifacts removed).
- `.gitignore` added to prevent artifact reintroduction.

6. **External strict-review fixes (post-audit)**
- `PUT /patients/{id}` now rejects `name: null` at validation level (422) and maps DB integrity failures to a stable 422 error contract.
- `/sync/pull` now uses pull-scope tables only (`pull_fresh`) instead of full-table pull.
- Pull pagination now uses explicit ordering (`order=id.asc`) to prevent unstable page windows.
- Added controlled local prune for pull-owned tables (`patients`, `emergency_contacts`, `reminders`) to propagate remote deletions safely.
- Added regression tests for null-name update rejection and prune behavior (including pending-reminder preservation).

## Quality gate evidence

Executed via:

```bash
python quality_gate.py
```

Gate checks passed:
- Unit tests: PASS
- Ruff lint: PASS
- Mypy type check: PASS
- Bandit security scan: PASS
- pip-audit dependency scan: PASS (no known vulnerabilities)

## Residual risk notes

- Dynamic SQL is still used in controlled/whitelisted paths; guarded with whitelists and Bandit `# nosec B608` annotations where applicable.
- Production security still depends on secure secret management for `.env` and host hardening.
- There is no deterministic method to prove code is "human-written"; provenance and quality evidence increase confidence but cannot guarantee third-party AI classification outcomes.
