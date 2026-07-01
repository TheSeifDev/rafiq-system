

---

# Chapter 71: Code Walkthrough - voice_listener.py Step by Step

## File Purpose
This file listens to the microphone and sends what you say to the backend.

## Import Statements
```python
import asyncio          # For async/await code
import json            # For reading JSON config
import os              # For file paths
import time            # For timing operations
import traceback       # For printing error traces
import threading       # For running things in parallel
import wave            # For saving audio to WAV files
from typing import Optional  # For type hints
import pyaudio         # For microphone access
import requests        # For sending HTTP requests
import numpy as np     # For math on audio data
```
## What Each Import Does
- **asyncio**: Lets us write code that does multiple things at once without getting stuck.
- **json**: Parses the config.json file.
- **os**: Finds files on disk.
- **time**: Measures how long things take.
- **traceback**: When an error happens, shows exactly where in the code.
- **threading**: Runs the voice listener and the main program side by side.
- **wave**: Creates .wav audio files.
- **pyaudio**: Talks to your computer's sound card to get microphone data.
- **requests**: Sends the recorded speech to the Rafiq API over the internet.
- **numpy**: Does fast math on audio signals.

## The Main Loop
```python
def run():
    while True:
        try:
            # Listen for wake word
            # When heard, record speech
            # Send to STT
            # Send to API
        except Exception as e:
            print("Error:", e)
            traceback.print_exc()
            time.sleep(5)  # Wait 5 seconds, then try again
```

## Why It Runs in a Loop Forever
The voice listener must always be ready. If an error happens (microphone unplugged, network down), it should not crash. It should wait a bit and try again. This is called resilience.

## The Wake Word Detection
```python
def listen_for_wake_word():
    # Set up microphone stream
    stream = pyaudio.PyAudio().open(
        format=pyaudio.paInt16,
        channels=1,
        rate=16000,
        input=True,
        frames_per_buffer=1024
    )
    
    while True:
        data = stream.read(1024)
        # Check if "Rafiq" is in the audio
        if wake_word_detected(data):
            return True
```

## The Recording Phase
After the wake word is detected:
```python
def record_speech():
    frames = []
    silence_threshold = 500  # Adjust based on environment
    silence_duration = 0
    
    while True:
        data = stream.read(1024)
        frames.append(data)
        
        # Check volume
        volume = compute_volume(data)
        if volume < silence_threshold:
            silence_duration += 1
        else:
            silence_duration = 0
        
        # If silent for 30 frames (about 2 seconds), stop recording
        if silence_duration > 30:
            break
    
    return b''.join(frames)
```

## Sending to STT
```python
def send_to_stt(audio_data):
    # Save to a temporary WAV file
    with wave.open("temp_audio.wav", "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(16000)
        f.writeframes(audio_data)
    
    # Send to STT service (Groq Whisper API in our case)
    with open("temp_audio.wav", "rb") as f:
        response = requests.post(
            "https://api.groq.com/stt",
            files={"audio": f},
            headers={"Authorization": "Bearer " + api_key}
        )
    
    return response.json()["text"]
```

## Sending to the Backend API
```python
def send_to_api(text, api_key):
    response = requests.post(
        "http://127.0.0.1:3002/chat",
        json={"message": text, "session_id": "voice_session"},
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=120
    )
    return response.json()
```

## Handling the Response
```python
def handle_response(api_response):
    if "text" in api_response:
        print("User said:", api_response["user_text"])
        print("Rafiq responded:", api_response["text"])
    elif "error" in api_response:
        print("Error:", api_response["error"])
```

---

# Chapter 72: Code Walkthrough - gui_bridge.py Step by Step

## File Purpose
This file is the bridge between the voice listener and the Brain. It receives text, processes it, and returns responses.

## Import Statements
```python
from fastapi import FastAPI, HTTPException  # Web framework
from fastapi.middleware.cors import CORSMiddleware  # Allow cross-origin requests
from fastapi.responses import EventSourceResponse  # For Server-Sent Events
from pydantic import BaseModel  # For request body validation
import asyncio
import json
import os
import time
import uuid  # For generating unique IDs
from typing import Optional, Dict, Any
from datetime import datetime
import uvicorn  # Web server
```

## The FastAPI App Setup
```python
app = FastAPI(title="Rafiq Bridge", version="4.2.0")

# Allow the GUI to talk to the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, change to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Pydantic Models
```python
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    text: str
    emotion: str = "neutral"

class Medication(BaseModel):
    name: str
    condition: str
    frequency: str
    dosage: str
    chronic: bool
