# Repository Hygiene Scorecard

## Current Score: 6.0/10
The repository currently suffers from severe directory naming inconsistencies, duplicate frontend components, scattered documentation, and improper placement of runtime artifacts.

## Audit Findings Summary
| Category | Finding | Severity | Proposed Fix |
|---|---|---|---|
| **Root Cleanliness** | Transitory testing directories (`.rafiq_test_runtime`) and app configs are scattered. | High | Relocate to `.gitignore`d subdirectories (`tests/runtime`). |
| **Frontend Structure** | Significant duplication of components between root and `features/` folders. | Critical | Delete root components; standardize on feature-based routing. |
| **Code Structure** | Standard Python backend is named `src` while the frontend is `rafiq-gui/rafiq-gui`. | High | Enforce `backend/` and `frontend/` nomenclature. |
| **Documentation** | Scattered architecture descriptions lacking a single source of truth. | Medium | Merge `core.md`, `services.md`, `gui.md` etc. into `ARCHITECTURE.md`. |
| **Data Stores** | SQLite logs and databases are kept in unmanaged project roots. | High | Re-route to `data/databases/` and `data/chroma/`. |

---

## Final Enterprise Target Structure (Post-Migration Design)

```text
/
├── run_rafiq.bat
├── README.md
├── requirements.txt
├── .env
├── .env.example
├── .gitignore
├── .github/
├── backend/
│   ├── api/
│   ├── core/
│   ├── services/
│   ├── database/
│   ├── config/
│   ├── utils/
│   ├── gui_bridge.py
│   └── launcher/
│       └── rafiq_launcher.py
├── frontend/
│   ├── electron/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── data/
│   ├── databases/
│   │   └── rafiq_dev.db/
│   └── chroma/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API_REFERENCE.md
│   ├── adr/
│   └── archive/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── benchmark/
│   ├── fixtures/
│   └── runtime/
├── tools/
│   ├── benchmark.py
│   └── stability_test.py
└── logs/
```

## Projected Score (Post-Phase 4): 9.8/10
By adhering to this structure, the repository will achieve enterprise-grade decoupling of frontend and backend concerns, predictable artifact behavior, comprehensive testing isolation, and centralized architectural documentation.
