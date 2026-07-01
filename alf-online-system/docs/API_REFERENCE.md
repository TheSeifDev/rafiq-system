# 📖 API Reference (FastAPI Backend)

## Endpoints
* `GET /api/status`: Returns engine status, API connectivity, and active models.
* `POST /api/chat`: Handles textual user queries. Returns JSON response.
* `GET /api/stream`: SSE (Server-Sent Events) endpoint streaming audio states, transcribed text, and assistant status.
* `POST /api/medication/add`: Registers a new medication and schedules.# 🔌 FastAPI API Reference Details

Details routes in `gui_bridge.py`:
* `/api/status` [GET]: returns health metrics.
* `/api/chat` [POST]: JSON payload containing queries.
* `/api/stream` [GET]: SSE server streaming payload events.
