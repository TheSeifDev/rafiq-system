import os
import sys
import time
import wave
import logging
import asyncio
import tempfile
import contextlib
import math
import struct
import threading
from pathlib import Path

try:
    import speech_recognition as sr
except ImportError:
    sr = None

from src.config.settings import BASE_DIR, GROQ_STT_MODEL, _stt_client, SUPPORTED_TRANSCRIPTION_LANGS, ENABLE_TTS_BARGE_IN, _pool
from src.utils.helpers import detect_lang, Color, tint, log, _read_field, _normalize_language
from src.services.tts_service import _wav_bytes_from_pcm, _safe_unlink, play_earcon
from src.utils.beta_telemetry import record_vad_event, record_stt_result

LAST_VOICE_EMOTION = "neutral"

try:
    import pyaudio
except ImportError:
    pyaudio = None

try:
    import webrtcvad
except ImportError:
    webrtcvad = None

_SILERO_SESSION = None
_SILERO_LOCK = threading.Lock()

def get_silero_session():
    global _SILERO_SESSION
    with _SILERO_LOCK:
        if _SILERO_SESSION is None:
            try:
                import onnxruntime as ort
                model_path = os.environ.get("RAFIQ_SILERO_VAD_PATH") or str(BASE_DIR / "data/.rafiq_cache" / "silero_vad.onnx")
                if not os.path.exists(model_path):
                    # fallback to check parent dir
                    model_path_fallback = str(Path(BASE_DIR).parent / "data/.rafiq_cache" / "silero_vad.onnx")
                    if os.path.exists(model_path_fallback):
                        model_path = model_path_fallback
                if os.path.exists(model_path):
                    opts = ort.SessionOptions()
                    opts.intra_op_num_threads = 1
                    opts.inter_op_num_threads = 1
                    _SILERO_SESSION = ort.InferenceSession(model_path, sess_options=opts)
                    log.info("Silero VAD ONNX session initialized successfully.")
                else:
                    log.warning(f"Silero VAD ONNX model file not found at {model_path}.")
                    _SILERO_SESSION = False
            except Exception as e:
                log.error(f"Failed to load Silero VAD ONNX session: {e}")
                _SILERO_SESSION = False
    return _SILERO_SESSION

def _record_silerovad_sync(timeout: float, phrase_limit: float) -> bytes | None:
    session = get_silero_session()
    if not session or not pyaudio:
        log.warning("Silero VAD ONNX session or pyaudio unavailable. Falling back.")
        return None
        
    import numpy as np
    from src.config.settings import SILERO_VAD_THRESHOLD, SILERO_VAD_SILENCE_LIMIT

    rate = 16000
    frame_len = 512  # 32ms frames for Silero
    audio = pyaudio.PyAudio()
    stream = None
    
    try:
        try:
            info = audio.get_default_input_device_info()
            log.info(f"Microphone detected: {info.get('name')} (Index {info.get('index')})")
        except Exception:
            log.info("Microphone detected: Default System Input Device")
            
        log.info("Recording started...")
        stream = audio.open(
            format=pyaudio.paInt16,
            channels=1,
            rate=rate,
            input=True,
            frames_per_buffer=frame_len,
        )
        frames: list[bytes] = []
        preroll: list[bytes] = []
        speech_started = False
        start = time.monotonic()
        speech_start = None
        last_speech = None
        
        # Initialize RNN state: shape [2, 1, 128], type float32
        state = np.zeros((2, 1, 128), dtype=np.float32)
        sr_val = np.array(rate, dtype=np.int64)
        
        # pre-roll limit for ~320ms (10 frames of 32ms)
        preroll_limit = 10

        while True:
            now = time.monotonic()
            if not speech_started and now - start > timeout:
                log.info("Recording stopped: silence timeout (no speech detected).")
                return None
            if speech_started and speech_start and now - speech_start > phrase_limit:
                log.info("Recording stopped: maximum phrase time limit reached.")
                break
                
            try:
                frame = stream.read(frame_len, exception_on_overflow=False)
            except Exception as read_err:
                log.warning(f"Silero VAD stream read error: {read_err}")
                break
                
            if not frame:
                break
            if len(frame) != frame_len * 2:
                continue
                
            # Convert frame (int16) to float32 normalized to [-1.0, 1.0]
            audio_data = np.frombuffer(frame, dtype=np.int16).astype(np.float32) / 32768.0
            chunk = np.expand_dims(audio_data, axis=0)
            
            # Run inference
            outputs = session.run(["output", "stateN"], {"input": chunk, "state": state, "sr": sr_val})
            prob = float(outputs[0][0][0])
            state = outputs[1]
            
            if prob > SILERO_VAD_THRESHOLD:
                if not speech_started:
                    speech_started = True
                    log.info("Speech detected: active speech burst started.")
                    speech_start = now
                    frames.extend(preroll)
                frames.append(frame)
                last_speech = now
            elif speech_started:
                frames.append(frame)
                if last_speech and now - last_speech >= SILERO_VAD_SILENCE_LIMIT:
                    log.info("Speech detected: speech ceased. Recording stopped.")
                    break
            else:
                preroll.append(frame)
                if len(preroll) > preroll_limit:
                    preroll.pop(0)
                    
        return _wav_bytes_from_pcm(frames, rate) if frames else None
    except Exception as e:
        log.error(f"Silero VAD mic error: {e}")
        return None
    finally:
        if stream:
            with contextlib.suppress(Exception):
                stream.stop_stream()
                stream.close()
        with contextlib.suppress(Exception):
            audio.terminate()

