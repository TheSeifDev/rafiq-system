import os
import sys
import re
import math
import json
import hashlib
import logging
import datetime
import builtins as _builtins
from pathlib import Path
from typing import Any

from src.config.settings import WAKE_WORDS, END_PHRASES, CONFIRM_WORDS, NEGATIVE_WORDS, UNDO_PHRASES, SNOOZE_WORDS, SKIP_WORDS, CANCEL_WORDS

log = logging.getLogger("rafiq.utils")

# Shape fixes for Windows terminal
try:
    import arabic_reshaper
    from bidi.algorithm import get_display as bidi_get_display
except ImportError:
    arabic_reshaper = None
    bidi_get_display = None

class Color:
    RESET = "\033[0m"
    BLUE = "\033[94m"
    ORANGE = "\033[38;5;214m"
    GREEN = "\033[92m"
    RED = "\033[91m"
    DIM = "\033[2m"
    BOLD = "\033[1m"
  # Color class
ANSI_RE = re.compile(r"(\x1b\[[0-9;]*m)")
ARABIC_RE = re.compile(r"[؀-ۿ]")
CONSOLE_ARABIC_FIX = (
    os.name == "nt"
    and os.environ.get("RAFIQ_CONSOLE_ARABIC_FIX", "1") == "1"
)

def _shape_arabic_segment(segment: str) -> str:
    if not CONSOLE_ARABIC_FIX or not arabic_reshaper or not bidi_get_display or not ARABIC_RE.search(segment):
        return segment
    try:
        return bidi_get_display(arabic_reshaper.reshape(segment))
    except Exception:
        return segment
  # _shape_arabic_segment
def console_text(text: Any) -> str:
    raw = str(text)
    lines = raw.splitlines(keepends=True)
    if not lines:
        lines = [raw]
    shaped_lines = []
    for line in lines:
        parts = ANSI_RE.split(line)
        shaped_lines.append("".join(part if ANSI_RE.fullmatch(part) else _shape_arabic_segment(part) for part in parts))
    return "".join(shaped_lines)
  # console_text
def console_print(*args, sep: str = " ", end: str = "\n", file=None, flush: bool = False):
    stream = file or sys.stdout
    converted = [console_text(arg) if stream in (sys.stdout, sys.stderr) else str(arg) for arg in args]
    _builtins.print(*converted, sep=sep, end=end, file=file, flush=flush)
  # console_print
def console_input(prompt: str = "") -> str:
    return _builtins.input(console_text(prompt))
  # console_input
def tint(text: str, color: str) -> str:
    return f"{color}{text}{Color.RESET}"
  # tint
def detect_lang(text: str) -> str:
    arabic = sum(1 for c in text if "\u0600" <= c <= "\u06FF")
    latin = sum(1 for c in text if c.isascii() and c.isalpha())
    letters = arabic + latin
    if letters == 0:
        return "en"
    return "ar" if arabic / letters >= 0.25 else "en"
  # detect_lang
def _to_24h(hour: int, meridiem: str | None = None) -> int:
    if not meridiem:
        return hour
    meridiem = meridiem.lower().replace(".", "")
    is_pm = meridiem in {"pm", "p", "م", "مساء", "مساءً", "ليلا", "ليلًا"}
    is_am = meridiem in {"am", "a", "ص", "صباحا", "صباحاً"}
    if is_pm and hour < 12:
        return hour + 12
    if is_am and hour == 12:
        return 0
    return hour
  # _to_24h
