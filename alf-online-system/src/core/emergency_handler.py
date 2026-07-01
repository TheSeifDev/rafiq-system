from __future__ import annotations
import logging
from src.core import privacy

log = logging.getLogger("rafiq.emergency")
privacy.install_phi_log_filter(log)

class EmergencyHandler:
    def __init__(self, db=None):
        self.db = db
        # Fully local, hardcoded responses requiring zero network
        self._responses = {
            "ar": (
                "هذا موقف طارئ. يُرجى الاتصال بالإسعاف فوراً أو التوجه لأقرب قسم طوارئ. "
                "لا تنتظر استشارة الذكاء الاصطناعي، واطلب من شخص قريب البقاء معك."
            ),
            "en": (
                "This is a medical emergency. Call local emergency services immediately "
                "or go to the nearest emergency room. Do not wait for an AI response."
            )
        }

    async def handle_emergency(self, user_text: str, patient_name: str = "") -> str:
        """Process an emergency, return the local response, and log to DB if available."""
        from src.core.medical_guardrails import detect_lang
        lang = detect_lang(user_text)
        response = self._responses.get(lang, self._responses["ar"])
        
        # Redact the trigger text before logging internally
        safe_text = privacy.redact_phi(user_text)
        log.warning(f"EMERGENCY DETECTED. Trigger: {safe_text}")
        
        # Log to operational database if connected
        if self.db:
            try:
                await self.db.log_emergency(
                    trigger_text=safe_text,
                    response_text=response,
                    detection_method="local_router_regex",
                    patient_name=patient_name
                )
            except Exception as e:
                log.error(f"Failed to log emergency event to DB: {e}")
                
        return response
