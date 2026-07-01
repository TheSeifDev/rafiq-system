import os
import re
import sys
import time
import math
import io
import threading
import contextlib
import shutil
import wave
import struct
import logging
import asyncio
import subprocess
from pathlib import Path

from src.config.settings import BASE_DIR, ENABLE_TTS_BARGE_IN, ENABLE_EARCONS, _pool
from src.utils.helpers import detect_lang, Color, tint, log

try:
    import edge_tts
except ImportError:
    edge_tts = None

try:
    import pygame
except ImportError:
    pygame = None

try:
    import pyaudio
except ImportError:
    pyaudio = None

_active_playout_process = None



def _generate_tone_wav(path: Path, freq: int = 880, duration: float = 0.16, rate: int = 22050, volume: int = 9000):
    n = int(rate * duration)
    samples = [int(volume * math.sin(2 * math.pi * freq * i / rate)) for i in range(n)]
    with wave.open(str(path), "w") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(rate)
        f.writeframes(struct.pack(f"<{n}h", *samples))
 # _generate_tone_wav
async def _terminate_process(process: asyncio.subprocess.Process, timeout: float = 1.5):
    if process.returncode is not None:
        return
    with contextlib.suppress(ProcessLookupError):
        process.kill()
    try:
        await asyncio.shield(asyncio.wait_for(process.wait(), timeout=timeout))
    except Exception:
        pass
 # _terminate_process
async def _safe_unlink(path: Path, attempts: int = 20, delay: float = 0.5):
    for attempt in range(attempts):
        try:
            path.unlink()
            return
        except FileNotFoundError:
            return
        except PermissionError:
            if attempt == attempts - 1:
                log.warning(f"Could not delete locked temp audio file: {path}")
                return
            await asyncio.sleep(delay * (attempt + 1))
        except OSError as e:
            log.warning(f"Could not delete temp audio file {path}: {e}")
            return
 # _safe_unlink
