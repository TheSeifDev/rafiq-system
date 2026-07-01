import os
import sys
import asyncio
import unittest
import time
import subprocess
import wave
import struct
import math
from unittest.mock import patch
from pathlib import Path

# Add project root to path
ROOT_DIR = "c:/Users/aboha/Desktop/rafiq-system"
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# Generate a tiny tone wav file for mocking edge_tts
def generate_tiny_audio(path: Path, duration: float = 0.4):
    rate = 16000
    n = int(rate * duration)
    samples = [int(4000 * math.sin(2 * math.pi * 440 * i / rate)) for i in range(n)]
    with wave.open(str(path), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(rate)
        f.writeframes(struct.pack(f"<{n}h", *samples))

# Mock edge_tts Communicate to bypass internet requests and generate local sound
class MockCommunicate:
    def __init__(self, text, voice, rate=None, pitch=None):
        self.text = text
        self.voice = voice

    async def save(self, path_str):
        path = Path(path_str)
        path.parent.mkdir(parents=True, exist_ok=True)
        generate_tiny_audio(path, duration=0.4)

class TestTTSOverlapFix(unittest.TestCase):
    def setUp(self):
        # Ensure offline mode is disabled so it tries to play via ffplay
        self.orig_offline = os.environ.get("RAFIQ_OFFLINE")
        os.environ["RAFIQ_OFFLINE"] = "0"
        
        # Reset the global tts manager
        from src.services.tts_service import get_tts_manager
        self.manager = get_tts_manager()
        self.manager.clear_queue()

    def tearDown(self):
        if self.orig_offline is not None:
            os.environ["RAFIQ_OFFLINE"] = self.orig_offline
        else:
            os.environ.pop("RAFIQ_OFFLINE", None)
        self.manager.clear_queue()

    @patch("edge_tts.Communicate", MockCommunicate)
    @patch.dict("sys.modules", {"pygame": None})
    def test_overlapping_playback_prevention(self):
        """Simultaneously triggers three speak() calls with priorities and asserts max concurrent ffplay is exactly 1."""
        from src.services.tts_service import speak
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        max_concurrent_observed = 0
        monitor_stop = asyncio.Event()
        
        async def monitor_ffplay():
            nonlocal max_concurrent_observed
            while not monitor_stop.is_set():
                try:
                    # Query running ffplay.exe processes using tasklist
                    out = subprocess.check_output(["tasklist", "/FI", "IMAGENAME eq ffplay.exe", "/FO", "CSV", "/NH"], shell=False, text=True)
                    count = sum(1 for line in out.strip().split("\n") if "ffplay.exe" in line)
                    if count > max_concurrent_observed:
                        max_concurrent_observed = count
                except Exception:
                    pass
                await asyncio.sleep(0.05)

        async def run_concurrency():
            # Start monitoring in background
            monitor_task = loop.create_task(monitor_ffplay())
            
            # Simultaneously dispatch 3 speak requests with different priorities
            t1 = speak("هذا رد من المساعد الذكي ذو أولوية عالية.", priority="high")
            t2 = speak("تذكير دواء متوسط الأولوية.", priority="medium")
            t3 = speak("تذكير عام منخفض الأولوية.", priority="low")
            
            # Run all concurrently
            await asyncio.gather(t1, t2, t3)
            
            # Stop monitoring
            monitor_stop.set()
            await monitor_task
            
            # Cancel the manager's worker task before the loop terminates!
            if self.manager.worker_task and not self.manager.worker_task.done():
                self.manager.worker_task.cancel()
                try:
                    await self.manager.worker_task
                except Exception:
                    pass
                self.manager.worker_task = None

        loop.run_until_complete(run_concurrency())
        loop.close()

        print(f"\n[Test Result] Observed maximum concurrent ffplay.exe processes: {max_concurrent_observed}")
        
        # Assert that at least one playout process was spawned
        self.assertGreater(max_concurrent_observed, 0, "No ffplay processes were spawned during the test.")
        
        # Assert that never more than 1 process was active simultaneously
        self.assertEqual(max_concurrent_observed, 1, f"Overlapping playback detected! Max concurrent ffplay processes was {max_concurrent_observed} instead of 1.")

if __name__ == "__main__":
    unittest.main()
