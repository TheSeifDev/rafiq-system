# 👁️ Observability and Logging

## System Log Location
* Logs are stored in `logs/rafiq.log`.

## Logging Configurations
* Enforces `INFO` logging level for production and `DEBUG` for development.
* All loggers automatically filter PHI using the `PHIRedactingFilter` mapping class.