async def _play_wav(path: Path, timeout: float = 3.0):
    if not shutil.which("ffplay"):
        return
    global _active_playout_process
    _active_playout_process = None
    try:
        _active_playout_process = await asyncio.create_subprocess_exec(
            "ffplay",
            "-nodisp",
            "-autoexit",
            "-loglevel",
            "quiet",
            str(path),
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await asyncio.wait_for(_active_playout_process.wait(), timeout=timeout)
    except asyncio.TimeoutError:
        if _active_playout_process:
            await _terminate_process(_active_playout_process)
    except asyncio.CancelledError:
        if _active_playout_process:
            await _terminate_process(_active_playout_process)
        raise
    finally:
        _active_playout_process = None
 # _play_wav
async def play_earcon(kind: str):
    if not ENABLE_EARCONS:
        return
    path = BASE_DIR / "logs" / f"rafiq_{kind}_{int(time.time()*1000)}.wav"
    try:
        if kind == "bloop":
            _generate_tone_wav(path, freq=620, duration=0.12, volume=6500)
        elif kind == "chime":
            _generate_tone_wav(path, freq=980, duration=0.22, volume=7000)
        elif kind == "hum":
            _generate_tone_wav(path, freq=180, duration=0.9, volume=900)
        elif kind == "siren":
            # Generate a loud 3-second siren tone with oscillating frequency
            rate = 22050
            duration = 3.0
            n = int(rate * duration)
            samples = []
            for i in range(n):
                t = i / rate
                # Oscillate frequency between 700Hz and 1200Hz
                freq = 950 + 250 * math.sin(2 * math.pi * 2.0 * t)
                samples.append(int(16000 * math.sin(2 * math.pi * freq * t)))
            with wave.open(str(path), "w") as f:
                f.setnchannels(1)
                f.setsampwidth(2)
                f.setframerate(rate)
                f.writeframes(struct.pack(f"<{n}h", *samples))
            await _play_wav(path, timeout=4.0)
            return
        else:
            return
        await _play_wav(path, timeout=2.0)
    except Exception as e:
        log.error(f"earcon {kind}: {e}")
    finally:
        await _safe_unlink(path)
 # play_earcon
async def _thinking_hum(stop: asyncio.Event):
    while not stop.is_set():
        await play_earcon("hum")
        with contextlib.suppress(asyncio.TimeoutError):
            await asyncio.wait_for(stop.wait(), timeout=0.1)
 # _thinking_hum
def _wav_bytes_from_pcm(frames: list[bytes], rate: int) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        wf.writeframes(b"".join(frames))
    return buf.getvalue()
 # _wav_bytes_from_pcm
def _tts_style(text: str, sentiment: str | None) -> tuple[str, str, str]:
    lang = detect_lang(text)
    voice = "en-US-AvaNeural" if lang == "en" else "ar-EG-SalmaNeural"
    if sentiment == "distressed":
        return voice, "-5%" if lang == "ar" else "-5%", "-5Hz"
    if sentiment == "urgent":
        return voice, "+8%" if lang == "ar" else "+6%", "-2Hz"
    if sentiment == "positive":
        return voice, "+5%" if lang == "ar" else "+4%", "+3Hz"
    return voice, "+0%" if lang == "ar" else "+0%", "+0Hz"
 # _tts_style
def split_into_sentences(text: str) -> list[str]:
    # Strip any bracketed citations/links (e.g. [WHO-1]) instead of discarding text before them
    clean = re.sub(r"\[[^\]]*\]", "", text)
    for ch in ["*", "_", "#", "`", "~"]:
        clean = clean.replace(ch, "")
    clean = clean.strip()
    if not clean:
        return []
    # Split by sentence boundaries: . or ! or ؟ or \n
    sentences = re.split(r'(?<=[.!?؟\n])\s+', clean)
    return [s.strip() for s in sentences if s.strip()]
 # split_into_sentences
def _rms(data: bytes) -> float:
    if not data:
        return 0.0
    count = len(data) // 2
    if count == 0:
        return 0.0
    samples = struct.unpack(f"<{count}h", data[: count * 2])
    return math.sqrt(sum(s * s for s in samples) / count)


def _barge_in_sync(max_seconds: float = 60.0, stop_event: threading.Event | None = None) -> bool:
    # Bypassed to avoid PortAudio device conflicts. Barge-in is managed by voice_listener process.
    end = time.monotonic() + max_seconds
    while time.monotonic() < end and not (stop_event and stop_event.is_set()):
        time.sleep(0.1)
    return False


async def _barge_in_watch(stop_event: threading.Event, on_detect_cb) -> bool:
    if not ENABLE_TTS_BARGE_IN:
        while not stop_event.is_set():
            await asyncio.sleep(0.5)
        return False
    loop = asyncio.get_running_loop()
    detected = await loop.run_in_executor(_pool, _barge_in_sync, 60.0, stop_event)
    if detected:
        if on_detect_cb:
            on_detect_cb()
        print(tint("\nسمعتك، وقفت الكلام. قول لي الأمر الجديد.", Color.BLUE))
        return True
    return False


import dataclasses
from typing import Any

@dataclasses.dataclass(order=True)
class QueueItem:
    priority: int
    insert_time: float
    request: Any = dataclasses.field(compare=False)

class SpeechRequest:
    def __init__(self, text: str, priority: int, retries: int, sentiment: str | None, on_start_play):
        self.text = text
        self.priority = priority
        self.retries = retries
        self.sentiment = sentiment
        self.on_start_play = on_start_play
        self.done_event = asyncio.Event()
        self.interrupted = False
        self.cancelled = False

class TTSManager:
    def __init__(self):
        self.queue = asyncio.PriorityQueue()
        self.lock = asyncio.Lock()
        self.current_request = None
        self.current_task = None
        self.active_playout_process = None
        
        # Telemetry
        self.interrupted_count = 0
        self.overlap_prevention_count = 0
        self.worker_task = None

    def start(self):
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return
        if self.worker_task is None or self.worker_task.done():
            self.worker_task = loop.create_task(self._worker_loop())

    def _map_priority(self, p_str: str) -> int:
        mapping = {
            "emergency": 0,
            "high": 1,
            "medium": 2,
            "low": 3
        }
        return mapping.get(p_str.lower(), 1) # Default to high (1)

    async def _worker_loop(self):
        log.info("[TTSManager] Playout worker loop started.")
        try:
            while True:
                try:
                    item = await self.queue.get()
                    request = item.request
                    
                    if request.cancelled:
                        self.queue.task_done()
                        continue
                    
                    async with self.lock:
                        self.current_request = request
                        
                        self.current_task = asyncio.create_task(self._play_request(request))
                        try:
                            await self.current_task
                        except asyncio.CancelledError:
                            request.interrupted = True
                            self.interrupted_count += 1
                            log.info(f"[TTSManager] Playout interrupted/cancelled for request: {request.text[:20]}...")
                        finally:
                            self.current_task = None
                            self.current_request = None
                            request.done_event.set()
                            self.queue.task_done()
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    log.error(f"[TTSManager] Error in worker loop: {e}", exc_info=True)
                    await asyncio.sleep(0.1)
        except (asyncio.CancelledError, GeneratorExit, RuntimeError):
            pass
        finally:
            log.info("[TTSManager] Playout worker loop stopped.")

    def stop_current_speech(self) -> bool:
        interrupted = False
        
        if self.active_playout_process and self.active_playout_process.returncode is None:
            log.info("[TTSManager] Terminating active playout subprocess.")
            with contextlib.suppress(Exception):
                self.active_playout_process.kill()
            interrupted = True
            
        if pygame and pygame.mixer.get_init() and pygame.mixer.music.get_busy():
            log.info("[TTSManager] Stopping pygame music.")
            with contextlib.suppress(Exception):
                pygame.mixer.music.stop()
            interrupted = True
            
        if self.current_task and not self.current_task.done():
            log.info("[TTSManager] Cancelling current playout task.")
            self.current_task.cancel()
            interrupted = True
            
        if interrupted:
            if self.current_request:
                self.current_request.interrupted = True
            return True
        return False

    def clear_queue(self):
        log.info("[TTSManager] Clearing all pending requests from queue.")
        while not self.queue.empty():
            try:
                item = self.queue.get_nowait()
                if item and item.request:
                    item.request.cancelled = True
                    item.request.done_event.set()
                self.queue.task_done()
            except asyncio.QueueEmpty:
                break
        self.stop_current_speech()

    async def speak(self, text: str, priority: str = "high", retries: int = 2, sentiment: str | None = None, on_start_play = None):
        p_val = self._map_priority(priority)
        
        overlap_prevented = False
        if self.current_request:
            overlap_prevented = True
            if p_val < self.current_request.priority:
                log.info(f"[TTSManager] Higher priority request ({priority}, priority={p_val}) preempting current speech (priority={self.current_request.priority}).")
                self.stop_current_speech()
        elif self.queue.qsize() > 0:
            overlap_prevented = True
            
        if overlap_prevented:
            self.overlap_prevention_count += 1
            
        request = SpeechRequest(text, p_val, retries, sentiment, on_start_play)
        item = QueueItem(p_val, time.time(), request)
        await self.queue.put(item)
        
        try:
            await request.done_event.wait()
        except asyncio.CancelledError:
            request.cancelled = True
            if self.current_request == request:
                self.stop_current_speech()
            raise
        finally:
            from src.utils.observability import log_tts_metric
            log_tts_metric(len(text), self.queue.qsize(), request.interrupted, overlap_prevented)

    async def _play_request(self, request: SpeechRequest):
        text = request.text
        retries = request.retries
        sentiment = request.sentiment
        on_start_play = request.on_start_play
        
        sentences = split_into_sentences(text)
        if not sentences:
            return
            
        clean = " ".join(sentences)

        if os.environ.get("RAFIQ_OFFLINE", "0") == "1":
            print(tint(f"صوت رفيق (OFFLINE): {clean}", Color.DIM))
            if on_start_play:
                try:
                    if asyncio.iscoroutinefunction(on_start_play):
                        await on_start_play(clean)
                    else:
                        on_start_play(clean)
                except TypeError:
                    try:
                        if asyncio.iscoroutinefunction(on_start_play):
                            await on_start_play()
                        else:
                            on_start_play()
                    except Exception as cb_err:
                        log.error(f"Error in offline on_start_play callback: {cb_err}")
                except Exception as cb_err:
                    log.error(f"Error in offline on_start_play callback: {cb_err}")
            return

        if not edge_tts:
            print(tint(f"صوت رفيق غير متاح: {clean}", Color.DIM))
            return

        has_pygame = False
        try:
            import pygame
            if pygame is not None:
                if not pygame.mixer.get_init():
                    pygame.mixer.init()
                has_pygame = True
        except Exception:
            pass
        has_ffplay = shutil.which("ffplay") is not None

        if not has_pygame and not has_ffplay:
            log.warning("No audio player found (pygame or ffplay). Cannot play audio.")
            print(tint(f"لا يوجد مشغل صوت (pygame/ffplay)؛ رد رفيق النصي: {clean}", Color.DIM))
            return

        log.info(f"[TTS] Using player: {'pygame' if has_pygame else 'ffplay'} for text: {clean[:20]}...")

        audio_queue = asyncio.Queue()

        async def generate_worker():
            log.info("[TTS Worker] Starting generation worker...")
            for i, sentence in enumerate(sentences):
                voice, rate, pitch = _tts_style(sentence, sentiment)
                out_file = BASE_DIR / "logs" / f"rafiq_tts_part_{i}_{int(time.time()*1000)}.mp3"
                log.info(f"[TTS Worker] Generating part {i}: '{sentence}' (Voice: {voice}) -> {out_file}")
                
                for attempt in range(retries + 1):
                    try:
                        from src.utils.observability import measure_latency, log_exception
                        with measure_latency("tts", extra_info={"voice": voice, "attempt": attempt + 1}):
                            await edge_tts.Communicate(sentence, voice, rate=rate, pitch=pitch).save(str(out_file))
                        
                        file_exists = out_file.exists()
                        file_size = out_file.stat().st_size if file_exists else 0
                        log.info(f"[TTS Worker] Successfully saved: {out_file} | Exists: {file_exists} | Size: {file_size} bytes")
                        
                        await audio_queue.put((i, out_file, sentence))
                        break
                    except Exception as e:
                        log.error(f"TTS generation failed for sentence {i}, attempt {attempt+1}: {e}")
                        from src.utils.observability import log_exception
                        log_exception(e, context=f"tts_generate:sentence_{i}:attempt_{attempt+1}")
                        if attempt == retries:
                            await audio_queue.put((i, None, sentence))
                        else:
                            await asyncio.sleep(0.2)
            log.info("[TTS Worker] Generation worker finished. Enqueuing sentinel.")
            await audio_queue.put((None, None, None))

        gen_task = asyncio.create_task(generate_worker())
        files_to_delete = []

        try:
            while True:
                idx, out_file, sentence = await audio_queue.get()
                if idx is None:
                    break
                if out_file is None:
                    print(tint(f"صوت رفيق (فشل التوليد): {sentence}", Color.DIM))
                    continue

                files_to_delete.append(out_file)

                if on_start_play:
                    try:
                        if asyncio.iscoroutinefunction(on_start_play):
                            await on_start_play(sentence)
                        else:
                            on_start_play(sentence)
                    except TypeError:
                        try:
                            if asyncio.iscoroutinefunction(on_start_play):
                                await on_start_play()
                            else:
                                on_start_play()
                        except Exception as cb_err:
                            log.error(f"Error in on_start_play callback: {cb_err}")
                    except Exception as cb_err:
                        log.error(f"Error in on_start_play callback: {cb_err}")

                if has_pygame:
                    import pygame
                    barge_stop = threading.Event()
                    
                    def stop_pygame():
                        try:
                            if pygame.mixer.get_init():
                                pygame.mixer.music.stop()
                        except Exception as e:
                            log.error(f"pygame stop error in barge_in: {e}")

                    barge_task = asyncio.create_task(_barge_in_watch(barge_stop, stop_pygame))
                    
                    try:
                        log.info(f"[TTS Player] Loading pygame music: {out_file}")
                        pygame.mixer.music.load(str(out_file))
                        log.info(f"[TTS Player] Playing pygame music: {out_file}")
                        pygame.mixer.music.play()
                    except Exception as ex:
                        log.error(f"pygame load/play error: {ex}")
                        barge_stop.set()
                        barge_task.cancel()
                        continue
                    
                    async def wait_pygame():
                        try:
                            while pygame.mixer.music.get_busy():
                                await asyncio.sleep(0.05)
                        except Exception as e:
                            log.error(f"pygame wait error: {e}")
                    
                    wait_task = asyncio.create_task(wait_pygame())
                    
                    done, pending = await asyncio.wait(
                        {wait_task, barge_task}, timeout=60, return_when=asyncio.FIRST_COMPLETED,
                    )
                    barge_stop.set()
                    
                    barge_detected = False
                    if barge_task in done:
                        barge_detected = barge_task.result()
                    
                    try:
                        if pygame.mixer.music.get_busy() or barge_detected:
                            pygame.mixer.music.stop()
                        pygame.mixer.music.unload()
                    except Exception as ex:
                        log.error(f"pygame cleanup error: {ex}")
                    
                    for task in pending:
                        task.cancel()
                    with contextlib.suppress(asyncio.CancelledError):
                        await asyncio.gather(*pending)
                        
                    log.info(f"[TTS Player] Playback finished for part {idx}")
                    
                    if barge_detected:
                        break
                elif has_ffplay:
                    ffplay_args = ["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", str(out_file)]
                    log.info(f"[TTS Player] Starting ffplay process with exact command: {' '.join(ffplay_args)}")
                    self.active_playout_process = await asyncio.create_subprocess_exec(
                        *ffplay_args,
                        stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
                    )
                    
                    async def wait_ffplay():
                        code = await self.active_playout_process.wait()
                        log.info(f"[TTS Player] ffplay finished with exit code: {code}")
                        return code
                    
                    wait_task = asyncio.create_task(wait_ffplay())
                    barge_stop = threading.Event()
                    
                    def kill_ffplay():
                        if self.active_playout_process and self.active_playout_process.returncode is None:
                            with contextlib.suppress(Exception):
                                self.active_playout_process.kill()

                    barge_task = asyncio.create_task(_barge_in_watch(barge_stop, kill_ffplay))
                    done, pending = await asyncio.wait(
                        {wait_task, barge_task}, timeout=60, return_when=asyncio.FIRST_COMPLETED,
                    )
                    barge_stop.set()
                    
                    barge_detected = False
                    if barge_task in done:
                        barge_detected = barge_task.result()
                        
                    if not done and self.active_playout_process.returncode is None:
                        await _terminate_process(self.active_playout_process)
                    for task in pending:
                        task.cancel()
                    with contextlib.suppress(asyncio.CancelledError):
                        await asyncio.gather(*pending)
                    self.active_playout_process = None
                    
                    if barge_detected:
                        break
        finally:
            if not gen_task.done():
                gen_task.cancel()
            with contextlib.suppress(Exception, asyncio.CancelledError):
                await gen_task
                
            if has_pygame:
                with contextlib.suppress(Exception):
                    if pygame.mixer.get_init():
                        if pygame.mixer.music.get_busy():
                            pygame.mixer.music.stop()
                        pygame.mixer.music.unload()
                        
            if self.active_playout_process:
                with contextlib.suppress(Exception):
                    if self.active_playout_process.returncode is None:
                        self.active_playout_process.kill()
                self.active_playout_process = None

            for f in files_to_delete:
                log.info(f"[TTS Cleanup] Attempting to delete {f}")
                with contextlib.suppress(Exception):
                    await asyncio.shield(_safe_unlink(f))
                    
            log.info("[TTS] _play_request fully completed.")

_tts_manager = None
_tts_manager_lock = threading.Lock()

def get_tts_manager() -> TTSManager:
    global _tts_manager
    if _tts_manager is None:
        with _tts_manager_lock:
            if _tts_manager is None:
                _tts_manager = TTSManager()
    return _tts_manager

async def speak(text: str, priority: str = "high", retries: int = 2, sentiment: str | None = None, on_start_play = None):
    mgr = get_tts_manager()
    mgr.start()
    await mgr.speak(text, priority=priority, retries=retries, sentiment=sentiment, on_start_play=on_start_play)

def stop_current_speech() -> bool:
    mgr = get_tts_manager()
    return mgr.stop_current_speech()

def clear_queue():
    mgr = get_tts_manager()
    mgr.clear_queue()
 # speak
async def play_alarm():
    print("\n🚨🚨🚨  إنذار طبي!  🚨🚨🚨")
    beep_path = BASE_DIR / "rafiq_alarm.wav"
    try:
        _generate_tone_wav(beep_path, freq=880, duration=0.4, volume=28000)
        for _ in range(5):
            await _play_wav(beep_path, timeout=5)
            await asyncio.sleep(0.2)
    except Exception as e:
        log.error(f"Alarm: {e}")
        for _ in range(5):
            print("\a", end="", flush=True)
            await asyncio.sleep(0.3)
    finally:
        await _safe_unlink(beep_path)
 # play_alarm
