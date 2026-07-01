import os
import sys
import time
import struct
import logging
import asyncio
import contextlib
from pathlib import Path

try:
    import pyaudio
except ImportError:
    pyaudio = None

try:
    import speech_recognition as sr
except ImportError:
    sr = None

from src.config.settings import BASE_DIR, _pool
from src.utils.helpers import log
from src.services.stt_service import _mic_sync

try:
    import pvporcupine
except ImportError:
    pvporcupine = None

try:
    import pocketsphinx
except ImportError:
    pocketsphinx = None

class LocalWakeWordDetector:
    def __init__(self):
        self.mode = "fallback"
        self.keyword_path = os.environ.get("RAFIQ_PORCUPINE_KEYWORD_PATH")
        self.picovoice_key = os.environ.get("PICOVOICE_ACCESS_KEY")
        if pvporcupine and pyaudio and self.keyword_path and self.picovoice_key:
            self.mode = "porcupine"
        elif sr is not None:
            try:
                import pocketsphinx  # noqa: F401

                self.mode = "pocketsphinx"
            except ImportError:
                self.mode = "fallback"
        log.info(f"Wake detector mode: {self.mode}")

    def available(self) -> bool:
        return self.mode in {"porcupine", "pocketsphinx"}

    async def wait_for_wake(self, timeout: float = 5.0) -> bool:
        loop = asyncio.get_running_loop()
        if self.mode == "porcupine":
            return await loop.run_in_executor(_pool, self._wait_porcupine_sync, timeout)
        if self.mode == "pocketsphinx":
            return await loop.run_in_executor(_pool, self._wait_sphinx_sync, timeout)
        return False

    def _wait_porcupine_sync(self, timeout: float) -> bool:
        porcupine = None
        audio = None
        stream = None
        try:
            porcupine = pvporcupine.create(access_key=self.picovoice_key, keyword_paths=[self.keyword_path])
            audio = pyaudio.PyAudio()
            stream = audio.open(
                rate=porcupine.sample_rate,
                channels=1,
                format=pyaudio.paInt16,
                input=True,
                frames_per_buffer=porcupine.frame_length,
            )
            end = time.monotonic() + timeout
            while time.monotonic() < end:
                pcm = stream.read(porcupine.frame_length, exception_on_overflow=False)
                pcm = struct.unpack_from("h" * porcupine.frame_length, pcm)
                if porcupine.process(pcm) >= 0:
                    return True
            return False
        except Exception as e:
            log.error(f"Porcupine wake: {e}")
            return False
        finally:
            if stream:
                with contextlib.suppress(Exception):
                    stream.stop_stream()
                    stream.close()
            if audio:
                with contextlib.suppress(Exception):
                    audio.terminate()
            if porcupine:
                with contextlib.suppress(Exception):
                    porcupine.delete()

    def _wait_sphinx_sync(self, timeout: float) -> bool:
        if sr is None:
            return False
        recognizer = sr.Recognizer()
        try:
            with sr.Microphone() as source:
                audio = recognizer.listen(source, timeout=timeout, phrase_time_limit=3)
            text = recognizer.recognize_sphinx(audio, keyword_entries=[("rafiq", 1.0), ("hey rafiq", 1.0)])
            return "rafiq" in text.lower()
        except Exception:
            return False
 # LocalWakeWordDetector
