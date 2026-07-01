# test_vad.py — Automated Unit Tests for Phase 4 Silero VAD System

import os
import sys
import time
import unittest
import numpy as np
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import src.services.stt_service as stt
from src.services.stt_service import get_silero_session, _record_silerovad_sync

class TestSileroVAD(unittest.TestCase):

    def setUp(self):
        # Ensure VAD is enabled in config
        self.flag_patch = patch("src.config.settings.ENABLE_SILERO_VAD", True)
        self.flag_patch.start()
        self.addCleanup(self.flag_patch.stop)

    def test_model_load(self):
        # Skip if model file is not on disk
        model_path = os.environ.get("RAFIQ_SILERO_VAD_PATH") or str(stt.BASE_DIR / "data/.rafiq_cache" / "silero_vad.onnx")
        if not os.path.exists(model_path):
            self.skipTest("Silero VAD ONNX model file not found on disk")
        session = get_silero_session()
        self.assertIsNotNone(session)
        self.assertNotEqual(session, False)

    @patch("src.services.stt_service.pyaudio")
    @patch("src.services.stt_service.get_silero_session")
    def test_timeout_on_silence(self, mock_get_session, mock_pyaudio):
        mock_session = MagicMock()
        mock_get_session.return_value = mock_session
        mock_session.run.return_value = [np.array([[0.01]], dtype=np.float32), np.zeros((2, 1, 128), dtype=np.float32)]

        # Mock PyAudio and Stream
        mock_pa = MagicMock()
        mock_pyaudio.PyAudio.return_value = mock_pa
        
        mock_stream = MagicMock()
        mock_pa.open.return_value = mock_stream
        
        # Return 512 samples of silence (zeros)
        silence_frame = b"\x00" * 1024
        mock_stream.read.return_value = silence_frame
        
        # Run recorder with a short timeout of 0.2 seconds
        # Should return None because no speech is detected
        wav = _record_silerovad_sync(timeout=0.2, phrase_limit=2.0)
        self.assertIsNone(wav)
        mock_stream.close.assert_called_once()
        mock_pa.terminate.assert_called_once()

    @patch("src.services.stt_service.pyaudio")
    @patch("src.services.stt_service.get_silero_session")
    def test_speech_detection_and_stop(self, mock_get_session, mock_pyaudio):
        # Mock PyAudio and Stream
        mock_pa = MagicMock()
        mock_pyaudio.PyAudio.return_value = mock_pa
        
        mock_stream = MagicMock()
        mock_pa.open.return_value = mock_stream
        
        frame = b"\x01" * 1024
        mock_stream.read.return_value = frame
        
        # We mock session.run to simulate speech probabilities:
        # First 3 calls: silence (0.01)
        # Next 5 calls: speech (0.95)
        # Next 30 calls: silence (0.01) to exceed the 800ms silence limit (30 * 32ms = 960ms)
        prob_sequence = [0.01]*3 + [0.95]*5 + [0.01]*30
        call_count = 0
        
        mock_session = MagicMock()
        mock_get_session.return_value = mock_session
        
        def mock_run(output_names, input_feed):
            nonlocal call_count
            idx = min(call_count, len(prob_sequence) - 1)
            prob = prob_sequence[idx]
            call_count += 1
            # Return probability and a dummy new state of same shape
            return [np.array([[prob]], dtype=np.float32), input_feed["state"]]
            
        mock_session.run.side_effect = mock_run
        
        # Run recorder
        wav = _record_silerovad_sync(timeout=2.0, phrase_limit=5.0)
        
        # Since speech was detected, it should return a non-empty wav bytes object
        self.assertIsNotNone(wav)
        self.assertTrue(len(wav) > 44)  # WAV header is 44 bytes

    @patch("src.services.stt_service.pyaudio")
    @patch("src.services.stt_service.webrtcvad")
    def test_listen_async_fallback_chain(self, mock_webrtcvad, mock_pyaudio):
        import asyncio
        
        # Mock pyaudio and webrtcvad to be available
        mock_pyaudio.PyAudio.return_value = MagicMock()
        
        # Set feature flag ENABLE_SILERO_VAD to False to force fallback to WebRTCVAD
        with patch("src.config.settings.ENABLE_SILERO_VAD", False), \
             patch("src.services.stt_service._record_webrtcvad_sync", return_value=b"mocked_webrtc_wav") as mock_webrtc:
             
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                wav = loop.run_until_complete(stt.listen_async(timeout=1.0, phrase_limit=2.0))
                self.assertEqual(wav, b"mocked_webrtc_wav")
                mock_webrtc.assert_called_once()
            finally:
                loop.close()

if __name__ == "__main__":
    unittest.TestCase.maxDiff = None
    unittest.main()
