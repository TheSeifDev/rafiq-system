

---

# Chapter 51: The Complete Database Schema - Every Table, Every Column

## Table: chat_history

This table stores every single message exchanged between the user and Rafiq. Think of it as a complete log of every conversation.

```sql
CREATE TABLE chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    timestamp TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL
);
```

**Columns Explained**:
- `id`: A unique auto-incrementing number. Every message gets one.
- `session_id`: Groups messages that happened in the same conversation session.
- `timestamp`: When the message was sent. Format: YYYY-MM-DD HH:MM:SS.
- `role`: Who sent the message - "user" or "assistant".
- `content`: The actual text of the message.

**Example Data**:
```
id: 1
session_id: "sess_abc123"
timestamp: "2025-01-15 10:30:00"
role: "user"
content: "Hello Rafiq"
```

## Table: memory_facts

This table stores important facts about the patient that Rafiq should remember over time.

```sql
CREATE TABLE memory_facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    fact_val TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    updated TEXT
);
```

**Columns Explained**:
- `id`: Unique identifier for each fact.
- `category`: Type of fact (e.g., "allergy", "preference", "condition", "family").
- `key`: A short label for the fact (e.g., "peanut_allergy", "doctor_name").
- `fact_val`: The actual fact text (e.g., "Patient is allergic to peanuts").
- `confidence`: How sure Rafiq is about this fact (0.0 to 1.0).
- `updated`: When the fact was last updated.

**Example Data**:
```
id: 1
category: "allergy"
key: "peanut_allergy"
fact_val: "Patient is allergic to peanuts and experiences severe reactions."
confidence: 0.95
updated: "2025-01-10"
```

## Table: medications

This table stores all medicines the patient is currently taking or has taken in the past.

```sql
CREATE TABLE medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_name TEXT NOT NULL,
    med_name TEXT NOT NULL,
    condition TEXT,
    dose TEXT,
    time_str TEXT,
    food_relation TEXT,
    total_doses INTEGER,
    remaining_doses INTEGER,
    is_chronic INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    notes TEXT,
    created_at TEXT
);
```

**Columns Explained**:
- `id`: Unique identifier for the medicine.
- `patient_name`: The patient's name for this medicine record.
- `med_name`: The name of the medicine (e.g., "Concor", "Panadol").
- `condition`: What condition the medicine treats (e.g., "High blood pressure").
- `dose`: How much to take (e.g., "1 pill").
- `time_str`: When to take it (e.g., "08:00").
- `food_relation`: Relation to food - "before", "after", "with", or "none".
- `total_doses`: Total number of doses prescribed (for non-chronic medicines).
- `remaining_doses`: How many doses are left in the current package.
- `is_chronic`: 1 if the medicine is taken continuously, 0 if it is a temporary course.
- `active`: 1 if this medicine is currently being taken, 0 if it was stopped.
- `notes`: Free text field for any additional notes.
- `created_at`: When the record was created.

## Table: reminders

This table stores the schedule for when medicine reminders should fire.

```sql
CREATE TABLE reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    med_id INTEGER NOT NULL,
    patient_name TEXT NOT NULL,
    message TEXT NOT NULL,
    sched_time TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    next_attempt TEXT,
    created TEXT
);
```

**Columns Explained**:
- `id`: Unique identifier for the reminder.
- `med_id`: Links to the medications table to know which medicine this reminder is for.
- `patient_name`: The patient's name.
- `message`: The text that will be spoken when the reminder fires.
- `sched_time`: The date and time when the reminder should trigger.
- `status`: Current status - "pending", "awaiting_confirmation", "snoozed", "confirmed", "expired", "cancelled", or "alarmed".
- `attempts`: How many times the reminder has been triggered without a confirmation.
- `next_attempt`: For snoozed reminders, when to try again.
- `created`: When the reminder was created.

## Table: dose_events

This table is a log of every time the patient confirmed, skipped, or snoozed a dose.

```sql
CREATE TABLE dose_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    med_id INTEGER NOT NULL,
    reminder_id INTEGER,
    patient_name TEXT NOT NULL,
    taken_at TEXT NOT NULL,
    sched_time TEXT NOT NULL,
    status TEXT NOT NULL,
    source TEXT,
    notes TEXT
);
```

