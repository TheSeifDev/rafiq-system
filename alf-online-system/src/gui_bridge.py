import os
import sys
import asyncio
import json
import logging
import datetime
from pathlib import Path
from typing import Any
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import uvicorn

# Ensure import paths work
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from src.database.db_operational import RafiqDB
from src.services.scheduler_service import ReminderScheduler
from src.services.conv_processor import ConvEngine
from src.core import privacy
import uuid
from src.utils.observability import setup_structured_logging, request_id_var, session_id_var
from src.config import settings
import secrets
from fastapi import Depends, Header, HTTPException, status, Request

setup_structured_logging()
logger = logging.getLogger("rafiq.gui_bridge")

# Generate a cryptographically secure key for local API verification
BRIDGE_KEY = secrets.token_hex(32)

try:
    key_file_path = ROOT_DIR / ".rafiq_bridge_key"
    key_file_path.write_text(BRIDGE_KEY, encoding="utf-8")
    logger.info(f"Generated secure bridge API key at {key_file_path}")
except Exception as e:
    logger.error(f"Failed to write bridge API key: {e}")

async def verify_api_key(request: Request, x_api_key: str = Header(None)):
    # Exempt health and readiness checks
    if request.url.path in ("/health", "/ready"):
        return
    if not x_api_key or x_api_key.strip() != BRIDGE_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid or missing API key."
        )

app_sse = FastAPI()
app_api = FastAPI(dependencies=[Depends(verify_api_key)])

# CORS configuration
ALLOWED_ORIGINS = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

for app in (app_sse, app_api):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

db = None
background_tasks = set()
scheduler = None
engine = None
sse_clients = []

async def set_state(state: str, emotion: str = "neutral"):
    if db:
        await db.update_assistant_state(state)
    await broadcast_event("ai_state", {"state": state, "emotion": emotion})

async def get_state() -> str:
    if db:
        return await db.get_assistant_state()
    return "PASSIVE"

async def init_systems():
    global db, scheduler, engine
    if db is None:
        db_path = settings.DB_PATH
        logger.info(f"Initializing database at {db_path}...")
        db = await RafiqDB.create(db_path)
        
        # Subclass ReminderScheduler to broadcast events
        class GuiReminderScheduler(ReminderScheduler):
            async def _tick(self):
                # Call original tick to execute normal db operations and TTS
                await super()._tick()
                if self.just_fired and self.active:
                    self.just_fired = False
                    is_critical = self.active.get("attempts", 0) > 3 or self.active.get("status") == "alarmed"
                    level = "error" if is_critical else "warning"
                    logger.info(f"Broadcasting reminder: {self.active}")
                    await broadcast_event("emergency", {
                        "message": self.active.get("message") or "حان موعد الدواء",
                        "level": level,
                        "alert_id": f"reminder_{self.active['id']}"
                    })
                    await set_state("AWAITING_REMINDER_RESPONSE")

        scheduler = GuiReminderScheduler(db)
        engine = ConvEngine(db, scheduler)
        
        # Start the scheduler in the background
        asyncio.create_task(scheduler.run())
        logger.info("Scheduler task started successfully.")

        # Run startup health checks
        try:
            from src.services.llm_client import GLOBAL_LLM_CLIENT
            logger.info("Running LLM startup health checks...")
            asyncio.create_task(GLOBAL_LLM_CLIENT.registry.run_startup_health_checks())
        except Exception as e:
            logger.error(f"Failed to run LLM startup health checks: {e}")

async def broadcast_event(event_type: str, data: dict):
    payload = f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
    for queue in list(sse_clients):
        try:
            await queue.put(payload)
        except Exception as e:
            logger.error(f"Error putting to queue: {e}")

@app_sse.get("/events")
async def events_endpoint(request: Request):
    await init_systems()
    queue = asyncio.Queue()
    sse_clients.append(queue)
    logger.info(f"New client connected. Total clients: {len(sse_clients)}")

    async def event_generator():
        try:
            # Initial state
            current_state = await get_state()
            yield f"event: ai_state\ndata: {json.dumps({'state': current_state, 'emotion': 'neutral'}, ensure_ascii=False)}\n\n"
            while True:
                # Watch for client disconnect
                if await request.is_disconnected():
                    break
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=5.0)
                    yield data
                except asyncio.TimeoutError:
                    # Keep-alive ping
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            if queue in sse_clients:
                sse_clients.remove(queue)
            logger.info(f"Client disconnected. Total clients: {len(sse_clients)}")

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app_api.on_event("shutdown")
async def shutdown_event():
    logger.info("FastAPI shutdown event received. Cleaning up...")
    global db
    if db:
        await db.close()

