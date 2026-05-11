# RAFIQ GUI

Touchscreen AI Assistant Interface for Mini PC

## Overview

RAFIQ is a futuristic Edge AI healthcare assistant GUI designed for a 7-inch touchscreen on a Mini PC running Ubuntu. It provides an emotionally friendly, calm interface optimized for elderly users.

## Features

- **Animated AI Face**: SVG-based orb with eyes, mouth, and dynamic glow effects
- **Voice Interaction**: Real-time listening, thinking, and speaking animations
- **Subtitle Display**: Smooth scrolling text during AI speech
- **Emergency Alerts**: Full-screen overlay for critical notifications
- **Offline Support**: Graceful degradation when disconnected
- **Touch Optimized**: Large touch targets for elderly users

## Architecture

```
rafiq-gui/
├── electron/          # Electron main process
├── src/
│   ├── components/   # React components
│   │   ├── face/     # AI face (Orb, Eyes, Mouth, etc.)
│   │   ├── subtitles/
│   │   ├── alerts/
│   │   └── ui/
│   ├── store/        # Zustand state management
│   ├── services/     # SSE connection service
│   ├── hooks/        # Custom React hooks
│   ├── animations/   # Framer Motion configs
│   └── pages/        # Main pages
└── scripts/          # Ubuntu autostart scripts
```

## Tech Stack

- **Electron**: Desktop app framework
- **React 18**: UI library
- **Vite**: Build tool
- **TailwindCSS**: Styling
- **Framer Motion**: Animations
- **Zustand**: State management

## Installation

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production build
npm run build

# Run Electron
npm start
```

## Backend Integration

The GUI connects to the backend via SSE at `http://localhost:3001/events`.

### SSE Events

| Event | Payload | Description |
|-------|---------|-------------|
| `ai_state` | `{ state: "listening" }` | AI state change |
| `speaking` | `{ text: "Hello" }` | AI speaking with subtitle |
| `emergency` | `{ level: "high", message: "Fall detected" }` | Emergency alert |
| `offline` | `{}` | Backend disconnected |

### State Machine

```
idle ←→ listening ←→ thinking ←→ speaking
  ↓         ↓           ↓          ↓
sleep   (auto-transition via SSE)
  ↓
warning ←→ emergency
  ↓
offline
```

## Kiosk Mode Setup (Ubuntu)

```bash
# Run setup script
chmod +x scripts/setup-autostart.sh
./scripts/setup-autostart.sh

# Or manually install systemd service
sudo cp scripts/rafiq-gui.service /etc/systemd/system/
sudo systemctl enable rafiq-gui
sudo systemctl start rafiq-gui
```

## Display Configuration (800x480)

The app is optimized for 800x480 resolution. Configure in `electron/main.js`:

```javascript
mainWindow = new BrowserWindow({
  width: 800,
  height: 480,
  // ...
});
```

## Design Guidelines

### Colors
- Background: `#0a0f1a` (dark blue-black)
- Primary Glow: `#00d4ff` (cyan)
- Accent: `#00ffcc` (teal)
- Warning: `#ff9500` (orange)
- Emergency: `#ff3b5c` (red)

### Animations
- Idle breathing: 4s cycle
- Listening rings: expanding every 1.5s
- Speaking wave: 0.4s cycle
- State transitions: 0.3s ease

## Performance

- GPU-accelerated transforms
- CSS containment for isolated repaints
- Debounced resize handlers
- Efficient SVG rendering (no WebGL)

## License

MIT