**Columns Explained**:
- `id`: Unique identifier for the dose event.
- `med_id`: Links to the medications table.
- `reminder_id`: Links to the reminders table (optional).
- `patient_name`: The patient's name.
- `taken_at`: When the patient confirmed or skipped the dose.
- `sched_time`: When the dose was originally scheduled.
- `status`: "confirmed", "missed", or "snoozed".
- `source`: How the dose was recorded - e.g., "voice", "gui", "auto".
- `notes`: Any additional notes.

## Table: health_streaks

This table tracks how consistently the patient has been taking each medicine.

```sql
CREATE TABLE health_streaks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_name TEXT NOT NULL,
    med_id INTEGER NOT NULL,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    last_taken TEXT,
    total_doses_taken INTEGER DEFAULT 0,
    UNIQUE(patient_name, med_id)
);
```

**Columns Explained**:
- `id`: Unique identifier.
- `patient_name`: The patient's name.
- `med_id`: Links to the medications table.
- `current_streak`: How many consecutive days the patient has taken this medicine.
- `best_streak`: The longest streak ever achieved for this medicine.
- `last_taken`: When the patient last took this medicine.
- `total_doses_taken`: Total number of doses ever taken (tracked over time).

## Table: app_events

This table logs important system events for debugging and monitoring.

```sql
CREATE TABLE app_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    event_type TEXT NOT NULL,
    level TEXT NOT NULL CHECK(level IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
    source TEXT,
    message TEXT,
    metadata TEXT
);
```

**Columns Explained**:
- `id`: Unique identifier.
- `timestamp`: When the event occurred.
- `event_type`: What type of event (e.g., "stt_complete", "tts_start", "reminder_fired").
- `level`: Severity - INFO, WARNING, ERROR, or CRITICAL.
- `source`: Which part of the system generated the event (e.g., "voice_listener", "scheduler").
- `message`: Human-readable description.
- `metadata`: JSON string with extra details.

## Table: audit_logs

This table tracks changes to important data for security and accountability.

```sql
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    user TEXT NOT NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id INTEGER,
    details TEXT
);
```

**Columns Explained**:
- `id`: Unique identifier.
- `timestamp`: When the action occurred.
- `user`: Who performed the action.
- `action`: What was done (e.g., "delete_medication", "update_reminder").
- `table_name`: Which database table was affected.
- `record_id`: Which specific record was changed.
- `details`: JSON with before/after values.

## Table: emergency_events

This table records any emergency situations that were detected.

```sql
CREATE TABLE emergency_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    event_type TEXT NOT NULL,
    details TEXT,
    resolved INTEGER DEFAULT 0
);
```

**Columns Explained**:
- `id`: Unique identifier.
- `timestamp`: When the emergency was detected.
- `event_type`: Type of emergency (e.g., "chest_pain", "breathing_difficulty").
- `details`: Additional information about the emergency.
- `resolved`: 0 if the emergency is still active, 1 if it has been resolved.

## Table: assistant_settings

This table stores Rafiq's current configuration and state.

```sql
CREATE TABLE assistant_settings (
    id INTEGER PRIMARY KEY,
    assistant_state TEXT NOT NULL DEFAULT 'PASSIVE',
    locked INTEGER DEFAULT 0,
    pin_code TEXT,
    volume_level REAL DEFAULT 1.0,
    tts_enabled INTEGER DEFAULT 1,
    stt_enabled INTEGER DEFAULT 1
);
```

**Columns Explained**:
- `id`: Always 1 (there is only one row in this table).
- `assistant_state`: Current state - PASSIVE, LISTENING, PROCESSING, SPEAKING, AWAITING_REMINDER_RESPONSE, DISABLED, LOCKED, ERROR.
- `locked`: 1 if the assistant is locked, 0 if it is unlocked.
- `pin_code`: The PIN code required to unlock the assistant (hashed).
- `volume_level`: Master volume (0.0 to 1.0).
- `tts_enabled`: 1 if text-to-speech is active, 0 if it is muted.
- `stt_enabled`: 1 if speech-to-text is active, 0 if it is disabled.