@app_sse.on_event("shutdown")
async def sse_shutdown_event():
    logger.info("SSE shutdown event received. Disconnecting clients...")
    for queue in sse_clients:
        try:
            await queue.put(asyncio.CancelledError())
        except Exception:
            pass

@app_api.get("/health")
async def health_check():
    return {"status": "ok", "service": "rafiq-api"}

@app_api.get("/ready")
async def ready_check():
    global db
    if db is not None:
        return {"status": "ready"}
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=503, content={"status": "initializing"})

@app_api.get("/medications")
async def get_medications():
    await init_systems()
    meds = await db.get_active_medications()
    return meds

@app_api.get("/reminders")
async def get_reminders():
    await init_systems()
    # Fetch pending reminders
    reminders = await db._fetchall("SELECT * FROM reminders WHERE status = 'pending' ORDER BY sched_time ASC")
    return reminders

@app_api.get("/memory")
async def get_memory():
    await init_systems()
    patient_id = await db.get_patient_name() or "default_patient"
    memories = []
    
    # 1. Fetch from SQLite memory_facts
    try:
        rows = await db._fetchall("SELECT category, fact_val FROM memory_facts ORDER BY category")
        for r in rows:
            memories.append({
                "source": f"SQLite ({r['category']})",
                "text": r["fact_val"]
            })
    except Exception as e:
        logger.error(f"Error fetching from SQLite memory_facts: {e}")

    # 2. Fetch from Mem0 Clinical Memory
    if engine and engine.clinical_mem and engine.clinical_mem.enabled:
        try:
            items = await engine.clinical_mem.get_all_memories(patient_id)
            for r in items:
                text = ""
                if isinstance(r, dict) and "memory" in r:
                    text = r["memory"]
                elif hasattr(r, "memory"):
                    text = r.memory
                if text:
                    memories.append({
                        "id": r.get("id") if isinstance(r, dict) else getattr(r, "id", None),
                        "source": "Mem0 Smart Clinical Memory",
                        "text": text
                    })
        except Exception as e:
            logger.error(f"Error fetching from Mem0: {e}")
            
    # Include SQLite memory facts' ID for edit/delete operations
    sqlite_memories = []
    try:
        rows = await db._fetchall("SELECT id, category, fact_val FROM memory_facts ORDER BY category")
        for r in rows:
            sqlite_memories.append({
                "id": str(r["id"]),
                "source": "SQLite Memory Fact",
                "text": r["fact_val"],
                "category": r["category"]
            })
    except Exception as e:
        logger.error(f"Error fetching from SQLite memory_facts: {e}")

    # Combine SQLite and Mem0 memories cleanly
    all_memories = sqlite_memories + [m for m in memories]
    return {"patient_name": patient_id, "memories": all_memories}

# --- Medication CRUD Endpoints ---
@app_api.post("/medications")
async def create_medication(request: Request):
    await init_systems()
    body = await request.json()
    patient_name = await db.get_patient_name() or "default_patient"
    body["patient_name"] = patient_name
    mid = await db.add_medication(body)
    return {"status": "ok", "med_id": mid}

@app_api.put("/medications/{med_id}")
async def update_medication(med_id: int, request: Request):
    await init_systems()
    body = await request.json()
    data = {}
    for k in ["med_name", "dose", "time_str", "total_doses", "remaining_doses", "is_chronic", "active", "food_relation", "condition", "notes"]:
        if k in body:
            data[k] = body[k]
    db._update_record("medications", med_id, data)
    return {"status": "ok"}

@app_api.delete("/medications/{med_id}")
async def delete_medication(med_id: int):
    await init_systems()
    db._delete_record("medications", med_id)
    await db._execute("DELETE FROM reminders WHERE med_id = ?", (med_id,))
    return {"status": "ok"}

# --- Reminder CRUD Endpoints ---
@app_api.post("/reminders")
async def create_reminder(request: Request):
    await init_systems()
    body = await request.json()
    med_id = body.get("med_id")
    med_name = body.get("med_name", "عام")
    if not med_id:
        med_rows = await db._fetchall("SELECT id FROM medications WHERE med_name = ? LIMIT 1", (med_name,))
        if med_rows:
            med_id = med_rows[0]["id"]
        else:
            patient_name = await db.get_patient_name() or "default_patient"
            med_id = await db.add_medication({
                "patient_name": patient_name,
                "med_name": med_name,
                "dose": "حبة",
                "time_str": "عند اللزوم",
                "is_chronic": 0
            })
            
    patient = await db.get_patient_name() or "default_patient"
    msg = body.get("message") or f"موعد دواء {med_name}"
    
    sched_str = body.get("sched_time")
    if sched_str:
        try:
            sched_dt = datetime.datetime.fromisoformat(sched_str)
        except Exception:
            sched_dt = datetime.datetime.now()
    else:
        sched_dt = datetime.datetime.now()
        
    rid = await db.add_reminder(med_id, patient, msg, sched_dt)
    return {"status": "ok", "reminder_id": rid}

