import os
import sys
import logging
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
LOG_PATH = BASE_DIR / "logs" / "rafiq.log"

log = logging.getLogger("rafiq.settings")

# Global Config/Logging Helpers
def load_env_file(path: Path):
    if not path.exists():
        return
    try:
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            # Handle inline comments cleanly
            if "#" in line:
                # Check if # is inside quotes
                parts = line.split("=", 1)
                key = parts[0].strip()
                val = parts[1].strip()
                if len(val) >= 2 and ((val[0] == '"' and val[-1] == '"') or (val[0] == "'" and val[-1] == "'")):
                    # Quoted value, keep it intact
                    value = val[1:-1]
                else:
                    # Strip inline comment
                    val = val.split("#", 1)[0].strip()
                    value = val.strip().strip('"').strip("'")
            else:
                key, val = line.split("=", 1)
                key = key.strip()
                value = val.strip().strip('"').strip("'")
            
            if key and key not in os.environ:
                os.environ[key] = value
    except OSError as e:
        log.warning("Could not read env file %s: %s", path, e)
 # load_env_file

def env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError:
        log.warning("Invalid integer for %s=%r; using %s", name, raw, default)
        return default
 # env_int

# Load dotenv
load_env_file(BASE_DIR / ".env")

# API Keys and Models
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "").strip()
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "").strip()
GROQ_CHAT_MODEL = os.environ.get("RAFIQ_GROQ_CHAT_MODEL", "llama-3.3-70b-versatile").strip()
GROQ_STT_MODEL = os.environ.get("RAFIQ_GROQ_STT_MODEL", "whisper-large-v3").strip()

# Path Settings
CHROMA_PATH = BASE_DIR / "data" / "rafiq_db"
DB_PATH = CHROMA_PATH
LEGACY_SQLITE_PATH = BASE_DIR / "rafiq_v3.db"
DRUG_INTERACTIONS_FILE = BASE_DIR / "data" / "drug_interactions.json"
WEB_CACHE_DIR = BASE_DIR / "data/.rafiq_cache"
WHO_RAG_DIR = WEB_CACHE_DIR / "who_rag"

# Clinical triggers and constants
WAKE_WORDS = [
    "رفيق", "رفيج", "رافيج", "رفيك", "رافيك", "رافيق", "رفييق", "رافييق", 
    "رافق", "رفق", "يا رفيق", "يا رافيق", "يا رفيج", "يا رفيك", "ريفيج", 
    "ريفيق", "ريفيك", "rafiq", "rafik", "rafij", "rafq", "refiq"
]
END_PHRASES = ["خلاص", "خلصنا", "شكرا", "شكراً", "انتهينا", "وداعاً", "bye", "goodbye", "done"]
CONFIRM_WORDS = ["اخدت", "أخدت", "خدت", "أخذت", "اخذت", "تمام", "اوك", "ok", "okay", "نعم", "آه", "ايه", "خدته", "اكلته", "احفظ", "ماشي", "حاضر", "شكراً", "شكرا", "علم"]
NEGATIVE_WORDS = ["لا", "لأ", "متسجلش", "ما تحفظش", "الغاء", "إلغاء", "cancel", "no"]
UNDO_PHRASES = ["لا مش قصدي", "مش قصدي", "امسح اللي فات", "امسح آخر", "الغى آخر", "إلغاء آخر", "undo", "delete last"]

SNOOZE_WORDS = ["بعدين", "كمان شوية", "ساعة", "ساعات", "أجل", "اجل", "تأجيل", "snooze", "later", "after"]
SKIP_WORDS = ["تخطي", "تخطى", "طنش", "فوت", "مش هاخده", "لن آخذه", "skip", "miss"]
CANCEL_WORDS = ["إلغاء", "الغاء", "إيقاف", "ايقاف", "cancel", "stop"]