---

# Chapter 52: The Complete API Reference - Every Endpoint

## Base URL

- SSE Events: http://127.0.0.1:3001
- API: http://127.0.0.1:3002

## Authentication

All API requests (except /health and /ready) must include:
```
X-API-Key: your_bridge_api_key
```

Get the key from the .rafiq_bridge_key file generated on startup.

## Health Endpoints

### GET /health
**Description**: Simple health check.
**Response**:
```json
{
  "status": "ok",
  "service": "rafiq-api"
}
```

### GET /ready
**Description**: Checks if the backend is fully initialized.
**Response** (ready):
```json
{
  "status": "ready"
}
```
**Response** (initializing):
```json
{
  "status": "initializing"
}
```

## Chat Endpoints

### POST /chat
**Description**: Send a message to Rafiq and get a response.
**Request**:
```json
{
  "text": "Hello Rafiq",
  "session_id": "optional-session-id"
}
```
**Response**:
```json
{
  "status": "ok",
  "request_id": "req_abc123",
  "session_id": "sess_def456"
}
```

## State Endpoints

### POST /state
**Description**: Update the assistant state.
**Request**:
```json
{
  "state": "listening"
}
```
**Valid states**: listening, thinking, idle

### GET /assistant/state
**Description**: Get the current assistant state.
**Response**:
```json
{
  "status": "ok",
  "assistant_state": "PASSIVE"
}
```

### POST /assistant/toggle
**Description**: Toggle the assistant on/off.
**Response**:
```json
{
  "status": "ok",
  "assistant_state": "DISABLED"
}
```

### POST /assistant/barge_in
**Description**: Trigger barge-in (stop speaking and start listening).
**Response**:
```json
{
  "status": "ok",
  "assistant_state": "LISTENING"
}
```

## Medication Endpoints

### GET /medications
**Description**: Get all active medications.
**Response**:
```json
[
  {
    "id": 1,
    "patient_name": "Faris",
    "med_name": "Concor",
    "dose": "1 pill",
    "time_str": "08:00",
    "is_chronic": 0
  }
]
```

### POST /medications
**Description**: Add a new medication.
**Request**:
```json
{
  "med_name": "Panadol",
  "dose": "1 pill",
  "time_str": "14:00",
  "condition": "Headache"
}
```
**Response**:
```json
{
  "status": "ok",
  "med_id": 2
}
```

### PUT /medications/{med_id}
**Description**: Update a medication.
**Request**:
```json
{
  "dose": "2 pills"
}
```

### DELETE /medications/{med_id}
**Description**: Delete a medication and its associated reminders.
**Response**:
```json
{
  "status": "ok"
}
```

## Reminder Endpoints

### GET /reminders
**Description**: Get all pending reminders.
**Response**:
```json
[
  {
    "id": 1,
    "med_id": 1,
    "patient_name": "Faris",
    "message": "Time for your Concor!",
    "sched_time": "2025-01-16T08:00:00",
    "status": "pending"
  }
]
```

### POST /reminders
**Description**: Create a new reminder.
**Request**:
```json
{
  "med_id": 1,
  "message": "Take Concor",
  "sched_time": "2025-01-16T08:00:00"
}
```
**Response**:
```json
{
  "status": "ok",
  "reminder_id": 1
}
```

### PUT /reminders/{reminder_id}
**Description**: Update a reminder.
**Request**:
```json
{
  "sched_time": "2025-01-16T09:00:00",
  "status": "snoozed"
}
```

### DELETE /reminders/{reminder_id}
**Description**: Delete a reminder.
**Response**:
```json
{
  "status": "ok"
}
```

## Memory Endpoints

### GET /memory
**Description**: Get all stored memories for the patient.
**Response**:
```json
{
  "patient_name": "Faris",
  "memories": [
    {
      "id": "1",
      "source": "SQLite Memory Fact",
      "text": "Faris is allergic to peanuts",
      "category": "allergy"
    }
  ]
}
```

