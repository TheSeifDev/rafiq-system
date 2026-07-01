import logging
import os

log = logging.getLogger("rafiq.emotion")

SPEECHBRAIN_AVAILABLE = False
try:
    import speechbrain
    SPEECHBRAIN_AVAILABLE = True
except ImportError:
    log.warning("speechbrain is not installed. Voice Emotion Detection will use a neutral fallback.")

class EmotionDetector:
    """
    Detects patient emotion (happy, sad, angry, neutral) from audio files.
    Uses speechbrain's pre-trained Wav2Vec2 classifier under the hood.
    Lazily initialized to avoid overhead or import errors.
    """
    def __init__(self):
        self.classifier = None
        self._initialized = False

    def _initialize_model(self):
        if self._initialized:
            return
        
        self._initialized = True
        if not SPEECHBRAIN_AVAILABLE or os.environ.get("RAFIQ_OFFLINE", "0") == "1":
            return

        try:
            from speechbrain.inference.interfaces import foreign_class
            log.info("Loading speechbrain emotion recognition model...")
            self.classifier = foreign_class(
                source="speechbrain/emotion-recognition-wav2vec2-IEMOCAP",
                pymodule_file="custom_interface.py",
                classname="CustomEncoderWav2vec2Classifier"
            )
            log.info("SpeechBrain emotion recognition model loaded successfully.")
        except Exception as e:
            log.error(f"Failed to load SpeechBrain emotion model: {e}. Falling back to neutral mode.")
            self.classifier = None

    def detect(self, audio_path: str) -> dict:
        """
        Classifies the emotion in the given audio file.
        Returns:
            dict: {"emotion": str, "confidence": float}
        """
        self._initialize_model()

        if not self.classifier or not audio_path or not os.path.exists(audio_path):
            # Fallback to neutral
            return {
                "emotion": "neutral",
                "confidence": 1.0
            }

        try:
            out_prob, score, index, label = self.classifier.classify_file(audio_path)
            # The label list might contain the predicted label, e.g. label[0]
            predicted_label = label[0] if isinstance(label, list) and len(label) > 0 else str(label)
            confidence = float(score[0]) if hasattr(score, "__len__") else float(score)
            
            log.info(f"Detected audio emotion: {predicted_label} with confidence {confidence:.2f}")
            return {
                "emotion": predicted_label.lower(),
                "confidence": confidence
            }
        except Exception as e:
            log.error(f"Error during audio emotion detection: {e}")
            return {
                "emotion": "neutral",
                "confidence": 1.0
            }