# Assistant State Machine States
STATE_DISABLED = "DISABLED"
STATE_PASSIVE = "PASSIVE"
STATE_LOCKED = "LOCKED"
STATE_LISTENING = "LISTENING"
STATE_PROCESSING = "PROCESSING"
STATE_SPEAKING = "SPEAKING"
STATE_AWAITING_REMINDER_RESPONSE = "AWAITING_REMINDER_RESPONSE"
STATE_ERROR = "ERROR"


MAX_REMINDER_ATTEMPTS = 5
REMINDER_SNOOZE_MIN = 5
REMINDER_CHECK_SECS = 20
LOW_STOCK_THRESHOLD = 5
PROACTIVE_CHECKIN_HOUR = env_int("RAFIQ_CHECKIN_HOUR", 9)
PROACTIVE_CHECKIN_MINUTE = env_int("RAFIQ_CHECKIN_MINUTE", 0)
ENABLE_AUTO_RECOVERY = os.environ.get("RAFIQ_AUTO_RECOVERY", "1") == "1"
ENABLE_STRUCTURED_OUTPUTS = os.environ.get("RAFIQ_STRUCTURED_OUTPUTS", "1") == "1"
ENABLE_ADDREP_RAG = os.environ.get("RAFIQ_ADDREP_RAG", "1") == "1"
ENABLE_CACHING = os.environ.get("RAFIQ_ENABLE_CACHING", "1") == "1"
CACHE_TTL_REFRAME = env_int("RAFIQ_CACHE_TTL_REFRAME", 24 * 60 * 60)
CACHE_TTL_EMBED = env_int("RAFIQ_CACHE_TTL_EMBED", 7 * 24 * 60 * 60)
CACHE_TTL_RETRIEVE = env_int("RAFIQ_CACHE_TTL_RETRIEVE", 12 * 60 * 60)
ENABLE_SILERO_VAD = os.environ.get("RAFIQ_ENABLE_SILERO_VAD", "1") == "1"
SILERO_VAD_THRESHOLD = float(os.environ.get("RAFIQ_SILERO_VAD_THRESHOLD", "0.5"))
SILERO_VAD_SILENCE_LIMIT = float(os.environ.get("RAFIQ_SILERO_VAD_SILENCE_LIMIT", "1.2"))
ENABLE_TTS_BARGE_IN = os.environ.get("RAFIQ_BARGE_IN", "1") == "1"
ENABLE_EARCONS = os.environ.get("RAFIQ_EARCONS", "1") == "1"
ENABLE_WEB_SEARCH = os.environ.get("RAFIQ_ENABLE_WEB_SEARCH", "1") == "1"
ENABLE_GENERAL_WEB_SEARCH = os.environ.get("RAFIQ_ENABLE_GENERAL_WEB_SEARCH", "1") == "1"
API_TIMEOUT_RESTARTS = env_int("RAFIQ_API_TIMEOUT_RESTARTS", 5)
WHO_INDEX_TTL_SECONDS = env_int("RAFIQ_WHO_INDEX_TTL_DAYS", 14) * 24 * 60 * 60
SUPPORTED_TRANSCRIPTION_LANGS = {"ar", "en"}

