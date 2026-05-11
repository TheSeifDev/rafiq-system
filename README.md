# RAFIQ AI - Production-Ready Offline Healthcare Assistant

## System Architecture

```
rafiq-ai (Whisper/STT + Ollama/Claude LLM + TTS)
    ↓ HTTP
rafiq-backend (Fastify + SQLite + SSE + MQTT)
    ↓ SSE
rafiq-gui (Electron + React + Framer Motion)
```

**IMPORTANT:** GUI NEVER talks directly to AI. All communication flows through the backend.

---

## Quick Start

### 1. Start Backend

```bash
cd rafiq-backend
npm start
```

Backend runs on `http://localhost:3001`

### 2. Start GUI (Development)

```bash
cd rafiq-gui
npm install  # if not done
npm run electron:dev
```

This starts:
- Vite dev server on port 5173
- Electron app pointing to dev server

### 3. Start GUI (Production)

```bash
cd rafiq-gui
npm start
```

---

## Testing the GUI

The backend includes test endpoints to simulate AI events:

### Trigger AI States

```bash
# Test listening state
curl -X POST http://localhost:3001/test/ai-state -H "Content-Type: application/json" -d "{\"state\":\"listening\"}"

# Test thinking state
curl -X POST http://localhost:3001/test/ai-state -H "Content-Type: application/json" -d "{\"state\":\"thinking\"}"

# Test speaking with text
curl -X POST http://localhost:3001/test/speaking -H "Content-Type: application/json" -d "{\"text\":\"Hello, how can I help you today?\"}"

# Test idle
curl -X POST http://localhost:3001/test/ai-state -H "Content-Type: application/json" -d "{\"state\":\"idle\"}"

# Test emergency
curl -X POST http://localhost:3001/test/emergency -H "Content-Type: application/json" -d "{\"level\":\"high\",\"message\":\"Fall detected\"}"

# Run demo sequence
curl -X POST http://localhost:3001/test/demo
```

---

## Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/events` | SSE stream |
| POST | `/test/ai-state` | Test AI state |
| POST | `/test/speaking` | Test speaking |
| POST | `/test/emergency` | Test emergency |
| POST | `/test/demo` | Run demo sequence |
| POST | `/ai/chat` | AI chat |
| GET | `/patients` | List patients |
| POST | `/alerts` | Create alert |
| GET | `/smarthome` | Smart home status |

---

## SSE Events

The backend broadcasts these events to all connected clients:

```javascript
// AI state change
broadcast('ai_state', { state: 'listening' | 'thinking' | 'speaking' | 'idle' | 'sleep' | 'offline' | 'warning' | 'emergency' })

// Speaking text
broadcast('speaking', { text: 'مرحبا' })

// Emotion
broadcast('emotion', { emotion: 'happy' | 'calm' | 'focused' })

// Emergency
broadcast('emergency', { level: 'low' | 'medium' | 'high', message: '...' })

// Offline
broadcast('offline', {})
```

---

## AI States

| State | Color | Description |
|-------|-------|-------------|
| `idle` | Cyan | Ready, breathing glow |
| `listening` | Mint | Active, faster pulse |
| `thinking` | Blue | Processing, thinking dots visible |
| `speaking` | Mint | Displaying text, mouth animation |
| `sleep` | Slate | Dimmed, no particles |
| `offline` | Gray | Disconnected |
| `warning` | Orange | Alert warning |
| `emergency` | Red | Critical alert |

---

## GUI Features

### AI Face
- Glowing neon orb (164px diameter)
- 3 orbit rings with particles
- White glowing eyes
- SVG smile/mouth animation
- Multi-layer neon box-shadow glow

### Layout (800x480 Portrait)
```
┌─────────────────────┐
│     RAFIQ AI        │ ← Header (top: 38px)
│                     │
│       ╭─────╮      │
│    ╭──┤  ◉   ├──╮   │ ← Face scene (centered)
│    │  ╰─────╯  │   │
│    │   ◯ ◯     │   │ ← Orbit rings
│    ╰──────────╯    │
│                     │
│  Hello, how can I   │ ← Speaking area (73%)
│  assist you today?  │
│       • • •         │ ← Thinking dots (ONLY during thinking)
│  ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿  │ ← Bottom waves (30% height)
└─────────────────────┘
```

---

## Build Commands

### GUI Build
```bash
cd rafiq-gui
npm run build    # Production build
npm run dev      # Vite dev server only
npm run electron:dev  # Vite + Electron
npm start        # Production Electron
```

### Backend Check
```bash
cd rafiq-backend
node --check src/server.js
npm start
```

---

## Configuration

### Backend (.env)
```
RAFIQ_API_KEY=your-secret-key
PORT=3001
HOST=0.0.0.0
NODE_ENV=production
```

### GUI (.env)
```
VITE_API_URL=http://localhost:3001
```

---

## Ubuntu Kiosk Setup

1. Copy service file:
```bash
sudo cp rafiq-gui/scripts/rafiq-gui.service /etc/systemd/system/
```

2. Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable rafiQ-gui
sudo systemctl start rafiQ-gui
```

---

## System Status

| Component | Status | Location |
|-----------|--------|----------|
| Backend | ✅ Ready | rafiq-backend/ |
| SSE Events | ✅ Working | /events endpoint |
| GUI Build | ✅ Success | dist/ folder |
| Test Routes | ✅ Added | /test/* |
| CORS | ✅ Configured | localhost:5173 allowed |

---

## Running Full System

1. Start backend:
```bash
cd rafiq-backend && npm start
```

2. In another terminal, start GUI:
```bash
cd rafiq-gui && npm run electron:dev
```

3. Test SSE events:
```bash
# In third terminal
curl -X POST http://localhost:3001/test/ai-state -H "Content-Type: application/json" -d "{\"state\":\"thinking\"}"
curl -X POST http://localhost:3001/test/speaking -H "Content-Type: application/json" -d "{\"text\":\"Hello from RAFIQ!\"}"
```

---

## Development Notes

- GUI uses `isDev = !app.isPackaged` to detect dev vs prod mode
- In dev mode: loads `http://localhost:5173`
- In prod mode: loads `dist/index.html`
- All SSE events come through the backend (not direct AI)
- AI communicates with backend via HTTP, backend broadcasts to GUI via SSE
