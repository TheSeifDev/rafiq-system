# RAFIQ Backend - Setup Guide

## Quick Start (Development)

### 1. Install Visual Studio Build Tools (Windows)

For better-sqlite3 to compile, you need Visual Studio with C++ workload:

1. Download [Visual Studio Installer](https://visualstudio.microsoft.com/downloads/)
2. Install Visual Studio 2022 (or newer)
3. Select **"Desktop development with C++"** workload
4. Complete installation (~3GB)

### 2. Rebuild native modules

```bash
cd rafiq-backend
npm rebuild better-sqlite3
```

### 3. Start the server

```bash
npm start
```

The server will run at `http://localhost:3001`

## Project Structure

```
rafiq-backend/
├── src/
│   ├── server.js              # Main entry point
│   ├── api/
│   │   ├── index.js           # Route registration
│   │   ├── routes/
│   │   │   ├── ai.js          # AI chat endpoints
│   │   │   ├── patients.js    # Patient CRUD
│   │   │   ├── alerts.js      # Alerts & emergencies
│   │   │   └── smarthome.js   # Smart home control
│   │   └── middleware/auth.js # Auth middleware
│   ├── db/
│   │   ├── index.js           # DB initialization
│   │   ├── schema.sql         # SQLite schema
│   │   ├── patients.js        # Patient queries
│   │   ├── alerts.js          # Alert queries
│   │   ├── devices.js         # Device queries
│   │   └── utils.js           # DB utilities
│   ├── services/ai.js         # AI service (Ollama/Anthropic)
│   ├── smarthome/mqtt.js      # MQTT bridge
│   ├── sockets/sse.js         # Server-Sent Events
│   ├── sync/supabase.js       # Supabase sync
│   └── utils/time.js          # Time utilities
├── data/                      # SQLite database location
├── .env                      # Environment config
├── package.json
└── SETUP.md                  # This file
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/events` | SSE real-time events |
| GET/POST | `/patients` | Patient CRUD |
| GET/POST | `/alerts` | Alert management |
| POST | `/emergency` | Emergency broadcast |
| GET/POST | `/smarthome` | Smart home control |
| POST | `/smarthome/cmd` | Send device command |
| POST | `/ai/chat` | AI chat (Ollama/Anthropic) |
| POST | `/sync/push` | Push to Supabase |
| POST | `/sync/pull` | Pull from Supabase |

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
PORT=3001
HOST=0.0.0.0
RAFIQ_API_KEY=your-secret-key
DB_PATH=./data/rafiq.db
OLLAMA_URL=http://127.0.0.1:11434
SUPABASE_URL=
SUPABASE_KEY=
MQTT_BROKER=mqtt://127.0.0.1:1883
```

## MQTT Topics

- `rafiq/alerts/{patient_id}` - Emergency alerts
- `rafiq/smarthome/{room}/{device}/state` - Device state
- `rafiq/smarthome/{room}/{device}/cmd` - Device commands

## Production Deployment

For Mini PC deployment:

1. Install Node.js 20+
2. Copy project files
3. Run `npm install --production`
4. Run `npm start`
5. Configure firewall for port 3001