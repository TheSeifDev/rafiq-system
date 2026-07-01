from __future__ import annotations

import logging
import re
from typing import Any


EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
PHONE_RE = re.compile(r"(?<!\d)(?:\+?\d[\d\s().-]{7,}\d)(?!\d)")
LONG_ID_RE = re.compile(r"(?<!\d)\d{10,}(?!\d)")
API_KEY_RE = re.compile(r"\b(?:gsk|sk|pk)_[A-Za-z0-9_-]{16,}\b")
NAME_HINT_RE = re.compile(
    r"(?<!\w)(?:patient_name|name|اسم المريض|اسمي|انا اسمي|my name is)\s*[:=]?\s*([A-Za-z\u0621-\u064a]{3,20}(?:\s+[A-Za-z\u0621-\u064a]{3,20})?)",
    re.IGNORECASE,
)


def redact_phi(value: Any) -> str:
    """Return a log-safe string with common PHI and secrets redacted."""
    text = str(value)
    text = API_KEY_RE.sub("[REDACTED_API_KEY]", text)
    text = EMAIL_RE.sub("[REDACTED_EMAIL]", text)
    text = PHONE_RE.sub("[REDACTED_PHONE]", text)
    text = LONG_ID_RE.sub("[REDACTED_ID]", text)
    text = NAME_HINT_RE.sub(lambda match: match.group(0).replace(match.group(1), "[REDACTED_NAME]"), text)
    return text


