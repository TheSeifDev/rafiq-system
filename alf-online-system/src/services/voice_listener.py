"""
Rafiq v4.2 — Voice Listener Process
Runs in a separate OS process to isolate PortAudio/PyAudio GIL locks.
Listens to the physical microphone, transcribes voice using Whisper, and POSTs to the GUI bridge.
"""
import os
import sys
import time
import logging
import asyncio

# Add current directory to path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Get root directory of project and add it
ROOT_DIR = os.path.dirname(os.path.dirname(BASE_DIR))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

from src.database.db_operational import RafiqDB
from src.services.wake_detector import LocalWakeWordDetector
from src.services import stt_service
from src.config.settings import load_dotenv_manually, DB_PATH
from src.utils.helpers import is_end_phrase, is_wake_word
from src.core import privacy

try:
    import httpx
except ImportError:
    httpx = None

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("rafiq.voice_listener")
privacy.install_phi_log_filter(log)

CHAT_URL = "http://127.0.0.1:3002/chat"
STATE_URL = "http://127.0.0.1:3002/state"

# Maximum retries when bridge server is unreachable
_MAX_CONNECT_RETRIES = 5
_CONNECT_RETRY_DELAY = 2.0


async def _post_to_bridge(client, url: str, payload: dict, headers: dict, timeout: float = 10.0) -> bool:
    """Non-blocking POST to the bridge server with retry on connection error."""
    for attempt in range(_MAX_CONNECT_RETRIES):
        try:
            resp = await client.post(url, json=payload, headers=headers, timeout=timeout)
            return resp.status_code == 200
        except (httpx.ConnectError, httpx.ConnectTimeout) as ex:
            if attempt < _MAX_CONNECT_RETRIES - 1:
                delay = _CONNECT_RETRY_DELAY * (attempt + 1)
                log.warning(f"Bridge connection attempt {attempt + 1} failed: {ex}. Retrying in {delay:.1f}s...")
                await asyncio.sleep(delay)
            else:
                log.error(f"Bridge server unreachable after {_MAX_CONNECT_RETRIES} attempts: {ex}")
                return False
        except Exception as ex:
            log.error(f"Failed to post to bridge: {ex}")
            return False
    return False