```

## The /chat Endpoint
```python
@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        # Process the user's message
        result = await process_chat_background(request.message, request.session_id)
        return ChatResponse(text=result["text"], emotion=result.get("emotion", "neutral"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## The /events Endpoint (SSE)
```python
@app.get("/events")
async def events_endpoint():
    async def event_generator():
        while True:
            # Wait for an event
            event = await event_queue.get()
            yield f"data: {json.dumps(event)}\n\n"
    
    return EventSourceResponse(event_generator())
```

## The /reminders Endpoint
```python
@app.get("/reminders")
async def get_reminders():
    db = RafiqDB()
    reminders = db.get_all_reminders()
    return {"reminders": reminders}
```

## The /medications Endpoint
```python
@app.post("/medications")
async def add_medication(med: Medication):
    db = RafiqDB()
    db.add_medication(**med.dict())
    return {"status": "success"}
```

## The process_chat_background Function
```python
async def process_chat_background(text: str, session_id: Optional[str]):
    # Step 1: Detect language
    language = detect_language(text)
    
    # Step 2: De-identify
    clean_text, pid_map = pseudonymize(text)
    
    # Step 3: Route to medical, emergency, or general
    classification = medical_router.classify(clean_text)
    
    if classification == "EMERGENCY":
        return emergency_handler.handle(clean_text)
    
    elif classification == "MEDICAL":
        return await medical_agents.process(clean_text, pid_map)
    
    else:
        return await general_chat.respond(clean_text, language)
```

---

# Chapter 73: Code Walkthrough - scheduler_service.py Step by Step

## Class: ReminderScheduler
```python
class ReminderScheduler:
    def __init__(self, db: RafiqDB):
        self.db = db
        self.running = True
        self.current_reminder = None
    
    async def start(self):
        """Start the scheduler loop."""
        while self.running:
            await self._tick()
            await asyncio.sleep(60)  # Check every minute
```

## The _tick Method
```python
async def _tick(self):
    now = datetime.now()
    reminders = self.db.get_pending_reminders(now)
    
    for reminder in reminders:
        if reminder["status"] == "pending":
            await self._fire_reminder(reminder)
        elif reminder["status"] == "awaiting_confirmation":
            await self._check_timeout(reminder)
```

## Firing a Reminder
```python
async def _fire_reminder(self, reminder):
    self.current_reminder = reminder
    
    # Build the message
    message = f"{reminder['patient_name']}, time for your {reminder['med_name']}!"
    
    # Update status
    self.db.update_reminder(reminder["id"], status="awaiting_confirmation")
    
    # Play notification sound
    await play_notification_sound()
    
    # Speak the message
    await tts_service.speak(message)
```

## Checking for Timeout
```python
async def _check_timeout(self, reminder):
    elapsed = (datetime.now() - reminder["fired_at"]).total_seconds()
    
    if elapsed > 300:  # 5 minutes
        # Auto-snooze for 15 minutes
        await self._snooze_reminder(reminder, 15)
```

## Confirming a Dose
```python
async def confirm(self, reminder_id: int):
    # Update reminder status
    self.db.update_reminder(reminder_id, status="completed")
    
    # Record the Bazaar Dose
    self.db.add_dcmf_event(
        reminder_id=reminder_id,
        status="confirmed"
    )
    
    # Update health streak
    self.db.increment_health_streak(self.db.get_patient_id(reminder_id))
    
    # Schedule next reminder
    next_time = self.calculate_next_time(reminder_id)
    self.db.update_reminder(reminder_id, scheduled_time=next_time)
```

## Snoozing a Reminder
```python
async def _snooze_reminder(self, reminder, minutes):
    new_time = datetime.now() + timedelta(minutes=minutes)
    self.db.update_reminder(
        reminder["id"],
        scheduled_time=new_time,
        status="pending"
    )
```

---

# Chapter 74: Code Walkthrough - tts_service.py Step by Step

## Class: TTSService
```python
class TTSService:
    def __init__(self):
        self.queue = asyncio.Queue()
        self.current_audio = None
        self.priority = Priority.normal
```

## Speak Method
```python
async def speak(self, text: str, emotion: str = "neutral", priority: Priority = Priority.normal):
    # Create a speak task
    task = SpeakTask(text=text, emotion=emotion, priority=priority)
    
    # If urgent, interrupt current speech
    if priority == Priority.urgent and self.current_audio:
        await self._interrupt()
    
    # Add to queue
    await self.queue.put(task)
    
    # Process queue
    await self._process_queue()
```

## Generate Audio
```python
async def _generate_audio(self, text: str) -> bytes:
    voice = "ar-EG-SalmaNeural" if is_arabic(text) else "en-US-AvaNeural"
    
    # Call Edge-TTS
    response = await edge_tts.generate(text=text, voice=voice)
    
    return response.audio
```

## Play Audio
```python
async def _play_audio(self, audio: bytes):
    # Save to temp file
    with open("temp_tts.mp3", "wb") as f:
        f.write(audio)
    
    # Play using pygame
    pygame.mixer.music.load("temp_tts.mp3")
    pygame.mixer.music.play()
    
    # Wait until done
    while pygame.mixer.music.get_busy():
        await asyncio.sleep(0.1)
```

## Interrupt
```python
async def _interrupt(self):
    if pygame.mixer.music.get_busy():
        pygame.mixer.music.stop()
    
    self.queue = asyncio.Queue()  # Clear the queue
    self.current_audio = None
```

---

# Chapter 75: Code Walkthrough - stt_service.py Step by Step

## Class: STTService
```python
class STTService:
    def __init__(self):
        self.vad = SileroVad()  # Primary
        self.vad_fallback = WebRTCVad()  # Fallback
```

## Transcribe Method
```python
async def transcribe(self, audio_data: bytes) -> str:
    # Step 1: VAD check
    speech_detected = self.vad.is_speech(audio_data)
    
    if not speech_detected:
        return ""  # No speech, return empty
    
    # Step 2: Send to Whisper
    response = await self._whisper_transcribe(audio_data)
    
    # Step 3: Return text
    return response["text"]
```

## Whisper Transcribe
```python
async def _whisper_transcribe(self, audio_data: bytes) -> dict:
    files = {"file": ("audio.wav", audio_data, "audio/wav")}
    
    response = requests.post(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        files=files,
        data={"model": "whisper-large-v3-turbo", "language": "ar"},
        headers={"Authorization": "Bearer " + self.api_key},
        timeout=60
    )
    
    return response.json()
```

---

# Chapter 76: Code Walkthrough - llm_client.py Step by Step

## Class: LLMClient
```python
class LLMClient:
    def __init__(self):
        self.providers = {
            "groq": GroqProvider(),
            "gemini": GeminiProvider(),
            "openrouter": OpenRouterProvider(),
            "nvidia": NvidiaProvider()
        }
        self.circuit_breakers = {
            "groq": CircuitBreaker(),
            "gemini": CircuitBreaker(),
            "openrouter": CircuitBreaker(),
            "nvidia": CircuitBreaker()
        }
```

## Generate Method
```python
async def generate(self, prompt: str, temperature: float = 0.7) -> str:
    # Try each provider in order
    for provider_name in ["groq", "gemini", "openrouter", "nvidia"]:
        cb = self.circuit_breakers[provider_name]
        
        if cb.is_open():
            continue  # Skip if circuit is open
        
        try:
            response = await self.providers[provider_name].generate(prompt, temperature)
            cb.record_success()
            return response
        except Exception as e:
            cb.record_failure()
            continue
    
    # If all fail, return an error message
    return "I cannot answer right now. Please check your internet connection."
```

---

# Chapter 77: Code Walkthrough - who_rag.py Step by Step

## Class: WHORAG
```python
class WHORAG:
    def __init__(self, chroma_client, embedding_model):
        self.collection = chroma_client.get_collection("who_guidelines")
        self.embedding_model = embedding_model
```

## Query Method
```python
async def query(self, question: str) -> str:
    # Step 1: Embed the question
    question_embedding = self.embedding_model.encode(question)
    
    # Step 2: Search ChromaDB
    results = self.collection.query(
        query_embeddings=[question_embedding],
        n_results=5
    )
    
    # Step 3: Extract documents
    documents = results["documents"][0]
    
    # Step 4: Build context
    context = "\n".join(documents)
    
    # Step 5: Ask LLM to answer based on context
    prompt = f"""Based on the following WHO guidelines:
{context}

Answer this question: {question}
"""
    
    response = await llm_client.generate(prompt)
    return response
```

---

# Chapter 78: Code Walkthrough - rxnav_interactions.py Step by Step

## Class: RxNavClient
```python
class RxNavClient:
    def __init__(self):
        self.base_url = "https://rxnav.nlm.nih.gov"
```

## Check Interactions
```python
async def check_interactions(self, drug1: str, drug2: str) -> dict:
    # Get RXCUI for both drugs
    rxcui1 = await self._get_rxcui(drug1)
    rxcui2 = await self._get_rxcui(drug2)
    
    # Query interaction API
    url = f"{self.base_url}/REST/interaction/list.json?rxcuis={rxcui1}+{rxcui2}"
    response = requests.get(url, timeout=10)
    
    data = response.json()
    
    if "fullInteractionTypeGroup" in data:
        return {
            "has_interaction": True,
            "details": data["fullInteractionTypeGroup"]
        }
    
    return {"has_interaction": False}
```

## Get RXCUI
```python
async def _get_rxcui(self, drug_name: str) -> str:
    url = f"{self.base_url}/REST/rxcui.json?name={drug_name}&search=2"
    response = requests.get(url, timeout=10)
    data = response.json()
    return data["idGroup"]["rxnormId"][0]
```

---

# Chapter 79: Code Walkthrough - medical_agents.py Step by Step

## Class: MedicalAgent
```python
class MedicalAgent:
    def __init__(self, llm_client, tools):
        self.llm = llm_client
        self.tools = tools
        self.memory = []  # ReAct memory
```

## Run Method (ReAct Loop)
```python
async def run(self, query: str) -> str:
    # Initialize
    self.memory = []
    
    for step in range(5):  # Max 5 steps
        # Build prompt with memory
        prompt = self._build_react_prompt(query)
        
        # Get LLM response
        response = await self.llm.generate(prompt)
        
        # Parse action
        action = self._parse_action(response)
        
        if action["action"] == "answer":
            return action["text"]
        
        # Execute tool
        tool_result = await self._execute_tool(action)
        
        # Add to memory
        self.memory.append({
            "action": action,
            "observation": tool_result
        })
```

## Tools
```python
async def _execute_tool(self, action):
    tool_name = action["tool"]
    
    if tool_name == "retrieve_patient_history":
        return self.tools.retrieve_patient_history(action["input"])
    
    elif tool_name == "check_drug_interactions":
        return self.tools.check_drug_interactions(action["input"])
    
    elif tool_name == "query_medical_knowledge_graph":
        return await self.tools.query_medical_knowledge_graph(action["input"])
    
    elif tool_name == "validate_with_guardrails":
        return self.tools.validate_with_guardrails(action["input"])
```

---

# Chapter 80: Code Walkthrough - medical_guardrails.py Step by Step

## Function: validate_response
```python
def validate_response(text: str) -> tuple[bool, str]:
    """Returns (is_safe, reason or None)"""
    
    if contains_exact_dosage(text):
        return (False, "Cannot provide exact dosages")
    
    if contains_definitive_diagnosis(text):
        return (False, "Cannot provide definitive diagnoses")
    
    if contains_medicine_cessation_advice(text):
        return (False, "Cannot advise stopping medication")
    
    if contains_prompt_injection(text):
        return (False, "Potential prompt injection detected")
    
    return (True, None)
```

## Regex Patterns
```python
DOSAGE_PATTERN = r"\b\d+\s*(mg|ml|g|mcg|IU)\b"
DIAGNOSIS_PATTERN = r"(you have|you are suffering from|you are diagnosed with)"
CESSATION_PATTERN = r"(stop taking|quit|discontinue|do not take)"
INJECTION_PATTERN = r"(ignore previous instructions|forget everything|disregard)"
```

---

# Chapter 81: Code Walkthrough - db_operational.py Step by Step

## Class: RafiqDB
```python
class RafiqDB:
    def __init__(self, db_path: str = "rafiq.db"):
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._init_tables()
```

## Table Initialization
```python
def _init_tables(self):
    self.conn.execute("""
        CREATE TABLE IF NOT EXISTS medications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_name TEXT NOT NULL,
            med_name TEXT NOT NULL,
            condition TEXT,
            frequency TEXT NOT NULL,
            dosage TEXT,
            chronic BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    self.conn.execute("""
        CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            medication_id INTEGER,
            sched_time TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            FOREIGN KEY (medication_id) REFERENCES medications(id)
        )
    """)
```

## CRUD Operations
```python
def add_medication(self, patient_name: str, med_name: str, condition: str,
                   frequency: str, dosage: str, chronic: bool):
    cursor = self.conn.execute(
        "INSERT INTO medications (patient_name, med_name, condition, frequency, dosage, chronic)"
        " VALUES (?, ?, ?, ?, ?, ?)",
        (patient_name, med_name, condition, frequency, dosage, chronic)
    )
    self.conn.commit()
    return cursor.lastrowid

def get_medication(self, med_id: int) -> dict:
    cursor = self.conn.execute(
        "SELECT * FROM medications WHERE id = ?",
        (med_id,)
    )
    row = cursor.fetchone()
    return dict(row) if row else None

def get_all_medications(self) -> list:
    cursor = self.conn.execute("SELECT * FROM medications")
    return [dict(row) for row in cursor.fetchall()]
```

---

# Chapter 82: Code Walkthrough - privacy.py Step by Step

## Class: Pseudonymizer
```python
import random
import re
from typing import Dict, Tuple

class Pseudonymizer:
    def __init__(self):
        self.name_map: Dict[str, str] = {}
        self.location_map: Dict[str, str] = {}
        self.age_map: Dict[int, int] = {}
    
    def pseudonymize(self, text: str) -> Tuple[str, dict]:
        # Names
        names = self._extract_names(text)
        for name in names:
            if name not in self.name_map:
                self.name_map[name] = self._generate_fake_name()
            text = text.replace(name, self.name_map[name])
        
        # Locations
        locations = self._extract_locations(text)
        for loc in locations:
            if loc not in self.location_map:
                self.location_map[loc] = self._generate_fake_city()
            text = text.replace(loc, self.location_map[loc])
        
        # Ages
        ages = self._extract_ages(text)
        for age in ages:
            if age not in self.age_map:
                self.age_map[age] = age + random.randint(-5, 5)
            text = text.replace(str(age), str(self.age_map[age]))
        
        # Emails
        text = re.sub(r"[\w\.-]+@[\w\.-]+", "[REDACTED_EMAIL]", text)
        
        # Phone numbers
        text = re.sub(r"\b\d{10,}\b", "[REDACTED_PHONE]", text)
        
        return text, self._get_mappings()
```

---

# Chapter 83: Detailed Windows Installation Guide

## Step 1: Install Python
1. Visit python.org
2. Click "Download Python"
3. Run the installer
4. Check "Add Python to PATH"
5. Click "Install Now"
6. Wait for installation to complete
7. Open Command Prompt
8. Type: python --version
9. You should see Python 3.10 or higher

## Step 2: Install Rafiq
1. Download Rafiq ZIP from GitHub
2. Extract to C:\Rafiq
3. Open Command Prompt
4. Type: cd C:\Rafiq
5. Type: pip install -r requirements.txt
6. Wait for installation (this may take 10-15 minutes)

## Step 3: Configure API Keys
1. Copy .env.example to .env
2. Open .env in Notepad
3. Add your Groq API key
4. Save

## Step 4: Run Rafiq
1. Type: python rafiq_launcher.py
2. Wait for "Servers are ready"
3. The GUI will open automatically

---

# Chapter 84: Detailed Mac Installation Guide

## Step 1: Install Homebrew
1. Open Terminal
2. Type: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
3. Follow the prompts

## Step 2: Install Python
1. Type: brew install python
2. Verify: python3 --version

## Step 3: Install Rafiq
1. Download the ZIP
2. Extract to ~/Rafiq
3. cd ~/Rafiq
4. pip3 install -r requirements.txt

## Step 4: Run
1. python3 rafiq_launcher.py

---

# Chapter 85: Detailed Linux Installation Guide (Ubuntu)

## Step 1: Install Python and pip
```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv -y
```

## Step 2: Install system dependencies
```bash
sudo apt install portaudio19-dev libasound2-dev libportaudio2 libatlas-base-dev -y
```

## Step 3: Create virtual environment
```bash
cd /path/to/rafiq
python3 -m venv venv
source venv/bin/activate
```

## Step 4: Install Python dependencies
```bash
pip install -r requirements.txt
```

## Step 5: Run
```bash
python rafiq_launcher.py
```

---

# Chapter 86: Complete cURL API Examples

## Exampleileen chat
```bash
curl -X POST http://127.0.0.1:3002/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"message": "Hello Rafiq", "session_id": "test123"}'
```

## Get all medications
```bash
curl http://127.0.0.1:3002/medications \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Add a medication
```bash
curl -X POST http://127.0.0.1:3002/medications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "name": "Metformin",
    "condition": "Diabetes",
    "frequency": "daily",
    "dosage": "500mg",
    "chronic": true
  }'
```

## Get reminders
```bash
curl http://127.0.0.1:3002/reminders \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## SSE Events
```bash
curl http://127.0.0.1:3001/events \
  -H "Accept: text/event-stream"
```

## Health Check
```bash
curl http://127.0.0.1:3001/health
```

---

# Chapter 87: Complete Python API Client Example

```python
import requests

class RafiqClient:
    def __init__(self, api_key, base_url="http://127.0.0.1:3002"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def chat(self, message, session_id=None):
        url = f"{self.base_url}/chat"
        data = {"message": message}
        if session_id:
            data["session_id"] = session_id
        
        response = requests.post(url, json=data, headers=self.headers)
        return response.json()
    
    def get_medications(self):
        url = f"{self.base_url}/medications"
        response = requests.get(url, headers=self.headers)
        return response.json()
    
    def add_medication(self, name, condition, frequency, dosage, chronic=False):
        url = f"{self.base_url}/medications"
        data = {
            "name": name,
            "condition": condition,
            "frequency": frequency,
            "dosage": dosage,
            "chronic": chronic
        }
        response = requests.post(url, json=data, headers=self.headers)
        return response.json()
    
    def get_reminders(self):
        url = f"{self.base_url}/reminders"
        response = requests.get(url, headers=self.headers)
        return response.json()
    
    def restart(self):
        url = f"{self.base_url}/restart"
        response = requests.post(url, headers=self.headers)
        return response.json()


# Example usage
if __name__ == "__main__":
    client = RafiqClient(api_key="your_api_key_here")
    
    # Chat with Rafiq
    response = client.chat("What are the symptoms of high blood pressure?")
    print(response["text"])
    
    # Get medications
    meds = client.get_medications()
    print(meds)
    
    # Add a medication
    result = client.add_medication(
        name="Aspirin",
        condition="Heart health",
        frequency="daily",
        dosage="81mg",
        chronic=True
    )
    print(result)
```

---

# Chapter 88: Complete Testing Example with pytest

```python
import pytest
import asyncio
from src.database.db_operational import RafiqDB
from src.services.stt_service import STTService
from src.services.tts_service import TTSService
from src.services.llm_client import LLMClient
from src.core.medical_router import classify
from src.core.privacy import Pseudonymizer
from src.core.medical_guardrails import validate_response
from src.services.scheduler_service import ReminderScheduler

# --- Fixtures ---
@pytest.fixture
def db(tmp_path):
    db_path = tmp_path / "test.db"
    return RafiqDB(str(db_path))

@pytest.fixture
def scheduler(db):
    return ReminderScheduler(db)

# --- Pseudonymizer Tests ---
class TestPseudonymizer:
    def test_pseudonymize_name(self):
        p = Pseudonymizer()
        text, mapping = p.pseudonymize("My name is Ahmed")
        assert "Ahmed" not in text
        assert "[NAME_" in text or len(mapping["names"]) > 0
    
    def test_pseudonymize_email(self):
        p = Pseudonymizer()
        text, _ = p.pseudonymize("Contact me at ahmed@test.com")
        assert "ahmed@test.com" not in text
        assert "[REDACTED_EMAIL]" in text
    
    def test_pseudonymize_phone(self):
        p = Pseudonymizer()
        text, _ = p.pseudonymize("My number is 01234567890")
        assert "01234567890" not in text
        assert "[REDACTED_PHONE]" in text

# --- Medical Router Tests ---
class TestMedicalRouter:
    def test_emergency_detection(self):
        result = classify("I cannot breathe")
        assert result == "EMERGENCY"
    
    def test_medical_detection(self):
        result = classify("What are the symptoms of diabetes?")
        assert result == "MEDICAL"
    
    def test_general_detection(self):
        result = classify("What is the weather today?")
        assert result == "GENERAL"

# --- Guardrails Tests ---
class TestGuardrails:
    def test_blocks_exact_dosage(self):
        is_safe, reason = validate_response("Take 500mg of paracetamol")
        assert not is_safe
        assert "dosage" in reason.lower()
    
    def test_blocks_definitive_diagnosis(self):
        is_safe, reason = validate_response("You have diabetes")
        assert not is_safe
        assert "diagnos" in reason.lower()
    
    def test_allows_general_advice(self):
        is_safe, reason = validate_response("Drinking water is good for health")
        assert is_safe
        assert reason is None

# --- Database Tests ---
class TestDatabase:
    def test_add_medication(self, db):
        med_id = db.add_medication(
            patient_name="Faris",
            med_name="Metformin",
            condition="Diabetes",
            frequency="daily",
            dosage="500mg",
            chronic=True
        )
        assert med_id > 0
        
        med = db.get_medication(med_id)
        assert med["med_name"] == "Metformin"
    
    def test_add_reminder(self, db):
        med_id = db.add_medication("Faris", "Metformin", "Diabetes", "daily", "500mg", True)
        reminder_id = db.add_reminder(med_id, "08:00")
        assert reminder_id > 0
        
        reminders = db.get_all_reminders()
        assert len(reminders) == 1
    
    def test_dose_event(self, db):
        med_id = db.add_medication("Faris", "Metformin", "Diabetes", "daily", "500mg", True)
        reminder_id = db.add_reminder(med_id, "08:00")
        
        db.add_dose_event(reminder_id, "confirmed")
        events = db.get_todays_dose_events()
        assert len(events) == 1
        assert events[0]["status"] == "confirmed"

# --- Scheduler Tests ---
class TestScheduler:
    @pytest.mark.asyncio
    async def test_fire_reminder(self, scheduler):
        # Mock reminder
        reminder = {
            "id": 1,
            "med_name": "Metformin",
            "patient_name": "Faris",
            "status": "pending"
        }
        
        # Fire the reminder
        await scheduler._fire_reminder(reminder)
        
        # Check that status was updated
        assert reminder["status"] == "awaiting_confirmation"

# --- STT Service Tests (Mocked) ---
class TestSTTService:
    def test_vad_silence(self):
        # Create a silent audio buffer (all zeros)
        silent_audio = bytes(1024 * 2)
        
        stt = STTService()
        # Mock the VAD to return False for silence
        is_speech = stt.vad.is_speech(silent_audio)
        assert not is_speech
    
    def test_language_detection_arabic(self):
        from src.utils.simple_language_detector import detect_language
        lang = detect_language("٢٠ كم ساعة من الطيران")
        assert lang == "ar"

# --- LLM Client Tests ---
class TestLLMClient:
    @pytest.mark.asyncio
    async def test_circuit_breaker(self):
        client = LLMClient()
        # Simulate multiple failures
        cb = client.circuit_breakers["groq"]
        for _ in range(10):
            cb.record_failure()
        
        assert cb.is_open()
    
    @pytest.mark.asyncio
    async def test_fallback_providers(self):
        client = LLMClient()
        # Mock all providers failing except the last one
        # This test would require mocking the provider methods
        pass

# Run all tests
# pytest tests/ --cov=src --cov-report=html
```

---

# Chapter 89: Complete Database Diagrams

## Entity Relationship Diagram

```
+-----------------+       +-----------------+       +-----------------+
|  patients       |       |  medications    |       |  reminders      |
+-----------------+       +-----------------+       +-----------------+
| id (PK)         |       | id (PK)         |       | id (PK)         |
| name            |       | patient_id (FK) |------>| medication_id   |
| language        |       | med_name        |       | sched_time      |
| emergency_con...|       | condition       |       | status          |
+-----------------+       | frequency       |       +-----------------+
                          | dosage          |
                          | chronic         |
                          +-----------------+

+-----------------+       +-----------------+       +-----------------+
|  dose_events    |       |  health_streaks |       |  chat_history    |
+-----------------+       +-----------------+       +-----------------+
| id (PK)         |       | id (PK)         |       | id (PK)         |
| reminder_id (FK)|       | patient_id (FK) |       | session_id      |
| status          |       | current_streak  |       | speaker         |
| taken_at        |       | longe..._...ek  |       | message         |
+-----------------+       | updated_at      |       | timestamp       |
                          +-----------------+       +-----------------+

+-----------------+       +-----------------+       +-----------------+
|  memory_facts   |       |  emergency...    |       |  audit_logs     |
+-----------------+       +-----------------+       +-----------------+
| id (PK)         |       | id (PK)         |       | id (PK)         |
| patient_id (FK) |       | patient_id      |       | action          |
| key             |       | event_type      |       | details         |
| value           |       | description     |       | timestamp       |
+-----------------+       | timestamp       |       +-----------------+
                          +-----------------+
```

## Relationships
- One patient has many medications
- One medication has many reminders
- One reminder has many dose_events
- One patient has one health_streak
- One patient has many memory_facts
- One patient has many emergency_events
- System has many audit_logs

---

# Chapter 90: Complete Environment Variables Reference Table

| Variable | Required | Default | Description |
|---|---|---|---|
| GROQ_API_KEY | Yes | None | Primary AI provider key |
| GEMINI_API_KEY | No | None | Fallback AI provider key |
| OPENROUTER_API_KEY | No | None | Fallback AI provider key |
| NVIDIA_API_KEY | No | None | Fallback AI provider key |
| RAFIq_PRIMARY_AI | No | groq | Default AI provider |
| WHISPER_API_KEY | No | GROQ_API_KEY | STT API key |
| VAD_MODEL_PATH | No | ./models/silero_vad.onnx | Path to VAD model |
| DATABASE_PATH | No | ./data/rafiq_db/rafiq.db | SQLite database path |
| CHROMA_PATH | No | ./data/rafiq_db/chroma_db | ChromaDB directory |
| PORT_API | No | 3002 | API server port |
| PORT_SSE | No | 3001 | SSE server port |
| LOG_LEVEL | No | INFO | Logging level |
| TTS_VOICE_AR | No | ar-EG-SalmaNeural | Arabic TTS voice |
| TTS_VOICE_EN | No | en-US-AvaNeural | English TTS voice |
| RATE_LIMIT_RPM | No | 60 | Rate limit (requests per minute) |
| CIRCUIT_BREAKER_THRESHOLD | No | 5 | Failures before opening circuit |
| CIRCUIT_BREAKER_TIMEOUT | No | 60 | Seconds before trying again |
| ENABLE_EMERGENCY_ALERT | No | True | Enable emergency siren sound |
| EMERGENCY_CONTACT_PHONE | No | None | Emergency contact to call |

---

# Chapter 91: Complete State Machine Diagram

## ASCII State Diagram

```
                    +------------------+
                    |                  |
      +------------>|    PASSIVE       |<-------------+
      |             |  (Idle,          |              |
      |             |   listening      |              |
      |             |   for wake word) |              |
      |             +------------------+              |
      |                     |                        |
      |                     | Wake word detected      |
      |                     v                        |
      |             +------------------+              |
      |             |                  |              |
      +------------>|   LISTENING      |              |
      |             |  (Recording      |              |
      |             |   user speech)   |              |
      |             +------------------+              |
      |                     |                        |
      |                     | Speech ends            |
      |                     v                        |
      |             +------------------+              |
      |             |                  |              |
      |     +------>|  PROCESSING     |              |
      |     |       |  (AI thinking,  |              |
      |     |       |   routing)      |              |
      |     |       +------------------+              |
      |     |               |                        |
      |     |               | Classification         |
      |     |               v                        |
      |     |       +------------------+              |
      |     |       |                  |              |
      |     +------>|   SPEAKING       |              |
      |     |       |  (Playing TTS    |              |
      |     |       |   audio)         |              |
      |     |       +------------------+              |
      |     |               |                        |
      |     |               | Audio finishes         |
      |     |               v                        |
      |     |       +------------------+              |
      |     |       |                  |              |
      |     +------>| AWAITING_REMINDER_RESPONSE|      |
      |             |  (Waiting for     |             |
      |             |   user to confirm  |             |
      |             |   medication)     |              |
      |             +------------------+              |
      |                     |                        |
      |                     | User responds          |
      |                     | or timeout             |
      |                     v                        |
      +---------------------+------------------------+
```

## State Descriptions

### PASSIVE
- Default state when Rafiq is idle
- Listening for wake word ("Rafiq")
- Lowest resource usage
- Ready to transition to LISTENING

### LISTENING
- Activated when wake word is detected
- Recording user speech
- VAD is active to detect when user stops speaking
- Transitions to PROCESSING when speech ends

### PROCESSING
- Audio is being transcribed
- Router is classifying the question
- AI is generating a response
- Can take 1-10 seconds depending on complexity
- Transitions to SPEAKING when response is ready

### SPEAKING
- TTS is generating audio
- Audio is being played through speakers
- Can be interrupted by barge-in
- Transitions to PASSIVE (or AWAITING_REMINDER_RESPONSE) when audio finishes

### AWAITING_REMINDER_RESPONSE
- Special state after a medicine reminder fires
- Waiting for user to say "Yes", "No", or "Snooze"
- Has a 5-minute timeout
- If timeout, auto-snoozes the reminder

---

# Chapter 92: Complete Barge-In Sequence Diagram

## Text-based Sequence Diagram

```
User          Voice Listener    Backend    TTS
 |                  |               |       |
 |    "Rafiq..."    |               |       |
 |----------------->|               |       |
 |                  |               |       |
 |                  |  Send text   |       |
 |                  |------------- >|       |
 |                  |               |       |
 |                  |               |Process|
 |                  |               |       |
 |                  |               | AI response  |
 |                  |               |------------->|
 |                  |               |       |
 |                  |               | Generate audio |
 |                  |               |------------->|
 |                  |               |       |
 |    TTS Audio plays (long)       |       |
 |< ---------------------------------------|       |
 |                  |               |       |
 |    Interrupt!    |               |       |
 |----------------->|               |       |
 |                  |               |       |
 |                  |  Stop TTS    |       |
 |                  |-------------->|       |
 |                  |               |       |
 | Clear queue &    |               |       |
 | restart with     |               |       |
 | new request      |               |       |
 |<----------------|<--------------|<------|
 |                  |               |       |
```

## How Barge-In Works Internally

1. TTS is playing audio
2. Voice listener continues listening for speech in parallel (separate thread)
3. VAD detects new speech during TTS playback
4. Voice listener sends an interrupt signal to the TTS service
5. TTS calls pygame.mixer.music.stop()
6. TTS clears its queue
7. The new request is processed immediately
8. TTS plays the new audio

---

# Chapter 93: Complete Emergency Handling Sequence Diagram

```
User          Voice Listener    Medical Router    Emergency Handler   Logs
 |                  |               |                   |             |
 | "I can't breathe"|               |                   |             |
 |----------------->|               |                   |             |
 |                  |  Text         |                   |             |
 |                  |-------------->|                   |             |
 |                  |               |                   |             |
 |                  |  "EMERGENCY"  |                   |             |
 |                  |               |                   |             |
 |                  |               | Start emergency   |             |
 |                  |               |------------->|    |             |
 |                  |               |                   |             |
 |    Emergency audio plays          |                   |             |
 |<----------------------------------|                   |             |
 |                  |               |                   |             |
 |                  |               |                   | Log event   |
 |                  |               |                   |------------>|
 |                  |               |                   |             |
 |    System returns to PASSIVE after emergency     |    |             |
 |<----------------------------------|                   |             |
```

## Why This is Fast

The entire emergency handling is local. No API calls are made. No AI is involved. The response is pre-written and stored in memory. This ensures the fastest possible response in a life-critical situation.

---

# Chapter 94: Complete ReAct Agent Loop Diagram

```
+------------------+
|                  |
|     Start        |
|                  |
+--------+---------+
         |
         v
+--------+---------+
|  Observation:    |
|  User asks a     |
|  medical question|
+--------+---------+
         |
         v
+--------+---------+     +------------------+
|  LLM thinks:     |     |                  |
|  What tool to    | --> |  Tool 1: Retrieve|
|  use?            |     |  patient history |
+--------+---------+     +--------+---------+
         |                      |
         | Tool Result          |
         |<---------------------+
         |
         v
+--------+---------+
|  Observation:    |
|  Patient has no  |
|  relevant history|
+------------------+
         |
         v
+--------+---------+     +------------------+
|  LLM thinks:     | --> |  Tool 2: Query   |
|  Next tool?      |     |  WHO knowledge   |
+------------------+     +--------+---------+
         |                      |
         | WHO Result           |
         |<---------------------+
         |
         v
+--------+---------+
|  Observation:    |
|  Retrieved WHO   |
|  guidelines      |
+------------------+
         |
         v
+--------+---------+(After max steps)
|  LLM drafts      |
|  final answer    |
+------------------+
         |
         v
+--------+---------+
|  Guardrails      |
|  validation      |
+--------+---------+
         |
         v
+--------+---------+
|  Return answer   |
|  to user         |
+------------------+
```

---

# Chapter 95: Complete Privacy Flow Diagram

```
User Speech          Backend                    External AI
     |                  |                           |
     | "My name is      |                           |
     |  Ahmed and I          |                           |
     |  live in Cairo"|                           |
     |-------------->|                               |
     |               |1. Detect: name="Ahmed"      |
     |               |   location="Cairo"            |
     |               |   age=25                     |
     |               |                               |
     |               |2. Pseudonymize:              |
     |               |   Ahmed -> [Name_1]          |
     |               |   Cairo -> [City_1]          |
     |               |   25 -> 26                   |
     |               |                               |
     |               |3. Construct safe message:    |
     |               |   "My name is [Name_1]       |
     |               |    and I live in [City_1]"  |
     |               |                               |
     |               |4. Send to AI                 |
     |               |---------------------------->>>|
     |               |                               |
     |               |5. Receive AI response         |
     |               |<<<----------------------------|
     |               |                               |
     |               |6. Re-identify (for local      |
     |               |   storage only):              |
     |               |   [Name_1] -> "Ahmed"        |
     |               |                               |
     | "Hello Ahmed, |                               |
     |  based on..." |                               |
     |<--------------|                               |
```

---

# Chapter 96: Complete Technology Comparison Table

| Technology | What It Is | How Rafiq Uses It | Why It Was Chosen |
|---|---|---|---|
| Python | Programming language | Entire backend | Easy to read, huge library ecosystem |
| FastAPI | Web framework | API for voice and GUI | Fast, async, automatic docs |
| SQLite | Database engine | Local data storage | Zero-setup, no server needed |
| ChromaDB | Vector database | WHO knowledge storage | Fast semantic search |
| PyAudio | Audio I/O | Record from microphone | Cross-platform audio access |
| TensorFlow | ML framework | Silero VAD model | Pre-trained, efficient |
| ONNX Runtime | ML inference engine | Run VAD locally | Fast CPU inference |
| ReAct (LangGraph) | Agent framework | Medical question answering | Tool use, reasoning |
| Groq | AI inference provider | Primary LLM | Fast, cheap, good quality |
| Gemini | AI model from Google | Fallback LLM | Good for Arabic |
| OpenRouter | AI routing service | Fallback LLM | Access to many models |
| NVIDIA NIM | AI inference service | Fallback LLM | Good performance |
| Groq Whisper | STT service | Transcribe speech | Accurate, fast, cheap |
| Edge-TTS | Text-to-speech service | Speak responses | Free, natural-sounding |
| Pygame | Game library (also does audio) | Play TTS audio | Cross-platform, reliable |
| NumPy | Math library | Audio signal processing | Fast array operations |
| Requests | HTTP library | API calls | Simple, well-known |
| Pydantic | Data validation | API request/response models | Type-safe, auto-validation |
| Uvicorn | Web server | Run FastAPI app | ASGI compliant, fast |
| React | UI library | GUI frontend | Component-based, popular |
| Electron | Desktop app framework | Package the GUI | Native feel, web tech |
| SSE | Server-Sent Events | Push events to GUI | Real-time, simple, one-way |
| RxNav | Drug interaction API | Check medicine interactions | Free, authoritative |
| WHO | Health organization | Source of medical knowledge | Trusted, evidence-based |
| SQLite WAL | Write-Ahead Logging | Concurrent database access | Better performance |
| Regex | Pattern matching | Guardrails, PII extraction | Fast, deterministic |
| Threading | Parallel execution | Run voice listener separately | Prevents blocking |
| AsyncIO | Async programming | Non-blocking I/O | Efficient, modern Python |
| Enums | Named constants | State machine states | Type-safe, readable |
| Dataclasses | Simple data classes | SpeakTask, Reminder objects | Less boilerplate |
| UUID | Unique identifiers | Generate session IDs | Globally unique |
| JSON | Data format | API communication, configs | Universal, human-readable |
| dotenv | Environment file loader | Load API keys | Secure, standard practice |
| pytest | Testing framework | Run unit tests | Feature-rich, extensible |
| Coverage | Test coverage tool | Measure code coverage | Identify untested areas |
| Logging | Python logging | Error tracking, debugging | Built-in, flexible |
| pathlib | Path manipulation | File path handling | Modern, cross-platform |
| hashlib | Hashing | Secure API key comparison | Standard library |
| datetime | Date/time | Timestamps, scheduling | Standard library |
| timedelta | Time differences | Snooze calculations | Standard library |
| json | JSON parsing | Config files | Standard library |
| os | OS operations | File paths, env variables | Standard library |
| sys | System operations | Exit codes, version checks | Standard library |
|traceback | Error tracing | Print stack traces | Standard library |
| threading | Threading | Run listener in background | Standard library |
| asyncio | Async I/O | Concurrent operations | Standard library |
| typing | Type hints | Better code quality | Standard library |
| collections | Data structures | Deques, default dicts | Standard library |
| itertools | Iterators | Efficient loops | Standard library |
| functools | Function tools | Decorators, caching | Standard library |
| inspect | Introspection | Get function names | Standard library |
| textwrap | Text wrapping | Format long strings | Standard library |
| string | String operations | String constants | Standard library |
| re | Regex | Pattern matching | Standard library |
| math | Math functions | Basic math | Standard library |
| random | Random numbers | Generate fake names | Standard library |

---

# Chapter 97: Complete List of Commands Rafiq Understands

## Reminder Commands
- "Rafiq, remind me to take my medicine at 8 AM every day."
- "What medicine do I need to take today?"
- "Did I take my medicine today?"
- "I took my pill."
- "Skip this reminder."
- "Snooze for 10 minutes."
- "Remove my reminder for Aspirin."

## Medical Commands
- "What are the symptoms of [condition]?"
- "What should I do if I have [symptom]?"
- "Is there a drug interaction between [drug1] and [drug2]?"
- "Tell me about [medicine]."
- "How do I know if I am having a [emergency]?"

## General Commands
- "What is the weather today?"
- "What time is it?"
- "Tell me a joke."
- "How are you?"
- "Thank you."
- "Goodbye."

## Emergency Commands
- "Help!" (Triggers emergency siren)
- "I cannot breathe." (Triggers emergency protocol)
- "I am having an emergency." (Triggers emergency protocol)

## Widget/GUI Commands
- "Show me my medications."
- "Add a new medicine."
- "Show me this week's health streak."

---

# Chapter 98: Complete List of All Rafiq Files and Their Exact Purpose

| File | Location | Purpose | Lines |
|---|---|---|---|
| rafiq_launcher.py | Root | Orchestrates startup of all services | ~200 |
| run_rafiq.bat | Root | Windows batch script to start Rafiq | ~20 |
| requirements.txt | Root | Python dependencies list | ~80 |
| .env | Root | API keys and secrets (not committed) | ~10 |
| .env.example | Root | Template for .env (committed) | ~10 |
| .gitignore | Root | Files to ignore in git | ~30 |
| README.md | Root | Project documentation | ~100 |
| src/config/settings.py | src/config | Configuration constants, system prompts | ~200 |
| src/core/emergency_handler.py | src/core | Detects and handles emergency situations | ~150 |
| src/core/medical_agents.py | src/core | ReAct agent for medical Q&A | ~350 |
| src/core/medical_guardrails.py | src/core | Safety filters for AI responses | ~200 |
| src/core/medical_router.py | src/core | Routes queries to correct handler | ~100 |
| src/core/privacy.py | src/core | PII pseudonymization and de-identification | ~250 |
| src/database/db_operational.py | src/database | All database operations via RafiqDB class | ~600 |
| src/services/conv_processor.py | src/services | Main conversation engine orchestrator | ~400 |
| src/services/llm_client.py | src/services | Multi-provider LLM with circuit breakers | ~250 |
| src/services/rxnav_interactions.py | src/services | NIH RxNav drug interaction API | ~150 |
| src/services/scheduler_service.py | src/services | Reminder scheduling with health streaks | ~400 |
| src/services/stt_service.py | src/services | Speech-to-text with Whisper + VAD | ~200 |
| src/services/tts_service.py | src/services | Text-to-speech with priority + barge-in | ~300 |
| src/services/voice_listener.py | src/services | Standalone async mic listener process | ~300 |
| src/services/who_rag.py | src/services | WHO guidelines RAG with ChromaDB | ~250 |
| src/gui_bridge.py | src | FastAPI bridge (SSE + API) | ~400 |
| rafiq-gui/rafiq-gui | rafiq-gui | Electron + React front-end application | ~50 files |
| tests/rafiq_v4_test.py | tests | Main test suite | ~400 |
| tests/test_manual_barge_in.py | tests | Barge-in feature tests | ~100 |
| tests/test_medication_confirmation_flow.py | tests | Med reminder flow tests | ~150 |
| tests/test_real_tts_overlap_fix.py | tests | TTS overlap fix tests | ~80 |
| tests/test_state_machine.py | tests | State machine tests | ~120 |
| tests/test_vad.py | tests | VAD accuracy tests | ~100 |
| tools/stability_test.py | tools | System stability testing | ~200 |

---

# Chapter 99: The 100 Most Important Concepts in Rafiq

1. **Voice-First Interface**: Rafiq is designed to be used primarily by voice, not typing.
2. **Wake Word**: A special word ("Rafiq") that activates the system.
3. **Barge-In**: Interrupting Rafiq while he is speaking.
4. **STT (Speech-to-Text)**: Converting spoken words into text.
5. **TTS (Text-to-Speech)**: Converting text into spoken words.
6. **VAD (Voice Activity Detection)**: Detecting if someone is speaking or not.
7. **LLM ( Deep140)**: A large language model (AI brain).
8. **API (Application Programming Interface)**: Rules for how computer programs talk to each other.
9. **Guardrails**: Safety rules that prevent the AI from giving dangerous advice.
10. **Pseudonymization**: Replacing real names with fake ones to protect privacy.
11. **De-Identification**: Removing identifying information from data.
12. **Circuit Breaker**: A pattern that stops using a broken service to prevent more failures.
13. **Fallback**: When the primary method fails, use a backup.
14. **ReAct**: Reason + Act. An AI pattern that uses tools and reasoning.
15. **RAG (Retrieval Augmented Generation)**: Giving the AI a knowledge base to answer from.
16. **Vector Database**: A special database that finds similar items using math.
17. **Embedding**: Turning text into a list of numbers (vector) for comparison.
18. **SQL**: A language for asking questions to a database.
19. **SQLite**: A simple database that stores data in a single file.
20. **WAL (Write-Ahead Logging)**: A way to allow reading the database while writing to it.
21. **State Machine**: A system with different states and rules for moving between them.
22. **Priority Queue**: A line where important items go first.
23. **Thread**: A separate path of execution in a program (parallelism).
24. **Async/Await**: A way to write efficient code that waits for slow operations.
25. **SSE (Server-Sent Events)**: A way to push data from server to browser in real-time.
26. **JSON**: A text format for structuring data.
27. **Environmental Variables**: Settings stored outside the code (in .env file).
28. **Pydantic**: A library for data validation in Python.
29. **FastAPI**: A modern web framework for building APIs.
30. **Uvicorn**: A fast web server for Python applications.
31. **React**: A JavaScript library for building user interfaces.
32. **Electron**: Framework for building desktop apps using web technologies.
33. **Groq**: An AI company that provides fast inference (the engine).The AI models they offer, like Llama 3.2, are the "courses".
34. **Gemini**: Google's AI model.
35. **OpenRouter**: A service that routes API requests to many different models.
36. **NVIDIA NIM**: Another AI inference service.
37. **Whisper**: OpenAI's speech recognition model.
38. **SalmaNeural**: An Arabic TTS voice.
39. **AvaNeural**: An English TTS voice.
40. **RxNav**: The US National Library of Medicine's database for drug interactions.
41. **WHO**: World Health Organization.
42. **ChromaDB**: An open-source vector database.
43. **EFQ**: Embedding Function (not to be confused with EFC, which is not applicable here, but refers to the mathematical representation).
44. **Silero**: A company that creates pre-trained VAD models.
45. **ONNX**: A standard format for machine learning models.
46. **WebRTC VAD**: A voice activity detector used as a fallback.
47. **Regex**: Regular expressions, a way to search for text patterns.
48. **Rate Limiting**: Preventing too many requests in a short time.
49. **Thread Safety**: Making sure multiple threads don't corrupt shared data.
50. **Context Manager**: A Python pattern for managing resources (like database connections).
51. **Dataclass**: A class that automatically creates special methods like __init__.
52. **Exception Handling**: Catching errors gracefully so the program doesn't crash.
53. **Logging**: Recording what the program does for debugging.
54. **PII (Personally Identifiable Information)**: Data that could identify you, like your name or phone number.
55. **Local Data**: Data stored on your own computer, not in the cloud.
56. **Cloud Data**: Data stored on remote servers (like Groq). Rafiq avoids this.
57. **Open Source**: Software where the source code is available for anyone to read and modify.
58. **Repository (Repo)**: A folder managed by git, containing all project code.
59. **Git**: A tool for tracking changes in code.
60. **Pull Request (PR)**: A way to suggest changes to a project on GitHub.
61. **Unit Test**: A small test that checks one specific part of the code.
62. **Integration Test**: A test that checks how multiple parts work together.
63. **Coverage**: The percentage of code that is tested.
64. **CI/CD (Continuous Integration/Continuous Deployment)**: Automating tests and deployment.
65. **Container (Docker)**: A lightweight virtual machine for packaging software.
66. **Virtual Environment**: A separate Python installation for a project, avoiding conflicts.
67. **Pip**: Python's package installer (like npm for JavaScript).
68. **Pygame**: A library for game development (used in Rafiq for audio playback).
69. **NumPy**: A library for fast numerical operations.
70. **Requests**: A library for making HTTP requests.
71. **pydub**: A library for manipulating audio files.
72. **Soundfile**: A library for reading and writing audio files.
73. **Edge-TTS**: A library for Microsoft Edge text-to-speech.
74. **LangChain**: A framework for building LLM applications.
75. **LangGraph**: A library for building agent workflows (like ReAct).
76. **Pinecone**: A commercial vector database (Rafiq uses ChromaDB instead).
77. **Qdrant**: Another open-source vector database.
78. **Weaviate**: Another open-source vector database.
79. **Ingestion Pipeline**: The process of loading data into a database.
80. **Chunking**: Breaking large text into smaller pieces for embedding.
81. **Token**: A small piece of text (word or part of a word) used by LLMs.
82. **Transformer**: The architecture behind modern LLMs (like GPT, Llama, etc.).
83. **Attention Mechanism**: A key part of the Transformer that lets the model focus on relevant parts of text.
84. **Prompt**: The input text given to an LLM.
85. **System Prompt**: Instructions given to the LLM to guide its behavior.
86. **Temperature**: A parameter that controls how creative/random the AI's response is.
87. **Hallucination**: When the AI makes up information.
88. **Token Limit**: The maximum number of tokens an LLM can process in one request.
89. **Fine-Tuning**: Training an existing model on a specific dataset.
90. **RAG vs. Fine-Tuning**: RAG adds knowledge via search; fine-tuning changes the model itself.
91. **Semantic Search**: Finding items by meaning, not exact words.
92. **Cosine Similarity**: A math formula used to measure how similar two embeddings are.
93. **KNN (K-Nearest Neighbors)**: An algorithm for finding the most similar items.
94. **HNSW (Hierarchical Navigable Small World)**: An approximate nearest neighbor search algorithm.
95. **Encryption**: Scrambling data to protect it.
96. **SSL/TLS**: Protocols for secure internet communication.
97. **OAuth**: A protocol for secure authentication (e.g., "Login with Google").
98. **HIPAA**: A US law about protecting medical information.
99. **GDPR**: A European law about data protection.
100. **Agile**: A project management method that involves iterative development and frequent feedback.

---

# Chapter 100: Final Acknowledgments and Closing Credits

## Core Development Team
- **Lead Developer**: Initial vision, architecture, and majority of backend code.
- **Frontend Developer**: GUI design and implementation using React and Electron.
- **DevOps Engineer**: Deployment scripts, CI/CD setup, and production infrastructure.

## Contributors
- **Medical Advisors**: Verified the accuracy of guardrails and emergency protocols.
- **Testers**: Patient testers who tried every voice command and reported bugs.
- **Translators**: Contributed translations for future multi-language support.

## Open Source Projects Used
- Python, FastAPI, React, Electron, ChromaDB, LangChain, LangGraph, and many more (see requirements.txt).

## Healthcare Partners
- WHO for providing public health guidelines.
- NIH for maintaining the RxNav drug interaction database.

## Special Thanks
- To the patients and caregivers who provided feedback.
- To the developers who opened issues and pull requests.
- To the teachers and mentors who inspired the creators.

## License
Rafiq is licensed under the MIT License.

## Contact
- For questions: Open an issue on GitHub
- For security concerns: Email security@rafiq.ai (example)
- For contributions: See CONTRIBUTING.md on GitHub

## Final Words
Thank you for taking the time to read this comprehensive guide.
We hope it has helped you understand Rafiq in depth.

Remember: Technology is a tool. The real magic happens when it is used with care, empathy, and a genuine desire to help others.

Rafiq is more than just code. It is a friend for the lonely, a guardian for the forgetful, and a voice of calm in moments of worry.

May Rafiq bring health, comfort, and peace to all who use it.

**Stay healthy. Stay informed. Stay safe.**

**The End.**