@app_api.put("/reminders/{reminder_id}")
async def edit_reminder(reminder_id: int, request: Request):
    await init_systems()
    body = await request.json()
    data = {}
    if "message" in body:
        data["message"] = body["message"]
    if "sched_time" in body:
        data["sched_time"] = body["sched_time"]
        data["next_attempt"] = body["sched_time"]
    if "status" in body:
        data["status"] = body["status"]
    if data:
        db._update_record("reminders", reminder_id, data)
    return {"status": "ok"}

@app_api.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: int):
    await init_systems()
    db._delete_record("reminders", reminder_id)
    return {"status": "ok"}

# --- Memory Facts CRUD Endpoints ---
@app_api.post("/memory/facts")
async def create_memory_fact(request: Request):
    await init_systems()
    body = await request.json()
    text = body.get("text", "").strip()
    source = body.get("source", "mem0").strip()
    category = body.get("category", "general").strip()
    
    if not text:
        return {"status": "error", "message": "text cannot be empty"}
        
    patient_id = await db.get_patient_name() or "default_patient"
    
    if source == "sqlite":
        key = f"fact_{int(datetime.datetime.now().timestamp())}"
        await db.upsert_fact(category, key, text)
        return {"status": "ok"}
    else:
        if engine and engine.clinical_mem and engine.clinical_mem.enabled:
            success = await engine.clinical_mem.remember_patient_info(patient_id, text)
            if success:
                return {"status": "ok"}
            else:
                return {"status": "error", "message": "Failed to add fact to Mem0"}
        else:
            return {"status": "error", "message": "Mem0 clinical memory is not enabled"}

@app_api.put("/memory/facts/{fact_id}")
async def update_memory_fact(fact_id: str, request: Request):
    await init_systems()
    body = await request.json()
    text = body.get("text", "").strip()
    source = body.get("source", "mem0").strip()
    
    if not text:
        return {"status": "error", "message": "text cannot be empty"}
        
    if source == "sqlite":
        row_id = int(fact_id)
        now = db._now_iso()
        db._update_record("memory_facts", row_id, {"fact_val": text, "updated": now})
        saved = db._get_record("memory_facts", row_id)
        if saved:
            db._vector_upsert_fact(saved)
        return {"status": "ok"}
    else:
        if engine and engine.clinical_mem and engine.clinical_mem.enabled:
            success = await engine.clinical_mem.update_memory(fact_id, text)
            if success:
                return {"status": "ok"}
            else:
                return {"status": "error", "message": "Failed to update Mem0 fact"}
        else:
            return {"status": "error", "message": "Mem0 clinical memory is not enabled"}

@app_api.delete("/memory/facts/{fact_id}")
async def delete_memory_fact(fact_id: str, request: Request):
    await init_systems()
    source = request.query_params.get("source", "mem0").strip()
    
    if source == "sqlite":
        row_id = int(fact_id)
        saved = db._get_record("memory_facts", row_id)
        if saved:
            db._vector_delete_fact(saved)
            db._delete_record("memory_facts", row_id)
            await db._record_event("delete", "memory_facts", row_id, {})
        return {"status": "ok"}
    else:
        if engine and engine.clinical_mem and engine.clinical_mem.enabled:
            success = await engine.clinical_mem.delete_memory(fact_id)
            if success:
                return {"status": "ok"}
            else:
                return {"status": "error", "message": "Failed to delete Mem0 fact"}
        else:
            return {"status": "error", "message": "Mem0 clinical memory is not enabled"}

@app_api.get("/observability/report")
async def get_observability_report():
    from src.utils.observability import generate_daily_report
    report = generate_daily_report()
    return {"report": report}

@app_api.get("/observability/beta")
async def get_beta_report():
    from src.utils.beta_telemetry import get_beta_summary
    return get_beta_summary()

@app_api.get("/health")
async def health_endpoint():
    return {"status": "ok", "timestamp": datetime.datetime.now().isoformat()}