### POST /memory/facts
**Description**: Add a new memory fact.
**Request**:
```json
{
  "text": "Faris prefers morning appointments",
  "source": "sqlite",
  "category": "preference"
}
```
**Response**:
```json
{
  "status": "ok",
  "fact_id": "2"
}
```

### PUT /memory/facts/{fact_id}
**Description**: Update a memory fact.
**Request**:
```json
{
  "text": "Updated fact text"
}
```

### DELETE /memory/facts/{fact_id}
**Description**: Delete a memory fact.
**Response**:
```json
{
  "status": "ok"
}
```

## System Endpoints

### POST /restart
**Description**: Restart the backend.
**Response**:
```json
{
  "status": "ok",
  "message": "Backend shutting down for restart"
}
```

## Observability Endpoints

### GET /observability/report
**Description**: Get a daily observability report.
**Response**:
```json
{
  "report": "Daily summary..."
}
```

### GET /observability/beta
**Description**: Get beta telemetry summary.
**Response**:
```json
{
  "version": "4.2",
  "uptime": "24h"
}
```

---

# Chapter 53: The Complete Environment Variables Reference

## Required Variables

### GROQ_API_KEY
The API key for Groq AI services. Without this, Rafiq cannot use the primary AI provider.
- **Example**: GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx
- **Required**: Yes
- **Where to get**: https://console.groq.com

## Optional Variables

### GOOGLE_API_KEY
The API key for Google AI (Gemini). Used as a fallback provider.
- **Example**: GOOGLE_API_KEY=AIzaSyA...
- **Required**: No
- **Where to get**: https://makersuite.google.com/app/apikey

### OPENROUTER_API_KEY
The API key for OpenRouter. Used as a tertiary fallback.
- **Example**: OPENROUTER_API_KEY=sk-or-v1-...
- **Required**: No
- **Where to get**: https://openrouter.com/keys

### NVIDIA_NIM_API_KEY
The API key for NVIDIA NIM. Used as a quaternary fallback.
- **Example**: NVIDIA_NIM_API_KEY=nvapi-...
- **Required**: No
- **Where to get**: https://build.nvidia.com

### RAFIQ_DB_PATH
The file path to the SQLite database.
- **Default**: data/rafiq_db/rafiq.db
- **Required**: No

### RAFIQ_PRIMARY_AI
The default AI provider to use.
- **Default**: groq
- **Options**: groq, google, openrouter, nvidia
- **Required**: No

### RAFIQ_DISABLE_PRIVACY
Set to "1" to disable de-identification. Only use for debugging.
- **Default**: 0
- **Required**: No

### RAFIQ_ENABLE_AUTO_RECOVERY
Set to "1" to enable auto-restart on crash.
- **Default**: 1
- **Required**: No

### RAFIQ_ENABLE_TTS_BARGE_IN
Set to "1" to enable barge-in support.
- **Default**: 1
- **Required**: No

### PROACTIVE_CHECKIN_HOUR
The hour (0-23) when the proactive check-in should occur.
- **Default**: 9
- **Required**: No

### PROACTIVE_CHECKIN_MINUTE
The minute (0-59) when the proactive check-in should occur.
- **Default**: 0
- **Required**: No

## Example .env File

```
# Primary AI Provider
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx

# Fallback AI Providers
GOOGLE_API_KEY=AIzaSyA...
OPENROUTER_API_KEY=sk-or-v1-...
NVIDIA_NIM_API_KEY=nvapi-...

# System Settings
RAFIQ_DB_PATH=data/rafiq_db/rafiq.db
RAFIQ_PRIMARY_AI=groq
PROACTIVE_CHECKIN_HOUR=9
PROACTIVE_CHECKIN_MINUTE=0

# Feature Toggles
RAFIQ_ENABLE_AUTO_RECOVERY=1
RAFIQ_ENABLE_TTS_BARGE_IN=1

# Debug (DO NOT enable in production)
# RAFIQ_DISABLE_PRIVACY=1
```

---

# Chapter 54: The Complete Changelog

## Rafiq v1.0 (Initial Release)
- Basic STT and TTS.
- Simple LLM integration.
- SQLite database for medications.
- Basic reminder system.