async def _post_to_bridge_sync_fallback(url: str, payload: dict, headers: dict, timeout: float = 10.0) -> bool:
    """Synchronous fallback using urllib when httpx is not available."""
    import json
    import urllib.request
    import urllib.error

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={**headers, "Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status == 200
    except Exception as ex:
        log.error(f"Failed to post to bridge (sync fallback): {ex}")
        return False


async def main_loop():
    # Wait for bridge server to start and generate the key file
    await asyncio.sleep(5)
    
    bridge_api_key = ""
    try:
        key_path = os.path.join(ROOT_DIR, ".rafiq_bridge_key")
        if os.path.exists(key_path):
            with open(key_path, "r", encoding="utf-8") as f:
                bridge_api_key = f.read().strip()
        log.info("Loaded bridge API key successfully in voice_listener.")
    except Exception as ex:
        log.error(f"Failed to load bridge API key: {ex}")
        
    db_path = os.environ.get("RAFIQ_DB_PATH") or DB_PATH
    db = await RafiqDB.create(db_path)
    wake = LocalWakeWordDetector()
    conv_active = False
    
    log.info("Voice listener process started successfully. Entering mic loop...")
    
    headers = {"X-API-Key": bridge_api_key}

    # Use async httpx client for non-blocking I/O, fall back to sync urllib
    use_async = httpx is not None
    client = httpx.AsyncClient() if use_async else None

    async def post(payload: dict, timeout: float = 10.0) -> bool:
        if client:
            return await _post_to_bridge(client, CHAT_URL, payload, headers, timeout)
        else:
            loop = asyncio.get_running_loop()
            return await loop.run_in_executor(None, lambda: asyncio.run(_post_to_bridge_sync_fallback(CHAT_URL, payload, headers, timeout)))

    async def post_state(state: str):
        """Notify the GUI bridge about a state change (listening/thinking/idle)."""
        try:
            if client:
                await _post_to_bridge(client, STATE_URL, {"state": state}, headers, timeout=3.0)
            else:
                await _post_to_bridge_sync_fallback(STATE_URL, {"state": state}, headers, timeout=3.0)
        except Exception as e:
            log.debug(f"Failed to post state '{state}': {e}")

    try:
        while True:
            try:
                # Read current state from db
                db_state = "PASSIVE"
                try:
                    cursor = db.sqlite_conn.cursor()
                    cursor.execute("SELECT assistant_state FROM assistant_settings LIMIT 1")
                    row = cursor.fetchone()
                    if row:
                        db_state = row[0]
                except Exception as e:
                    log.error(f"Error querying assistant state in listener: {e}")

                if db_state in ("DISABLED", "LOCKED", "ERROR"):
                    conv_active = False
                    await asyncio.sleep(1.0)
                    continue

                if db_state == "SPEAKING":
                    # Assistant is speaking. Listen for barge-in voice activity
                    wav = await stt_service.listen_async(timeout=1.0, phrase_limit=3.0)
                    if wav:
                        log.info("Speech detected during SPEAKING. Triggering barge-in...")
                        # Call barge-in endpoint
                        url = "http://127.0.0.1:3002/assistant/barge_in"
                        try:
                            if client:
                                await client.post(url, json={}, headers=headers, timeout=5.0)
                            else:
                                await _post_to_bridge_sync_fallback(url, {}, headers, timeout=5.0)
                        except Exception as ex:
                            log.error(f"Failed to post barge-in: {ex}")
                        
                        # Transcribe the barge-in utterance
                        user_text = await stt_service.transcribe(wav)
                        if user_text:
                            log.info(f"Barge-in speech transcribed: '{user_text}'")
                            conv_active = True
                            await post({"text": user_text}, timeout=25.0)
                        else:
                            # Just set active conversation state and continue
                            conv_active = True
                        continue
                    else:
                        await asyncio.sleep(0.1)
                        continue

                if db_state == "AWAITING_REMINDER_RESPONSE":
                    conv_active = True # Force active session style
                    await post_state("listening")
                    wav = await stt_service.listen_with_indicator(timeout=1.5, phrase_limit=20.0)
                    if not wav:
                        await asyncio.sleep(0.5)
                        continue
                    
                    await post_state("thinking")
                    user_text = await stt_service.transcribe(wav)
                    if not user_text:
                        continue
                    
                    log.info("Awaiting reminder direct response transcribed (redacted): '%s'", privacy.redact_phi(user_text))
                    await post({"text": user_text}, timeout=25.0)
                    continue

                if not conv_active:
                    woke = False
                    if wake.available():
                        woke = await wake.wait_for_wake(timeout=3.0)
                    else:
                        # Software wake word fallback: listen to microphone and transcribe
                        wav = await stt_service.listen_async(timeout=3.0, phrase_limit=4.0)
                        if wav:
                            user_text = await stt_service.transcribe(wav)
                            if user_text and is_wake_word(user_text):
                                woke = True
                                log.info(f"Software wake word matched on transcription: '{user_text}'")
                    
                    if not woke:
                        await asyncio.sleep(0.1)
                        continue
                    
                    log.info("Wake word detected! Activating session...")
                    conv_active = True
                    
                    await post({"text": "رفيق"})
                    continue

                # Tell GUI we are listening now
                await post_state("listening")
                wav = await stt_service.listen_with_indicator(timeout=1.5, phrase_limit=20.0)
                
                if not wav:
                    conv_active = False
                    await post_state("idle")
                    await post({"text": "خلاص"})
                    continue
                
                # Tell GUI we are transcribing/thinking
                await post_state("thinking")
                user_text = await stt_service.transcribe(wav)
                if not user_text:
                    await post_state("idle")
                    continue
                    
                log.info("Voice transcribed (redacted): '%s'", privacy.redact_phi(user_text))
                
                if is_end_phrase(user_text):
                    conv_active = False
                    
                await post({"text": user_text}, timeout=25.0)
                    
            except Exception as e:
                log.error(f"Error in voice listener loop: {e}", exc_info=True)
                await asyncio.sleep(1.0)
    finally:
        if client:
            await client.aclose()

if __name__ == "__main__":
    try:
        load_dotenv_manually()
        asyncio.run(main_loop())
    except KeyboardInterrupt:
        log.info("Voice listener terminated.")