@app_api.post("/chat")
async def chat_post(request: Request):
    await init_systems()
    current = await get_state()
    if current == "DISABLED":
        return {"status": "error", "message": "المساعد الطبي معطل حالياً. يمكنك تفعيله من الإعدادات."}
    elif current == "LOCKED":
        return {"status": "error", "message": "المساعد مغلق حالياً. يرجى إدخال رمز PIN لإلغاء القفل."}

    body = await request.json()
    user_text = body.get("text", "").strip()
    if not user_text:
        return {"status": "error", "message": "Empty query"}
    
    # Stop current speech and clear queue when user starts a new interaction
    from src.services.tts_service import stop_current_speech, clear_queue
    stop_current_speech()
    clear_queue()
    
    # Generate unique request id and session id for tracing
    req_id = f"req_{uuid.uuid4().hex[:12]}"
    sess_id = body.get("session_id") or f"sess_{uuid.uuid4().hex[:12]}"
    request_id_var.set(req_id)
    session_id_var.set(sess_id)
    
    # Process chat in background to avoid blocking the HTTP response
    task = asyncio.create_task(process_chat_background(user_text))
    background_tasks.add(task)
    task.add_done_callback(background_tasks.discard)
    return {"status": "ok", "request_id": req_id, "session_id": sess_id}

@app_api.post("/state")
async def state_post(request: Request):
    await init_systems()
    body = await request.json()
    raw_state = body.get("state", "idle").strip()
    
    # Map raw_state to the assistant state machine states
    mapped_state = "PASSIVE"
    if raw_state == "listening":
        mapped_state = "LISTENING"
    elif raw_state == "thinking":
        mapped_state = "PROCESSING"
    elif raw_state == "idle":
        if scheduler.active and scheduler.active.get("status") == "awaiting_confirmation":
            mapped_state = "AWAITING_REMINDER_RESPONSE"
        else:
            mapped_state = "PASSIVE"
            
    from src.services.stt_service import LAST_VOICE_EMOTION
    emotion = LAST_VOICE_EMOTION or "neutral"
    await set_state(mapped_state, emotion)
    return {"status": "ok"}

@app_api.post("/assistant/toggle")
async def toggle_assistant():
    await init_systems()
    current = await get_state()
    new_state = "PASSIVE" if current == "DISABLED" else "DISABLED"
    await set_state(new_state)
    return {"status": "ok", "assistant_state": new_state}

@app_api.get("/assistant/state")
async def get_assistant_state_endpoint():
    await init_systems()
    current = await get_state()
    return {"status": "ok", "assistant_state": current}

@app_api.post("/restart")
async def restart_backend_endpoint():
    logger.info("Restart requested by GUI. Shutting down process...")
    asyncio.get_running_loop().call_later(0.5, lambda: os._exit(0))
    return {"status": "ok", "message": "Backend shutting down for restart"}

@app_api.post("/assistant/barge_in")
async def assistant_barge_in():
    await init_systems()
    # 1. Stop current speech and clear speech queue
    from src.services.tts_service import stop_current_speech, clear_queue
    stop_current_speech()
    clear_queue()
    # 2. Enter LISTENING state
    await set_state("LISTENING")
    return {"status": "ok", "assistant_state": "LISTENING"}

async def process_chat_background(user_text: str):
    try:
        await set_state("PROCESSING")
        await broadcast_event("chat_start", {})

        async def on_token(token: str):
            await broadcast_event("chat_token", {"token": token})

        # Process conversation
        response = await engine.process(user_text, on_token_callback=on_token)
        
        # Check emergency
        is_emergency = "🚨" in response or "طوارئ" in response or (scheduler.active and scheduler.active.get("awaiting_wakefulness_math") is not None)
        
        from src.services.stt_service import LAST_VOICE_EMOTION
        emotion = LAST_VOICE_EMOTION or "neutral"

        if is_emergency:
            await broadcast_event("emergency", {
                "message": response,
                "level": "error" if "🚨" in response else "warning",
                "alert_id": f"alert_{int(datetime.datetime.now().timestamp())}"
            })
            
        await broadcast_event("speaking", {"text": response})
        await set_state("SPEAKING", emotion)
        
        # Synthesize and speak audibly if speak service is active
        # (Runs locally on Mini PC / speakers)
        from src.services.tts_service import speak
        await speak(response, priority="high")
        
        if scheduler.active and scheduler.active.get("status") == "awaiting_confirmation":
            await set_state("AWAITING_REMINDER_RESPONSE", emotion)
        else:
            await set_state("PASSIVE", emotion)
            
    except Exception as e:
        logger.error(f"Chat processing error: {e}", exc_info=True)
        await set_state("ERROR")
        await broadcast_event("speaking", {"text": "عذراً، حدث خطأ أثناء معالجة طلبك."})

async def main():
    await init_systems()
    config_sse = uvicorn.Config(app_sse, host="127.0.0.1", port=3001, log_level="info")
    server_sse = uvicorn.Server(config_sse)
    
    config_api = uvicorn.Config(app_api, host="127.0.0.1", port=3002, log_level="info")
    server_api = uvicorn.Server(config_api)

    await asyncio.gather(
        server_sse.serve(),
        server_api.serve()
    )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Servers shutting down cleanly.")