def parse_time(text: str, base: datetime.datetime | None = None) -> datetime.datetime | None:
    base = base or datetime.datetime.now()
    text_low = text.lower()
    patterns = [
        (r"بعد\s+(\d+)\s+(?:دقيقة|دقايق)", lambda m: base + datetime.timedelta(minutes=int(m.group(1)))),
        (r"كمان\s*(\d+)\s*(?:دقيقة|دقايق)", lambda m: base + datetime.timedelta(minutes=int(m.group(1)))),
        (r"بعد\s+(\d+)\s+(?:ساعة|ساعات)", lambda m: base + datetime.timedelta(hours=int(m.group(1)))),
        (r"بعد\s+(\d+)\s+(?:يوم|أيام|ايام)", lambda m: base + datetime.timedelta(days=int(m.group(1)))),
        (r"بعد\s+نص\s+ساعة", lambda m: base + datetime.timedelta(minutes=30)),
        (r"بعد\s+ربع\s+ساعة", lambda m: base + datetime.timedelta(minutes=15)),
        (r"دقيقتين", lambda m: base + datetime.timedelta(minutes=2)),
        (r"\b(?:in|after)\s+(\d+)\s+(?:minute|minutes|min|mins)\b", lambda m: base + datetime.timedelta(minutes=int(m.group(1)))),
        (r"\b(?:in|after)\s+(\d+)\s+(?:hour|hours|hr|hrs)\b", lambda m: base + datetime.timedelta(hours=int(m.group(1)))),
        (r"\b(?:in|after)\s+(\d+)\s+(?:day|days)\b", lambda m: base + datetime.timedelta(days=int(m.group(1)))),
        (r"\b(?:in|after)\s+(?:half an hour|half hour)\b", lambda m: base + datetime.timedelta(minutes=30)),
        (r"\b(?:in|after)\s+(?:a quarter hour|quarter of an hour)\b", lambda m: base + datetime.timedelta(minutes=15)),
        (
            r"الساعة\s+(\d{1,2})(?::(\d{2}))?\s*(ص|صباحا|صباحاً|م|مساء|مساءً)?",
            lambda m: _fix_time(base, _to_24h(int(m.group(1)), m.group(3)), int(m.group(2) or 0)),
        ),
        (
            r"\b(?:at\s+)?(\d{1,2})(?::(\d{2}))\s*(am|pm|a\.m\.|p\.m\.)?\b",
            lambda m: _fix_time(base, _to_24h(int(m.group(1)), m.group(3)), int(m.group(2) or 0)),
        ),
        (
            r"\bat\s+(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)\b",
            lambda m: _fix_time(base, _to_24h(int(m.group(1)), m.group(2)), 0),
        ),
        (r"\b(\d{1,2}):(\d{2})\b", lambda m: _fix_time(base, int(m.group(1)), int(m.group(2)))),
    ]
    for pat, fn in patterns:
        m = re.search(pat, text_low)
        if m:
            parsed = fn(m)
            if parsed is not None:
                return parsed

    time_words = [
        (r"الصبح|الصباح", 8),
        (r"بالعصر|العصر", 16),
        (r"بالمغرب|المغرب", 18),
        (r"بالليل|الليل", 21),
        (r"قبل\s+النوم", 22),
        (r"\bmorning\b", 8),
        (r"\bafternoon\b", 16),
        (r"\bevening\b|\btonight\b", 21),
        (r"\bbefore bed\b|\bbedtime\b", 22),
    ]
    for pat, h in time_words:
        if re.search(pat, text_low):
            return _fix_time(base, h, 0)
    return None
  # parse_time
def _fix_time(base: datetime.datetime, h: int, m: int) -> datetime.datetime | None:
    if not (0 <= h <= 23 and 0 <= m <= 59):
        return None
    t = base.replace(hour=h, minute=m, second=0, microsecond=0)
    if t <= base:
        t += datetime.timedelta(days=1)
    return t
  # _fix_time
def _read_field(response: Any, field: str) -> Any:
    if isinstance(response, dict):
        return response.get(field)
    return getattr(response, field, None)
  # _read_field
def _normalize_language(value: Any) -> str | None:
    if not value:
        return None
    lang = str(value).strip().lower()
    aliases = {
        "arabic": "ar",
        "english": "en",
        "ara": "ar",
        "eng": "en",
    }
    if "-" in lang or "_" in lang:
        lang = re.split(r"[-_]", lang, maxsplit=1)[0]
    return aliases.get(lang, lang)
  # _normalize_language
def is_wake_word(text: str) -> bool:
    text_clean = text.strip().lower()
    if any(w in text_clean for w in WAKE_WORDS):
        return True
    
    # Handle pronunciation shifts (ج, ك, غ -> ق)
    normalized = text_clean.replace("ج", "ق").replace("ك", "ق").replace("غ", "ق")
    if "رفيق" in normalized or "رافيق" in normalized:
        return True
    return False
  # is_wake_word
def is_end_phrase(text: str) -> bool:
    return any(p in text.strip().lower() for p in END_PHRASES)
  # is_end_phrase
def is_confirmation(text: str) -> bool:
    return any(p in text.strip().lower() for p in CONFIRM_WORDS)
  # is_confirmation
