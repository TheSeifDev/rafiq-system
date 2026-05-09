# RAFIQ Backend - Mini PC Setup & MQTT Issue

## Current Status

The RAFIQ backend is now fully running and operational.

Working services:

* Fastify backend server
* SQLite local database
* Supabase sync
* SSE real-time events
* AI routes
* Patients & alerts API
* Smart-home API structure

Server output:

```bash
✅ SQLite ready
✅ Supabase sync enabled
🚀 RAFIQ backend running at http://0.0.0.0:3001
```

---

# Current Remaining Issue

MQTT broker is not running yet.

Current error:

```bash
[mqtt] connect ECONNREFUSED 127.0.0.1:1883
```

This means:

* RAFIQ backend is trying to connect to a local MQTT broker
* but Mosquitto (or another broker) is not installed/running yet

---

# Required Fix

Install and run Mosquitto MQTT broker on the Mini PC.

---

# Ubuntu Installation

```bash
sudo apt update

sudo apt install mosquitto mosquitto-clients -y
```

Enable service:

```bash
sudo systemctl enable mosquitto
```

Start service:

```bash
sudo systemctl start mosquitto
```

Check status:

```bash
sudo systemctl status mosquitto
```

Test broker:

```bash
mosquitto_sub -t test/topic
```

In another terminal:

```bash
mosquitto_pub -t test/topic -m "hello"
```

If working correctly:

* subscriber should receive the message

---

# RAFIQ MQTT Topics

Alerts:

```text
rafiq/alerts/+
```

Device states:

```text
rafiq/devices/+/state
```

Device commands:

```text
rafiq/devices/+/cmd
```

Emergency:

```text
rafiq/emergency
```

---

# Backend Start Command

```bash
cd rafiq-backend
npm start
```

Expected final output:

```bash
✅ SQLite ready
✅ Supabase sync enabled
✅ MQTT bridge ready

🚀 RAFIQ backend running at http://0.0.0.0:3001
```

---

# Architecture Notes

RAFIQ is designed as an offline-first edge AI system.

Main architecture:

* SQLite = primary local database
* Supabase = cloud sync only
* MQTT = ESP32 / smart-home communication
* Fastify = backend API
* SSE = real-time GUI/mobile updates
* Ollama = local AI inference

---

# Important Notes

1. Use Node.js 22 LTS only
2. Do NOT use Node 24
3. Keep backend lightweight
4. Do not move business logic into Electron
5. Backend is the system core

---

# Backend Port

Default:

```text
3001
```

Accessible on LAN:

```text
http://MINI_PC_IP:3001
```

---

# Next Planned Integration

* ESP32 sensors
* Fall detection
* Smart-home automation
* Electron GUI connection
* Mobile app connection
* Voice AI runtime integration