def _record_webrtcvad_sync(timeout: float, phrase_limit: float) -> bytes | None:
    if not pyaudio or not webrtcvad:
        return None
    rate = 16000
    frame_ms = 30
    frame_len = int(rate * frame_ms / 1000)
    vad = webrtcvad.Vad(2)
    audio = pyaudio.PyAudio()
    stream = None
    try:
        stream = audio.open(
            format=pyaudio.paInt16,
            channels=1,
            rate=rate,
            input=True,
            frames_per_buffer=frame_len,
        )
        frames: list[bytes] = []
        preroll: list[bytes] = []
        speech_started = False
        start = time.monotonic()
        speech_start = None
        last_voice = None
        silence_stop = 0.75

        while True:
            now = time.monotonic()
            if not speech_started and now - start > timeout:
                return None
            if speech_started and speech_start and now - speech_start > phrase_limit:
                break
            try:
                frame = stream.read(frame_len, exception_on_overflow=False)
            except Exception as read_err:
                log.warning(f"webrtcvad stream read error: {read_err}")
                break
            if not frame:
                break
            if len(frame) != frame_len * 2:
                continue
            is_voice = vad.is_speech(frame, rate)
            if is_voice:
                if not speech_started:
                    speech_started = True
                    speech_start = now
                    frames.extend(preroll)
                frames.append(frame)
                last_voice = now
            elif speech_started:
                frames.append(frame)
                if last_voice and now - last_voice >= silence_stop:
                    break
            else:
                preroll.append(frame)
                if len(preroll) > 10:
                    preroll.pop(0)
        return _wav_bytes_from_pcm(frames, rate) if frames else None
    except Exception as e:
        log.error(f"webrtcvad mic: {e}")
        return None
    finally:
        if stream:
            with contextlib.suppress(Exception):
                stream.stop_stream()
                stream.close()
        with contextlib.suppress(Exception):
            audio.terminate()
 # _record_webrtcvad_sync
def _mic_sync(timeout: float, phrase_limit: float) -> bytes | None:
    if sr is None:
        log.error("speech_recognition غير مثبت ولا يمكن استخدام fallback mic.")
        return None
    r = sr.Recognizer()
    r.energy_threshold = 150  # Lower default threshold is more sensitive to voice
    r.dynamic_energy_threshold = True
    try:
        with sr.Microphone() as src:
            # Removed adjust_for_ambient_noise to eliminate listening lag and avoid voice clipping
            return r.listen(src, timeout=timeout, phrase_time_limit=phrase_limit).get_wav_data()
    except sr.WaitTimeoutError:
        return None
    except Exception as e:
        log.error(f"mic_sync: {e}")
        return None
 # _mic_sync
async def _recording_indicator(stop: asyncio.Event):
    bars = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█", "▇", "▆", "▅", "▄", "▃", "▂"]
    i = 0
    while not stop.is_set():
        print("\r" + tint(f"تسجيل الصوت {bars[i % len(bars)]}", Color.BLUE), end="", flush=True)
        i += 1
        await asyncio.sleep(0.08)
    print("\r" + " " * 40 + "\r", end="", flush=True)
 # _recording_indicator