def is_negative(text: str) -> bool:
    return any(p in text.strip().lower() for p in NEGATIVE_WORDS)
  # is_negative
def is_undo_request(text: str) -> bool:
    low = text.strip().lower()
    return any(p in low for p in UNDO_PHRASES)
  # is_undo_request
def is_snooze(text: str) -> bool:
    return any(p in text.strip().lower() for p in SNOOZE_WORDS)

def is_skip(text: str) -> bool:
    return any(p in text.strip().lower() for p in SKIP_WORDS)

def is_cancel(text: str) -> bool:
    return any(p in text.strip().lower() for p in CANCEL_WORDS)

def extract_json_from_text(text: str) -> dict | None:
    try:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
    except json.JSONDecodeError:
        pass
    return None
  # extract_json_from_text
def tokenize(text: str) -> list[str]:
    normalized = text.lower().replace("_", " ").replace("-", " ")
    return re.findall(r"[0-9a-zA-Z\u0600-\u06FF]+", normalized)
  # tokenize

# Embedding helpers
_EMBED_MODEL = None
def get_embed_model():
    global _EMBED_MODEL
    if os.environ.get("RAFIQ_USE_SENTENCE_TRANSFORMERS", "1") != "1":
        return None
    if _EMBED_MODEL is None:
        try:
            from src.services.embedding_service import EmbeddingService
            model_name = "BAAI/bge-m3"
            if os.environ.get("RAFIQ_OFFLINE", "0") == "1":
                model_name = "sentence-transformers/all-MiniLM-L6-v2"
            _EMBED_MODEL = EmbeddingService().get_model(model_name)
            log.info(f"SentenceTransformer ({model_name}) linked from centralized EmbeddingService.")
        except Exception as e:
            log.warning(f"Failed to link SentenceTransformer from EmbeddingService: {e}. Stable embedding will fall back to SHA-256 sparse hashing.")
            _EMBED_MODEL = False
    return _EMBED_MODEL
  # get_embed_model
def stable_embedding(text: str, dim: int = 1024) -> list[float]:
    model = get_embed_model()
    if model:
        try:
            return model.encode(text).tolist()
        except Exception as e:
            log.error(f"Failed to encode embedding with sentence-transformers: {e}")
    
    # Fallback to the original SHA-256 sparse hash embedding
    vec = [0.0] * dim
    tokens = tokenize(text)
    if not tokens:
        return vec
    for tok in tokens:
        digest = hashlib.sha256(tok.encode("utf-8")).digest()
        idx = int.from_bytes(digest[:4], "little") % dim
        sign = 1.0 if digest[4] % 2 else -1.0
        vec[idx] += sign
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]
  # stable_embedding

# Sentiment helpers
def analyze_sentiment_fast(text: str) -> str:
    low = text.lower()
    urgent = ["مش قادر", "الحقني", "طوارئ", "ألم شديد", "وجع جامد", "نزيف", "اختناق", "emergency"]
    distressed = ["خايف", "قلقان", "متوتر", "حزين", "مكتئب", "تعبان نفسياً", "زهقان", "worried", "sad", "anxious"]
    positive = ["مبسوط", "كويس", "الحمد لله", "تمام", "شكرا", "شكراً", "great", "good", "thanks"]
    if any(w in low for w in urgent):
        return "urgent"
    if any(w in low for w in distressed):
        return "distressed"
    if any(w in low for w in positive):
        return "positive"
    return "neutral"
  # analyze_sentiment_fast
def mood_fact_text(sentiment: str, user_text: str) -> str | None:
    if sentiment == "neutral":
        return None
    today = datetime.datetime.now().date().isoformat()
    mood_ar = {
        "urgent": "كان في حالة قلق/احتياج عاجل",
        "distressed": "كان متوتراً أو حزيناً",
        "positive": "كان مزاجه جيداً",
    }.get(sentiment, sentiment)
    excerpt = user_text.strip()[:120]
    return f"{today}: {mood_ar}. آخر عبارة دالة: {excerpt}"
  # mood_fact_text
def arabic_ordinal(n: int) -> str:
    words = {
        1: "الأول",
        2: "الثاني",
        3: "الثالث",
        4: "الرابع",
        5: "الخامس",
        6: "السادس",
        7: "السابع",
        8: "الثامن",
        9: "التاسع",
        10: "العاشر",
    }
    return words.get(n, str(n))
  # arabic_ordinal