## Rafiq v2.0 (The Intelligence Update)
- Integrated Whisper for better STT.
- Integrated Groq for faster LLM responses.
- Added ChromaDB for memory.
- Basic drug interaction checking.

## Rafiq v3.0 (The Safety Update)
- Added medical guardrails.
- Added emergency handler.
- Added medical router.
- Added de-identification and privacy.
- Added WHO RAG.

## Rafiq v4.0 (The Full System)
- Added ReminderScheduler with full state machine.
- Added FastAPI bridge with SSE.
- Added Electron GUI.
- Added proactive check-ins.
- Added adaptive scheduling.
- Added health streaks.
- Added multi-provider fallback.
- Added circuit breaker.
- Added emotion detection.
- Added barge-in support.

## Rafiq v4.2 (Current Stable)
- Improved Arabic dialect support.
- Improved wake word detection.
- Added name pseudonymization.
- Added MotivationManager.
- General stability and performance improvements.

---

# Chapter 55: The Complete Glossary of Terms

## A
- **ADC**: Analog-to-Digital Converter. Converts sound waves into digital numbers.
- **AI**: Artificial Intelligence. A computer program that can learn and make decisions.
- **API**: Application Programming Interface. Rules for how programs communicate.
- **Attention**: Mechanism in AI that allows focusing on different input parts.

## B
- **Barge-in**: Interrupting the AI while it is speaking.
- **Bit**: Smallest unit of data - can be 0 or 1.
- **Byte**: Group of 8 bits.

## C
- **ChromaDB**: Vector database for semantic search.
- **Circuit Breaker**: Design pattern to prevent cascading failures.
- **Cosine Similarity**: Measure of how similar two vectors are.

## D
- **DAC**: Digital-to-Analog Converter. Converts digital numbers back to sound.
- **De-identification**: Removing personal information from data.
- **Diaphragm**: Vibrating part of a microphone.

## E
- **Embedding**: Numerical representation of text.
- **Encoder**: Part of a transformer that reads the input.

## F
- **FFT**: Fast Fourier Transform. Algorithm for converting sound to frequency domain.
- **FastAPI**: Modern web framework for building APIs in Python.
- **Fallback**: Backup plan when the primary method fails.

## G
- **General Conversation**: Non-medical chat with Rafiq.
- **Gradient Descent**: Algorithm used to train neural networks.
- **Groq**: Fast AI inference provider.

## H
- **HTTPS**: Encrypted communication over the internet.
- **Hidden Markov Model**: Statistical model used in speech recognition.
- **Hertz (Hz)**: Unit of frequency.

## I
- **Intent Detection**: Figuring out what the user wants to do.
- **Interaction**: When two medicines affect each other.
- **Internet Protocol**: Rules for sending data over the internet.

## J
- **JSON**: Format for storing and transmitting data.
- **JWT**: Secure way to transmit information.

## K
- **Knowledge Base**: Collection of information that Rafiq can search.
- **Keyword**: Important word that triggers a specific action.

## L
- **LLM**: Large Language Model. AI that understands and generates text.
- **Latency**: Delay between an action and its result.
- **Localhost**: The computer you are using (127.0.0.1).

## M
- **Mel Scale**: Perceptual scale of pitch.
- **Microphone**: Device that converts sound to electrical signals.
- **Middleware**: Software that connects different applications.

## N
- **Neural Network**: Computer program inspired by the human brain.
- **Noise**: Unwanted sound.
- **Normalization**: Making text uniform and consistent.

## O
- **ONNX**: Standard format for saving neural networks.
- **Output**: Result produced by a computer program.

## P
- **PCM**: Raw digital representation of sound.
- **Parameter**: Number in a neural network.
- **PII**: Personally Identifiable Information.
- **Port**: Virtual point for network connections.

## Q
- **Query**: Request for information.
- **Queue**: Line of tasks waiting to be processed.

## R
- **RAG**: Retrieval-Augmented Generation.
- **ReAct**: Reasoning and Acting.
- **Regex**: Pattern used to match text.
- **Request**: Message sent to a server.
- **Response**: Message returned by a server.

##冷汗