async def listen_async(timeout: float = 5.0, phrase_limit: float = 15.0) -> bytes | None:
    from src.config.settings import ENABLE_SILERO_VAD
    loop = asyncio.get_running_loop()
    t0 = time.monotonic()
    if ENABLE_SILERO_VAD and pyaudio:
        # Check if model is loadable
        session = await loop.run_in_executor(None, get_silero_session)
        if session:
            wav = await loop.run_in_executor(_pool, _record_silerovad_sync, timeout, phrase_limit)
            dur = (time.monotonic() - t0) * 1000
            record_vad_event("silero", wav is not None, dur)
            if wav:
                return wav
    if pyaudio and webrtcvad:
        wav = await loop.run_in_executor(_pool, _record_webrtcvad_sync, timeout, phrase_limit)
        dur = (time.monotonic() - t0) * 1000
        record_vad_event("webrtcvad", wav is not None, dur)
        if wav:
            return wav
    wav = await loop.run_in_executor(_pool, _mic_sync, timeout, phrase_limit)
    dur = (time.monotonic() - t0) * 1000
    record_vad_event("raw_mic", wav is not None, dur)
    return wav
 # listen_async
async def listen_with_indicator(timeout: float = 5.0, phrase_limit: float = 15.0) -> bytes | None:
    await play_earcon("bloop")
    stop = asyncio.Event()
    indicator = asyncio.create_task(_recording_indicator(stop))
    try:
        return await listen_async(timeout=timeout, phrase_limit=phrase_limit)
    finally:
        stop.set()
        await indicator
 # listen_with_indicator
async def transcribe(wav: bytes, language: str | None = None, prompt: str | None = None) -> str | None:
    if not _stt_client:
        print(tint("لم يتم ضبط GROQ_API_KEY أو مكتبة groq غير مثبتة؛ لا يمكن تحويل الصوت لنص.", Color.RED))
        return None
    path = BASE_DIR / "logs" / f"rafiq_in_{int(time.time()*1000)}.wav"
    try:
        path.write_bytes(wav)
        
        # Voice Emotion Detection — run in background and delete file upon completion
        async def _detect_emotion_bg(audio_path: str):
            global LAST_VOICE_EMOTION
            try:
                loop = asyncio.get_running_loop()
                from src.services.voice_emotion import EmotionDetector
                detector = EmotionDetector()
                emotion_res = await loop.run_in_executor(_pool, detector.detect, audio_path)
                detected_emotion = emotion_res.get("emotion", "neutral")
                log.info(f"[Voice Emotion Detected]: {detected_emotion}")
                LAST_VOICE_EMOTION = detected_emotion
            except Exception as emotion_err:
                log.warning(f"Voice emotion detection failed/skipped: {emotion_err}")
            finally:
                with contextlib.suppress(Exception):
                    await _safe_unlink(Path(audio_path))

        # Fire-and-forget emotion detection while transcription runs in parallel
        asyncio.create_task(_detect_emotion_bg(str(path)))

        kwargs = {
            "file": (path.name, path.read_bytes()),
            "model": GROQ_STT_MODEL,
            "response_format": "verbose_json",
        }
        if language:
            kwargs["language"] = language
        if not prompt:
            prompt = "رفيق، يا رفيق، رفيج، رافيج، يا رفيق سامعني، Rafiq, assistant"
        kwargs["prompt"] = prompt

        from src.utils.observability import measure_latency, log_exception
        stt_t0 = time.monotonic()
        with measure_latency("stt", extra_info={"model": GROQ_STT_MODEL}):
            t = await _stt_client.audio.transcriptions.create(**kwargs)
        stt_ms = (time.monotonic() - stt_t0) * 1000
        text = str(_read_field(t, "text") or "").strip()
        lang = _normalize_language(_read_field(t, "language")) or detect_lang(text)
        record_stt_result(stt_ms, text, lang)
        if lang not in SUPPORTED_TRANSCRIPTION_LANGS:
            log.warning("Unsupported transcription language detected: %s. Ignoring.", lang)
            return None
        log.info(f"[STT]: {text}")
        return text or None
    except Exception as e:
        log.error(f"transcribe: {e}")
        from src.utils.observability import log_exception
        log_exception(e, context="stt_transcribe")
        # Ensure cleanup if task could not be spawned
        with contextlib.suppress(Exception):
            await _safe_unlink(path)
        return None
 # transcribe