class PHIRedactingFilter(logging.Filter):
    """Redact common PHI and secrets from log records before formatting."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = redact_phi(record.getMessage())
        record.args = ()
        return True


def install_phi_log_filter(logger: logging.Logger | None = None):
    """Attach the PHI redaction filter to existing handlers once."""
    target = logger or logging.getLogger()
    _filter = PHIRedactingFilter()
    # Apply to all handlers on the target logger
    for handler in target.handlers:
        if not any(isinstance(item, PHIRedactingFilter) for item in handler.filters):
            handler.addFilter(_filter)
    # Also apply directly to the logger itself as a fallback
    # (catches records even if handlers are added later)
    if not any(isinstance(item, PHIRedactingFilter) for item in target.filters):
        target.addFilter(_filter)


def enforce_phi_protection():
    """Install PHI redaction on root logger and all known rafiq loggers.

    Call this once at application startup. It is also called automatically
    when the privacy module is first imported.
    """
    # Root logger — catches everything
    install_phi_log_filter(logging.getLogger())

    # All known rafiq loggers used across the codebase
    _rafiq_logger_names = [
        "rafiq",
        "rafiq.utils",
        "rafiq.agents",
        "rafiq.memory",
        "rafiq.web",
        "rafiq.gui_bridge",
    ]
    for name in _rafiq_logger_names:
        install_phi_log_filter(logging.getLogger(name))


# Auto-install PHI protection on import
enforce_phi_protection()


_EXCLUSIONS = {
    "مريض", "مريضة", "طبيب", "طبيبة", "دكتور", "دكتورة", "علاج", "دواء", "ادوية", "أدوية",
    "مرض", "اعراض", "أعراض", "صداع", "سكري", "سكر", "ضغط", "كلسترول", "كوليسترول",
    "ربو", "قولون", "سرطان", "حساسية", "ألم", "الم", "حمى", "سخونة", "كحة", "تعب", "سلامة",
    "أخصائي", "أخصائية", "صيدلي", "صيدلية", "مستشفى", "عيادة",
    "يوم", "يومين", "أيام", "اسبوع", "شهر", "سنة", "سنوات", "مرة", "مرتين", "جرعة", "جرعات",
    "مساعد", "ومساعد", "رفيق", "ورفيق",
    "صباح", "الصباح", "مساء", "المساء", "ظهر", "الظهر", "عصر", "العصر", "مغرب", "المغرب",
    "عشاء", "العشاء", "ليل", "الليل", "ليلة", "الليلة", "امس", "أمس", "الامس", "الأمس",
    "غدا", "غداً"
}


def is_excluded(word: str) -> bool:
    w = word.strip().lower()
    if w in _EXCLUSIONS:
        return True
    # Strip Al- prefix
    if w.startswith("ال") and len(w) > 3:
        stem = w[2:]
        if stem in _EXCLUSIONS:
            return True
    return False


_LOCATION_MAP = {
    "الرياض": "الدمام",
    "الدمام": "الرياض",
    "جدة": "الخبر",
    "الخبر": "جدة",
    "القاهرة": "طنطا",
    "طنطا": "القاهرة",
    "الاسكندرية": "المنصورة",
    "المنصورة": "الاسكندرية",
    "الإسكندرية": "المنصورة",
    "دبي": "الشارقة",
    "الشارقة": "دبي",
    "بيروت": "طرابلس",
    "طرابلس": "بيروت",
    "عمان": "العقبة",
    "العقبة": "عمان",
    "بغداد": "البصرة",
    "البصرة": "بغداد",
    "مصر": "الأردن",
    "الأردن": "مصر",
    "السعودية": "الكويت",
    "الكويت": "السعودية",
}

AGE_RE = re.compile(r"\b(\d+)\s*(سنة|سنين|سنوات|عام|أعوام|year|years|yo)\b", re.IGNORECASE)

CONTEXT_NAME_RE = re.compile(
    r"(?<!\w)(?:يا|اهلاً يا|أهلاً يا|مرحباً يا|مرحبا يا|دكتور|دكتورة|طبيب|طبيبة)\s+([A-Za-z\u0621-\u064a]{3,20}(?:\s+[A-Za-z\u0621-\u064a]{3,20})?)(?!\w)",
    re.IGNORECASE
)


import threading
import time
from collections import OrderedDict

class Pseudonymizer:
    def __init__(self, max_sessions: int = 100, session_ttl: float = 3600.0):
        self._sessions = {}
        self._timestamps = {}
        self._max_sessions = max_sessions
        self._session_ttl = session_ttl
        self._lock = threading.RLock()
        
        self.fake_locations = [
            "مكة", "المدينة", "الطائف", "أبها", "تبوك", "حائل", "جيزان", "نجران",
            "اليمن", "السودان", "تونس", "الجزائر", "المغرب", "سوريا", "لبنان", "فلسطين",
            "ليبيا", "مسقط", "الدوحة", "المنامة", "صنعاء"
        ]
        self.fake_male_names = [
            "يوسف علي", "كريم أحمد", "طارق مصطفى", "سمير عبد الله", "عادل محمود",
            "خالد عمر", "هاني شاكر", "عمرو دياب", "حازم إمام", "زياد طارق"
        ]
        self.fake_female_names = [
            "سارة محمد", "أميرة عادل", "منى أحمد", "رانية يوسف", "دينا علي",
            "ليلى خالد", "ندى محمود", "فاطمة حسن", "زينب سليمان", "مريم عمر"
        ]

    def _clean_expired_sessions(self, now: float):
        expired = [
            k for k, ts in self._timestamps.items()
            if now - ts > self._session_ttl
        ]
        for key in expired:
            self._sessions.pop(key, None)
            self._timestamps.pop(key, None)

    def _get_session(self, session_id: str):
        now = time.time()
        self._clean_expired_sessions(now)
        
        if session_id not in self._sessions:
            if len(self._sessions) >= self._max_sessions:
                # Evict oldest session (LRU)
                oldest = min(self._timestamps, key=self._timestamps.get)
                self._sessions.pop(oldest, None)
                self._timestamps.pop(oldest, None)
                
            self._sessions[session_id] = {
                "name_map": {},
                "reverse_name_map": {},
                "email_map": {},
                "reverse_email_map": {},
                "phone_map": {},
                "reverse_phone_map": {},
                "dyn_loc_map": {},
                "reverse_dyn_loc_map": {},
                "reverse_static_locations": {},
                "reverse_ages": {},
                "fake_loc_index": 0,
                "fake_male_index": 0,
                "fake_female_index": 0
            }
        
        self._timestamps[session_id] = now
        return self._sessions[session_id]

    def clear(self, session_id: str | None = None):
        with self._lock:
            if session_id is None:
                self._sessions.clear()
                self._timestamps.clear()
            else:
                self._sessions.pop(session_id, None)
                self._timestamps.pop(session_id, None)

    def _detect_gender(self, name: str, context: str = "") -> str:
        context_low = context.lower()
        if any(w in context_low for w in ["المريضة", "معاكي", "اختي", "زوجتي", "بنتي"]):
            return "female"
        if any(w in context_low for w in ["المريض", "معاك", "اخي", "زوجي", "ابني"]):
            return "male"
            
        words = name.strip().split()
        if not words:
            return "male"
        first_word = words[0]
        
        normalized = first_word.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
        
        female_names = {
            "ساره", "فاطمه", "اميره", "منى", "ندى", "ليلى", "زينب", "مريم", "رانيا", "رانية",
            "دينا", "ياسمين", "نور", "شيماء", "اسماء", "عبير", "امل", "امال", "هالة", "هاله",
            "حنان", "سهام", "مها", "سحر", "رنا", "سلمى", "هدى", "رحمة", "رحمه", "اية", "آية",
            "منى", "سلوى", "نجلاء", "ريهام", "هبة", "هبه", "دعاء", "صفاء", "ولاء", "سوزان"
        }
        if normalized in female_names:
            return "female"
            
        if first_word.endswith("ة") or first_word.endswith("ه"):
            male_exceptions = {"حمزة", "حمزه", "طلحة", "طلحه", "عبيدة", "عبيده", "حذيفة", "حذيفه", "اسامة", "أسامة", "اسامه", "أسامه", "عقبة", "عقبه", "قتادة", "قتاده", "سلامة", "سلامه"}
            if normalized not in male_exceptions:
                return "female"
                
        return "male"

    def _get_next_fake_name(self, sess: dict, gender: str) -> str:
        if gender == "female":
            name = self.fake_female_names[sess["fake_female_index"] % len(self.fake_female_names)]
            sess["fake_female_index"] += 1
        else:
            name = self.fake_male_names[sess["fake_male_index"] % len(self.fake_male_names)]
            sess["fake_male_index"] += 1
        return name

    def register_name(self, real_name: str, session_id: str | None = None, context: str = "") -> str | None:
        real_name = real_name.strip()
        sess_id = session_id
        if not sess_id:
            try:
                from src.utils.observability import session_id_var
                ctx_val = session_id_var.get()
                if ctx_val and ctx_val != "-":
                    sess_id = ctx_val
            except Exception:
                pass
        if not sess_id:
            import uuid
            sess_id = f"anon_{uuid.uuid4().hex[:12]}"
        sess = self._get_session(sess_id)
        if not real_name or real_name in sess["name_map"]:
            return sess["name_map"].get(real_name)
            
        words = real_name.split()
        if any(is_excluded(w) for w in words):
            return None
            
        gender = self._detect_gender(real_name, context)
        fake_name = self._get_next_fake_name(sess, gender)
        
        real_parts = [p for p in real_name.split() if len(p) > 2]
        fake_parts = [p for p in fake_name.split() if len(p) > 2]
        
        if len(real_parts) == 1 and len(fake_parts) >= 1:
            fake_name_to_use = fake_parts[0]
        else:
            fake_name_to_use = fake_name

        sess["name_map"][real_name] = fake_name_to_use
        sess["reverse_name_map"][fake_name_to_use] = real_name
        
        if len(real_parts) >= 1 and len(fake_parts) >= 1:
            r_first = real_parts[0]
            f_first = fake_parts[0]
            if r_first not in sess["name_map"] and not is_excluded(r_first):
                sess["name_map"][r_first] = f_first
                sess["reverse_name_map"][f_first] = r_first
                
        if len(real_parts) >= 2 and len(fake_parts) >= 2:
            r_last = real_parts[-1]
            f_last = fake_parts[-1]
            if r_last not in sess["name_map"] and not is_excluded(r_last):
                sess["name_map"][r_last] = f_last
                sess["reverse_name_map"][f_last] = r_last
                
        return fake_name_to_use

    @property
    def _dyn_loc_map(self) -> dict:
        """DEPRECATED: Use session-scoped access via deidentify/reidentify instead.
        Returns an empty dict to prevent accidental cross-session data exposure."""
        import warnings
        warnings.warn(
            "_dyn_loc_map accesses the legacy default_session which is removed for privacy. "
            "Use deidentify_text(text, session_id=...) instead.",
            DeprecationWarning, stacklevel=2
        )
        return {}

    @property
    def _reverse_dyn_loc_map(self) -> dict:
        """DEPRECATED: Use session-scoped access via deidentify/reidentify instead."""
        import warnings
        warnings.warn(
            "_reverse_dyn_loc_map accesses the legacy default_session which is removed for privacy. "
            "Use reidentify_text(text, session_id=...) instead.",
            DeprecationWarning, stacklevel=2
        )
        return {}

    @property
    def _name_map(self) -> dict:
        """DEPRECATED: Use session-scoped access via deidentify/reidentify instead."""
        import warnings
        warnings.warn(
            "_name_map accesses the legacy default_session which is removed for privacy. "
            "Use deidentify_text(text, session_id=...) instead.",
            DeprecationWarning, stacklevel=2
        )
        return {}

    @property
    def _reverse_name_map(self) -> dict:
        """DEPRECATED: Use session-scoped access via deidentify/reidentify instead."""
        import warnings
        warnings.warn(
            "_reverse_name_map accesses the legacy default_session which is removed for privacy. "
            "Use reidentify_text(text, session_id=...) instead.",
            DeprecationWarning, stacklevel=2
        )
        return {}

    def deidentify(self, text: str, session_id: str | None = None) -> str:
        if not text:
            return text
        
        sess_id = session_id
        if not sess_id:
            try:
                from src.utils.observability import session_id_var
                ctx_val = session_id_var.get()
                if ctx_val and ctx_val != "-":
                    sess_id = ctx_val
            except Exception:
                pass
        if not sess_id:
            import uuid
            sess_id = f"anon_{uuid.uuid4().hex[:12]}"
        with self._lock:
            sess = self._get_session(sess_id)
            
            # 1. Detect name declarations dynamically
            for match in NAME_HINT_RE.finditer(text):
                possible_name = match.group(1).strip()
                if len(possible_name) >= 3:
                    self.register_name(possible_name, session_id=sess_id, context=text)
                    
            # 2. Detect contextual names dynamically
            for match in CONTEXT_NAME_RE.finditer(text):
                context_name = match.group(1).strip()
                if len(context_name) >= 3:
                    self.register_name(context_name, session_id=session_id, context=text)
                    
            # 3. De-identify emails
            for match in EMAIL_RE.finditer(text):
                email = match.group(0)
                if email not in sess["email_map"]:
                    fake_email = f"patient_email_{len(sess['email_map']) + 1}@rafiq.local"
                    sess["email_map"][email] = fake_email
                    sess["reverse_email_map"][fake_email] = email
                text = text.replace(email, sess["email_map"][email])
                
            # 4. De-identify phone numbers
            for match in PHONE_RE.finditer(text):
                phone = match.group(0)
                if phone not in sess["phone_map"]:
                    fake_phone = f"+96650000000{len(sess['phone_map']) + 1}"
                    sess["phone_map"][phone] = fake_phone
                    sess["reverse_phone_map"][fake_phone] = phone
                text = text.replace(phone, sess["phone_map"][phone])

            # 4.5. Dynamic location detection
            loc_triggers = r"(?<!\w)(?:في|من|إلى|الى|بـ|سكن|أعيش\s+في|أسكن\s+في|عيش\s+في|سافر\s+إلى|سافر\s+الى)\s+([A-Za-z\u0621-\u064a]{3,20})(?!\w)"
            for match in re.finditer(loc_triggers, text):
                loc_candidate = match.group(1).strip()
                if (
                    len(loc_candidate) >= 3 
                    and not is_excluded(loc_candidate) 
                    and loc_candidate not in _LOCATION_MAP
                    and loc_candidate not in sess["name_map"]
                ):
                    if loc_candidate not in sess["dyn_loc_map"]:
                        fake_loc = self.fake_locations[sess["fake_loc_index"] % len(self.fake_locations)]
                        sess["fake_loc_index"] += 1
                        if fake_loc == loc_candidate:
                            fake_loc = self.fake_locations[sess["fake_loc_index"] % len(self.fake_locations)]
                            sess["fake_loc_index"] += 1
                        
                        sess["dyn_loc_map"][loc_candidate] = fake_loc
                        sess["reverse_dyn_loc_map"][fake_loc] = loc_candidate

            # 5. Involutive Static Location mapping (single pass swap)
            loc_keys_sorted = sorted(_LOCATION_MAP.keys(), key=len, reverse=True)
            def loc_swap(match):
                loc = match.group(1)
                fake_loc = _LOCATION_MAP.get(loc, loc)
                if fake_loc != loc:
                    sess["reverse_static_locations"][fake_loc] = loc
                    if fake_loc.lower() != fake_loc:
                        sess["reverse_static_locations"][fake_loc.lower()] = loc
                return fake_loc

            loc_pattern = re.compile(
                rf"(?<!\w)({'|'.join(re.escape(k) for k in loc_keys_sorted)})(?!\w)",
                re.IGNORECASE
            )
            text = loc_pattern.sub(loc_swap, text)

            # 5.5. Swap dynamic locations
            if sess["dyn_loc_map"]:
                sorted_dyn_locs = sorted(sess["dyn_loc_map"].keys(), key=len, reverse=True)
                def dyn_loc_swap(match):
                    loc = match.group(1)
                    for k in sorted_dyn_locs:
                        if k.lower() == loc.lower():
                            return sess["dyn_loc_map"][k]
                    return loc

                dyn_loc_pattern = re.compile(
                    rf"(?<!\w)({'|'.join(re.escape(k) for k in sorted_dyn_locs)})(?!\w)",
                    re.IGNORECASE
                )
                text = dyn_loc_pattern.sub(dyn_loc_swap, text)

            # 6. Involutive Age shifting
            def age_swap(match):
                age_str = match.group(1)
                suffix = match.group(2)
                try:
                    age_num = int(age_str)
                    if age_num >= 2:
                        fake_num = age_num + 1 if age_num % 2 == 0 else age_num - 1
                        real_val = f"{age_str} {suffix}"
                        fake_val = f"{fake_num} {suffix}"
                        sess["reverse_ages"][fake_val] = real_val
                        sess["reverse_ages"][f"{fake_num}{suffix}"] = real_val
                        sess["reverse_ages"][f"{fake_num} {suffix.lower()}"] = real_val
                        return fake_val
                except ValueError:
                    pass
                return match.group(0)
                
            text = AGE_RE.sub(age_swap, text)
                
            # 7. De-identify registered names (single pass swap)
            if sess["name_map"]:
                sorted_real_names = sorted(sess["name_map"].keys(), key=len, reverse=True)
                def name_swap(match):
                    name = match.group(1)
                    for k in sorted_real_names:
                        if k.lower() == name.lower():
                            return sess["name_map"][k]
                    return name

                name_pattern = re.compile(
                    rf"(?<!\w)({'|'.join(re.escape(k) for k in sorted_real_names)})(?!\w)",
                    re.IGNORECASE
                )
                text = name_pattern.sub(name_swap, text)
                
            return text

    def reidentify(self, text: str, session_id: str | None = None) -> str:
        if not text:
            return text
        
        sess_id = session_id
        if not sess_id:
            try:
                from src.utils.observability import session_id_var
                ctx_val = session_id_var.get()
                if ctx_val and ctx_val != "-":
                    sess_id = ctx_val
            except Exception:
                pass
        if not sess_id:
            import uuid
            sess_id = f"anon_{uuid.uuid4().hex[:12]}"
        with self._lock:
            sess = self._get_session(sess_id)
            
            # 1. Re-identify emails
            for fake, real in sess["reverse_email_map"].items():
                text = text.replace(fake, real)
                
            # 2. Re-identify phone numbers
            for fake, real in sess["reverse_phone_map"].items():
                text = text.replace(fake, real)

            # 3. Re-identify static locations that were swapped in deidentify
            if sess["reverse_static_locations"]:
                sorted_fake_locs = sorted(sess["reverse_static_locations"].keys(), key=len, reverse=True)
                def loc_unswap(match):
                    loc = match.group(1)
                    for k in sorted_fake_locs:
                        if k.lower() == loc.lower():
                            return sess["reverse_static_locations"][k]
                    return loc

                loc_pattern = re.compile(
                    rf"(?<!\w)({'|'.join(re.escape(k) for k in sorted_fake_locs)})(?!\w)",
                    re.IGNORECASE
                )
                text = loc_pattern.sub(loc_unswap, text)

            # 3.5. Re-identify dynamic locations
            if sess["reverse_dyn_loc_map"]:
                sorted_fake_locs = sorted(sess["reverse_dyn_loc_map"].keys(), key=len, reverse=True)
                def dyn_loc_unswap(match):
                    loc = match.group(1)
                    for k in sorted_fake_locs:
                        if k.lower() == loc.lower():
                            return sess["reverse_dyn_loc_map"][k]
                    return loc

                dyn_loc_pattern = re.compile(
                    rf"(?<!\w)({'|'.join(re.escape(k) for k in sorted_fake_locs)})(?!\w)",
                    re.IGNORECASE
                )
                text = dyn_loc_pattern.sub(dyn_loc_unswap, text)

            # 4. Re-identify specific ages that were swapped in deidentify
            if sess["reverse_ages"]:
                sorted_fake_ages = sorted(sess["reverse_ages"].keys(), key=len, reverse=True)
                def age_unswap(match):
                    val = match.group(0)
                    for k in sorted_fake_ages:
                        if k.lower() == val.lower():
                            return sess["reverse_ages"][k]
                    return val
                age_pattern = re.compile(
                    rf"\b({'|'.join(re.escape(k) for k in sorted_fake_ages)})\b",
                    re.IGNORECASE
                )
                text = age_pattern.sub(age_unswap, text)
                
            # 5. Re-identify names (single pass swap)
            if sess["reverse_name_map"]:
                sorted_fake_names = sorted(sess["reverse_name_map"].keys(), key=len, reverse=True)
                def name_swap(match):
                    name = match.group(1)
                    for k in sorted_fake_names:
                        if k.lower() == name.lower():
                            return sess["reverse_name_map"][k]
                    return name

                name_pattern = re.compile(
                    rf"(?<!\w)({'|'.join(re.escape(k) for k in sorted_fake_names)})(?!\w)",
                    re.IGNORECASE
                )
                text = name_pattern.sub(name_swap, text)
                
            return text

_pseudonymizer = Pseudonymizer()

def get_pseudonymizer() -> Pseudonymizer:
    return _pseudonymizer

def deidentify_text(text: str, session_id: str | None = None) -> str:
    import os
    if os.environ.get("RAFIQ_DISABLE_PRIVACY", "0") == "1":
        return text
    sess_id = session_id
    if not sess_id:
        try:
            from src.utils.observability import session_id_var
            ctx_val = session_id_var.get()
            if ctx_val and ctx_val != "-":
                sess_id = ctx_val
        except Exception:
            pass
    sess_id = sess_id or None
    if not sess_id:
        try:
            from src.utils.observability import session_id_var
            ctx_val = session_id_var.get()
            if ctx_val and ctx_val != "-":
                sess_id = ctx_val
        except Exception:
            pass
    if not sess_id:
        import uuid
        sess_id = f"anon_{uuid.uuid4().hex[:12]}"
    return _pseudonymizer.deidentify(text, session_id=sess_id)

def reidentify_text(text: str, session_id: str | None = None) -> str:
    import os
    if os.environ.get("RAFIQ_DISABLE_PRIVACY", "0") == "1":
        return text
    sess_id = session_id
    if not sess_id:
        try:
            from src.utils.observability import session_id_var
            ctx_val = session_id_var.get()
            if ctx_val and ctx_val != "-":
                sess_id = ctx_val
        except Exception:
            pass
    sess_id = sess_id or None
    if not sess_id:
        try:
            from src.utils.observability import session_id_var
            ctx_val = session_id_var.get()
            if ctx_val and ctx_val != "-":
                sess_id = ctx_val
        except Exception:
            pass
    if not sess_id:
        import uuid
        sess_id = f"anon_{uuid.uuid4().hex[:12]}"
    return _pseudonymizer.reidentify(text, session_id=sess_id)
