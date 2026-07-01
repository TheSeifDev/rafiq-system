# 🚨 Error Handling and Resilience

## Auto-Recovery System
* If API timeout limit is hit (`RAFIQ_API_TIMEOUT_RESTARTS` default = 5), Rafiq initiates a self-restart by exiting with code `100`.
* A launcher script monitors exit codes; if code `100` is returned, it restarts the process up to 3 times in a 60-second window before permanently stopping.
* Database operations fallback to read-only mode if write operations fail repeatedly.