SYSTEM_PROMPT = """\
أنت المساعد الطبي الذكي "رفيق" (Rafiq) - مساعد طبي ونفسي مباشر وعملي، وتجيب أيضاً على الأسئلة العامة للمستخدم عند الحاجة.
قواعد صارمة:
1. ممنوع قول "أنا نموذج لغوي". ابدأ النصيحة مباشرة.
2. الرد بنفس لغة المستخدم (عربي/إنجليزي).
3. لا تستخدم كلمة cite أو وسم cite أبداً.
4. لديك صلاحية كاملة لقراءة وتعديل قاعدة بيانات المريض.
5. عند ظهور تعارض دوائي أو تحذير مخزون، اذكره بلطف واطلب الرجوع للطبيب/الصيدلي عند اللزوم.
6. أي معلومة طبية حديثة أو مرجعية يجب أن تعتمد فقط على قسم "مصادر الويب الموثوقة" إذا كان متاحاً.
7. ممنوع استخدام نتائج البحث العام أو المعرفة العامة كبديل لمصدر WHO في الطب. إذا لم توجد مصادر WHO، قل إنك لا تستطيع التحقق طبياً من WHO الآن.
8. للأسئلة العامة غير الطبية (مثل أسعار الذهب، العملات، الطقس، الأخبار، إلخ)، استخدم قسم "نتائج البحث والويب المرفقة" للإجابة عنها بشكل مباشر ومحدد بالأرقام والمعلومات الواردة فيها دون رفض ودون تكرار أنك مساعد طبي فقط.
9. لا تقم بكتابة أي تحذيرات طبية عامة أو تذييلات (Disclaimers) أو مصادر في نهاية ردك، حيث أن هذه التحذيرات والمصادر معروضة بالفعل وبشكل ثابت في واجهة المستخدم (GUI). اجعل إجابتك مباشرة وموجزة دون تكرار التحذيرات.
الهوية: BATU | Phantoms Team | كلية تكنولوجيا الصناعة والطاقة
الوقت الحالي: {current_time}
معلومات المريض ذات الصلة:
{patient_facts}
نتائج البحث والويب المرفقة:
{web_context}
"""

MEDICAL_SYSTEM_PROMPT = """\
أنت "رفيق" كمساعد بحث طبي عربي صارم المصدر.
مهمتك: تقديم إجابة قوية ومفيدة بناءً فقط على WHO_ONLY_CONTEXT المرفق.
قواعد غير قابلة للكسر:
1. استخدم نصوص منظمة الصحة العالمية المرفقة فقط لأي معلومة طبية.
2. إذا لم يكفِ السياق للإجابة، قل بوضوح إن مصدر WHO المرفق لا يكفي ولا تخمّن.
3. ممنوع التشخيص الشخصي أو وصف جرعة شخصية أو خطة علاج فردية.
4. يمكن أن تكون حاسماً فقط عندما يقول سياق WHO ذلك بوضوح.
5. اذكر القيود والإنذارات الطبية المهمة.
6. الرد بنفس لغة المستخدم.
7. لا تقم بكتابة أي تحذيرات طبية عامة أو تذييلات (Disclaimers) أو مصادر في نهاية ردك، حيث أن هذه التحذيرات والمصادر معروضة بالفعل وبشكل ثابت في واجهة المستخدم (GUI).
الوقت الحالي: {current_time}
معلومات المريض ذات الصلة:
{patient_facts}
{who_context}
"""

class LazyClientProxy:
    def __init__(self, stt_client):
        self._stt_client = stt_client

    def __getattr__(self, name):
        try:
            return getattr(self._stt_client, name)
        except Exception as e:
            log.debug("LazyClientProxy attribute lookup failed: %s", e)
            raise AttributeError(name) from e

    def __bool__(self):
        return bool(self._stt_client)

client = LazyClientProxy(None) # Will be bound after _stt_client is created


class LazySTTClientProxy:
    def __init__(self):
        self._client = None

    def _init_client(self):
        if self._client is None:
            try:
                from groq import AsyncGroq
                self._client = AsyncGroq(api_key=GROQ_API_KEY)
            except Exception as e:
                log.error("Failed to initialize Lazy STT Client: %s", e)
                raise
        return self._client

    def __getattr__(self, name):
        return getattr(self._init_client(), name)

    def __bool__(self):
        return bool(GROQ_API_KEY)

_stt_client = LazySTTClientProxy()
client._stt_client = _stt_client



import concurrent.futures
# Configurable default thread pool for async execution offloading
_max_workers = env_int("RAFIQ_MAX_WORKERS", 16)
_thread_prefix = os.environ.get("RAFIQ_THREAD_PREFIX", "rafiq_pool").strip()
_pool = concurrent.futures.ThreadPoolExecutor(max_workers=_max_workers, thread_name_prefix=_thread_prefix)
