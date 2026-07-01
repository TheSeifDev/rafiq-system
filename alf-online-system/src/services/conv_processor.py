import os
import sys
import re
import time
import logging
import asyncio
import json
import datetime
import contextlib
from pathlib import Path
from typing import Any

from src.config.settings import (
    BASE_DIR, LOG_PATH, GROQ_CHAT_MODEL,
    ENABLE_WEB_SEARCH, ENABLE_GENERAL_WEB_SEARCH,
    WAKE_WORDS, API_TIMEOUT_RESTARTS, WHO_INDEX_TTL_SECONDS,
    SYSTEM_PROMPT, MEDICAL_SYSTEM_PROMPT, _pool,
    WEB_CACHE_DIR, WHO_RAG_DIR, ENABLE_AUTO_RECOVERY
)
from src.utils.helpers import (
    log, analyze_sentiment_fast, mood_fact_text,
    extract_json_from_text, is_undo_request,
    is_confirmation, is_negative, parse_time,
    tint, Color, arabic_ordinal, is_snooze, is_skip, is_cancel
)
from src.database.db_operational import RafiqDB
from src.services.scheduler_service import ReminderScheduler, TodayMedsDisplay, ProactiveCheckin
from src.services.tts_service import speak, play_earcon, _thinking_hum
from src.services.stt_service import LAST_VOICE_EMOTION
from src.services.rxnav_interactions import INTERACTION_CHECKER

from src.core import medical_guardrails
from src.core import medical_router
from src.core import privacy
from src.services import rxnav_interactions
from src.services import trusted_web
from src.services import who_rag

_api_timeout_streak = 0
_skip_gemini_global = False

def restart_process(reason: str):
    log.critical(f"Auto recovery restart: {reason}")
    print(tint(f"\nنظام التعافي الذاتي: إعادة تشغيل رفيق بسبب {reason}", Color.RED))
    
    _recovery_env = os.environ.get("RAFIQ_RECOVERY_ATTEMPTS", "")
    _recovery_attempts: list[float] = []
    if _recovery_env:
        try:
            _recovery_attempts = [float(t) for t in _recovery_env.split(",") if t.strip()]
        except ValueError:
            pass
            
    now = time.time()
    _RECOVERY_WINDOW = 60.0
    _recovery_attempts = [t for t in _recovery_attempts if now - t <= _RECOVERY_WINDOW]
    _recovery_attempts.append(now)
    
    os.environ["RAFIQ_RECOVERY_ATTEMPTS"] = ",".join(map(str, _recovery_attempts))
    
    if len(_recovery_attempts) >= 3:
        log.critical("Auto recovery disabled: 3 restarts within 60.0 seconds. Fix the root cause.")
        print(tint("\nتوقف التعافي الذاتي: 3 أعطال متتالية في أقل من دقيقة. أصلح المشكلة أولاً.", Color.RED))
        sys.exit(1)
        
    sys.exit(100)

async def llm(messages: list[dict[str, str]], temp: float = 0.7, max_tok: int = 2048, session_id: str | None = None):
    global _api_timeout_streak
    
    from src.utils.observability import session_id_var
    import uuid
    sess_id = session_id or session_id_var.get()
    if not sess_id or sess_id == "-":
        # Generate a unique anonymous session per call to prevent PII cross-contamination
        sess_id = f"anon_{uuid.uuid4().hex[:12]}"
    
    deidentified_messages = []
    for msg in messages:
        deidentified_messages.append({
            "role": msg["role"],
            "content": privacy.deidentify_text(msg["content"], session_id=sess_id)
        })

    for attempt in range(3):
        stop_hum = asyncio.Event()
        hum_task = asyncio.create_task(_thinking_hum(stop_hum))
        try:
            from src.services.llm_client import GLOBAL_LLM_CLIENT
            log.info(f"LLM Call (Attempt {attempt+1}/3) routing to unified LLMClient...")
            
            raw_response = await asyncio.wait_for(
                GLOBAL_LLM_CLIENT.generate(deidentified_messages, temp=temp, max_tok=max_tok),
                timeout=30.0
            )
            _api_timeout_streak = 0
            stop_hum.set()
            return privacy.reidentify_text(raw_response, session_id=sess_id) if raw_response else raw_response
            
        except asyncio.TimeoutError:
            _api_timeout_streak += 1
            print(tint(f"مهلة اتصال ({attempt + 1}/3)...", Color.ORANGE))
            log.warning(f"LLM timeout attempt {attempt + 1}")
            if ENABLE_AUTO_RECOVERY and _api_timeout_streak >= API_TIMEOUT_RESTARTS:
                restart_process("تكرار Timeout في API")
        except Exception as e:
            log.error(f"LLM attempt {attempt + 1}: {e}")
            if attempt == 2:
                print(tint(f"فشل الاتصال: {e}", Color.RED))
        finally:
            stop_hum.set()
            hum_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await hum_task
        await asyncio.sleep(1.0)
    return None

async def llm_stream(messages: list[dict[str, str]], temp: float = 0.7, max_tok: int = 2048, session_id: str | None = None):
    global _api_timeout_streak
    
    from src.utils.observability import session_id_var
    import uuid
    sess_id = session_id or session_id_var.get()
    if not sess_id or sess_id == "-":
        # Generate a unique anonymous session per call to prevent PII cross-contamination
        sess_id = f"anon_{uuid.uuid4().hex[:12]}"
    
    deidentified_messages = []
    for msg in messages:
        deidentified_messages.append({
            "role": msg["role"],
            "content": privacy.deidentify_text(msg["content"], session_id=sess_id)
        })

    for attempt in range(3):
        stop_hum = asyncio.Event()
        hum_task = asyncio.create_task(_thinking_hum(stop_hum))
        try:
            from src.services.llm_client import GLOBAL_LLM_CLIENT
            log.info(f"LLM Stream Call (Attempt {attempt+1}/3) routing to unified LLMClient...")
            
            stream = GLOBAL_LLM_CLIENT.generate_stream(deidentified_messages, temp=temp, max_tok=max_tok)
            stop_hum.set()
            
            try:
                async for token in stream:
                    if token:
                        yield privacy.reidentify_text(token, session_id=sess_id)
            finally:
                if hasattr(stream, "aclose"):
                    await stream.aclose()
                    
            _api_timeout_streak = 0
            return
            
        except asyncio.TimeoutError:
            _api_timeout_streak += 1
            print(tint(f"مهلة اتصال ({attempt + 1}/3)...", Color.ORANGE))
            log.warning(f"LLM Stream timeout attempt {attempt + 1}")
            if ENABLE_AUTO_RECOVERY and _api_timeout_streak >= API_TIMEOUT_RESTARTS:
                restart_process("تكرار Timeout في API")
        except Exception as e:
            log.error(f"LLM Stream attempt {attempt + 1}: {e}")
            if attempt == 2:
                print(tint(f"فشل الاتصال: {e}", Color.RED))
        finally:
            stop_hum.set()
            hum_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await hum_task
        await asyncio.sleep(1.0)

async def extract_memory_bg(user_text: str, ai_text: str, db: RafiqDB):
    prompt = f"""من هذه المحادثة، استخرج المعلومات المهمة عن المريض فقط.
أجب بـ JSON فقط. يمنع منعاً باتاً كتابة أي نص تمهيدي أو تعليق أو تغليف المخرجات بوسوم markdown مثل ```json أو ```.
الهيكل المطلوب:
{{"facts":[{{"category":"personal|medical|preference|mood","key":"...","value":"..."}}]}}
إذا لم توجد معلومة أجب بـ: {{"facts":[]}}
المريض: {user_text}
رفيق: {ai_text}"""
    try:
        resp = await llm([{"role": "user", "content": prompt}], temp=0.1, max_tok=2048)
        if not resp:
            return
        from src.core.schemas import parse_memory_facts
        data = parse_memory_facts(resp)
        if not data:
            return
        for fact in data.get("facts", []):
            key = str(fact.get("key", "")).strip()
            value = str(fact.get("value", "")).strip()
            if key and value and value not in ["...", "", "None", "null"]:
                await db.upsert_fact(fact.get("category", "general"), key, value)
    except Exception as e:
        log.error(f"extract_memory_bg: {e}")
 # extract_memory_bg
async def extract_clinical_memory_bg(user_text: str, ai_text: str, clinical_mem, db: RafiqDB, patient_id: str):
    import datetime
    now = datetime.datetime.now()
    current_time_str = now.strftime("%Y-%m-%d %I:%M %p")
    arabic_days = {
        "Monday": "الإثنين", "Tuesday": "الثلاثاء", "Wednesday": "الأربعاء",
        "Thursday": "الخميس", "Friday": "الجمعة", "Saturday": "السبت", "Sunday": "الأحد"
    }
    day_name = arabic_days.get(now.strftime("%A"), now.strftime("%A"))
    
    prompt = f"""أنت مساعد استخراج ذاكرة طبية لنظام رفيق.
مهمتك هي استخراج معلومات الأعراض والشكاوى الصحية وتاريخ ووقت حدوثها من المحادثة بين المريض ومساعد رفيق الذكي.

التاريخ الحالي للمحادثة: يوم {day_name} الموافق {current_time_str}.

المحادثة الحالية:
المريض: {user_text}
رفيق: {ai_text}

قم بصياغة تقرير طبي مصغر ومحدد جداً يلخص الشكوى وتاريخ ووقت حدوثها باللغة العربية.
إرشادات هامة:
- لا تذكر اسم المريض إطلاقاً في التقرير، بل استخدم دائماً كلمة "المريض" (مثال: "المريض يشتكي من صداع بدأ يوم الخميس 4 يونيو 2026 حوالي الساعة 7:51 مساءً").
- إذا لم تكن المحادثة تحتوي على شكوى جديدة أو عَرَض صحي محدد، أجب بكلمة NONE فقط. خلاف ذلك، اكتب التقرير المصغر مباشرة دون أي مقدمات أو شرح."""

    try:
        resp = await llm([{"role": "user", "content": prompt}], temp=0.1, max_tok=2048)
        if resp and resp.strip() and resp.strip().upper() != "NONE":
            fact = resp.strip()
            log.info("Extracted clinical memory fact (redacted): '%s'", privacy.redact_phi(fact))
            # 1. Save to Mem0 ChromaDB Clinical Memory
            if clinical_mem and clinical_mem.enabled:
                await clinical_mem.remember_patient_info(patient_id, fact)
            # 2. Save to SQLite database (under category "medical_history")
            fact_key = f"symptom_{now.strftime('%Y%m%d_%H%M%S')}"
            await db.upsert_fact("medical_history", fact_key, fact)
    except Exception as e:
        log.error(f"extract_clinical_memory_bg: {e}")
 # extract_clinical_memory_bg
class MedGatherer:
    REQUIRED = ["med_name", "condition", "dose", "time_str", "food_relation", "supply_info"]
    FIELD_NAMES = {
        "med_name": "اسم الدواء",
        "condition": "علاج إيه (المرض)",
        "dose": "الجرعة",
        "time_str": "ميعاد الأخذ",
        "food_relation": "علاقته بالأكل",
        "supply_info": "عدد الحبات/العبوة (أو قول مزمن)",
    }

    def __init__(self, db: RafiqDB):
        self.db = db
        self.gathered: dict[str, str] = {}
        self.complete = False
        self.awaiting_interaction_ack = False
        self.interaction_warnings: list[str] = []

    def _missing(self) -> list[str]:
        return [f for f in self.REQUIRED if not self.gathered.get(f)]

    def _missing_arabic(self) -> str:
        missing = self._missing()
        ar = [self.FIELD_NAMES.get(f, f) for f in missing]
        if len(ar) == 1:
            return ar[0]
        if len(ar) == 2:
            return f"{ar[0]} و{ar[1]}"
        return " و ".join(ar[:-1]) + f" و{ar[-1]}"

    def _build_question(self) -> str:
        return f"ممكن تقولي {self._missing_arabic()}؟" if self._missing() else ""

    def _extract_regex(self, msg: str):
        msg_low = msg.lower().strip()
        if not self.gathered.get("med_name"):
            m = re.search(r"(?:دواء|حبة|دوا|علاج)\s+([^\s،,.]+)", msg)
            if m:
                self.gathered["med_name"] = m.group(1)
            else:
                for med in ["بنادول", "أموكسيل", "كونكور", "ضغط", "سكر", "مسكن", "فيتامين", "اسبرين", "وارفارين", "بروفين"]:
                    if med in msg_low:
                        self.gathered["med_name"] = med
                        break
        if not self.gathered.get("condition"):
            m = re.search(r"(?:لل|علاج|عشان)\s*(ال)?(\w+)", msg)
            if m:
                self.gathered["condition"] = f"ل{m.group(2)}"
        if not self.gathered.get("dose"):
            for pat, fn in [
                (r"(\d+)\s*(?:حبة|كبسولة|قرص|ملي|سم)", lambda m: f"{m.group(1)} {m.group(0).split()[-1]}"),
                (r"(?:حبة|قرص|كبسولة)\s*(?:واحدة)?", lambda m: "1 حبة"),
            ]:
                m = re.search(pat, msg_low)
                if m:
                    self.gathered["dose"] = fn(m)
                    break
        if not self.gathered.get("time_str"):
            for pat, fn in [
                (r"بعد\s+(\d+)\s+دقيقة", lambda m: f"بعد {m.group(1)} دقيقة"),
                (r"كمان\s*(\d+)\s*(?:دقيقة|دقايق)", lambda m: f"بعد {m.group(1)} دقيقة"),
                (r"الصبح|الصباح", lambda m: "الصباح"),
                (r"بالليل|الليل", lambda m: "بالليل"),
                (r"الساعة\s+\d+(?::\d+)?", lambda m: m.group(0)),
            ]:
                m = re.search(pat, msg_low)
                if m:
                    self.gathered["time_str"] = fn(m)
                    break
        if not self.gathered.get("food_relation") or self.gathered.get("food_relation") == "none":
            if re.search(r"قبل\s+(?:الأكل|الاكل)", msg_low):
                self.gathered["food_relation"] = "before"
            elif re.search(r"بعد\s+(?:الأكل|الاكل)", msg_low):
                self.gathered["food_relation"] = "after"
            elif re.search(r"مع\s+(?:الأكل|الاكل)", msg_low):
                self.gathered["food_relation"] = "with"
            elif re.search(r"لا\s+علاقة|ماتفرقش|ملهوش|ملهاش|بدون", msg_low):
                self.gathered["food_relation"] = "none"
        if not self.gathered.get("supply_info"):
            if re.search(r"مزمن|مستمر|دايما|على طول", msg_low):
                self.gathered["supply_info"] = "مزمن"
            else:
                supply_patterns = [
                    r"(?:العلبة|العبوة|فيها|معايا|معاك|المتبقي|فاضل)\s*(\d+)\s*(?:حبة|كبسولة|قرص)",
                    r"(\d+)\s*(?:حبة|كبسولة|قرص)\s*(?:في\s+العلبة|في\s+العبوة|متبقية|فاضلة)",
                ]
                for pat in supply_patterns:
                    m = re.search(pat, msg_low)
                    if m:
                        self.gathered["supply_info"] = f"{m.group(1)} حبة"
                        break
                if not self.gathered.get("supply_info"):
                    matches = re.findall(r"(\d+)\s*(?:حبة|كبسولة|قرص)", msg_low)
                    if matches:
                        self.gathered["supply_info"] = f"{matches[-1]} حبة"

    async def _extract_llm(self, msg: str):
        if not self._missing():
            return
        prompt = f"""استخرج بيانات الدواء من الرسالة التالية.
إذا كانت المعلومة غير موجودة في الرسالة، اتركها فارغة "". إياك أن تكتب "غير محدد".
أجب بـ JSON فقط. يمنع منعاً باتاً كتابة أي نص تمهيدي أو تعليق أو تغليف المخرجات بوسوم markdown مثل ```json أو ```.
الهيكل المطلوب: {{"med_name":"","condition":"","dose":"","time_str":"","food_relation":"none","supply_info":""}}
الرسالة: {msg}"""
        try:
            resp = await llm([{"role": "user", "content": prompt}], temp=0.05, max_tok=2048)
            if resp:
                from src.core.schemas import parse_medication_intent
                data = parse_medication_intent(resp)
                if data:
                    for key in self._missing():
                        val = str(data.get(key, "")).strip()
                        if val and val.lower() not in ["غير محدد", "null", "none"]:
                            self.gathered[key] = val
        except Exception as e:
            log.error(f"med extract llm: {e}")

    async def step(self, user_msg: str) -> str:
        self._extract_regex(user_msg)
        if self._missing():
            await self._extract_llm(user_msg)
        if not self._missing():
            self.complete = True
            return "DONE"
        return self._build_question()

    async def check_interactions(self) -> list[str]:
        existing = await self.db.get_active_medications()
        meds = [m.get("med_name", "") for m in existing]
        new_med = self.gathered.get("med_name", "")

        # Local drug_interactions.json check (fast, offline)
        self.interaction_warnings = INTERACTION_CHECKER.check(new_med, meds)

        # RxNav API fallback for interactions not covered locally
        if meds and new_med and os.environ.get("RAFIQ_OFFLINE", "0") != "1":
            try:
                rxnav_result = await rxnav_interactions.check_drug_interactions(
                    new_med,
                    meds,
                )
                if rxnav_result.found:
                    rxnav_warnings = rxnav_result.warnings_ar()
                    # Merge without duplicating concepts already caught locally
                    existing_lower = {w.lower() for w in self.interaction_warnings}
                    for warning in rxnav_warnings:
                        if not any(part in warning.lower() for part in existing_lower if len(part) > 20):
                            self.interaction_warnings.append(warning)
                if rxnav_result.errors:
                    log.info("RxNav lookup notes: %s", "; ".join(rxnav_result.errors))
            except Exception as e:
                log.warning("RxNav interaction check failed (non-blocking): %s", e)

        return self.interaction_warnings

    async def save(self, patient: str) -> tuple[int, int]:
        supply = self.gathered.get("supply_info", "")
        is_chronic = 1 if "مزمن" in supply else 0
        dose_match = re.search(r"(\d+)", supply)
        total_doses = int(dose_match.group(1)) if dose_match and not is_chronic else 0
        data = {
            "patient_name": patient,
            "med_name": self.gathered.get("med_name", "دواء"),
            "condition": self.gathered.get("condition", ""),
            "dose": self.gathered.get("dose", ""),
            "food_relation": self.gathered.get("food_relation", "none"),
            "time_str": self.gathered.get("time_str", ""),
            "total_doses": total_doses,
            "remaining_doses": total_doses,
            "is_chronic": is_chronic,
            "notes": "",
        }
        mid = await self.db.add_medication(data)
        if mid <= 0:
            return mid, -1
        food_map = {
            "before": "قبل الأكل",
            "before_meal": "قبل الأكل",
            "after": "بعد الأكل",
            "after_meal": "بعد الأكل",
            "with": "مع الأكل",
            "with_meal": "مع الأكل",
            "none": ""
        }
        food_txt = food_map.get(data.get("food_relation", "none"), "")
        # Check if the medication has an interval schedule (e.g. every 8 hours)
        interval = None
        time_str = data.get("time_str", "")
        match = re.search(r"(?:كل|every)\s+(\d+)\s+(?:ساعة|ساعات|hour|hours)", time_str, re.IGNORECASE)
        if match:
            interval = datetime.timedelta(hours=int(match.group(1)))
        elif any(x in time_str for x in ["3 مرات", "ثلاث مرات", "3 times"]):
            interval = datetime.timedelta(hours=8)
        elif any(x in time_str for x in ["مرتين", "2 times", "2 مرة"]):
            interval = datetime.timedelta(hours=12)

        if interval:
            # Start the first reminder X hours from now
            sched = datetime.datetime.now() + interval
        else:
            sched = parse_time(time_str) or datetime.datetime.now() + datetime.timedelta(minutes=5)

        msg = f"يا {patient}، حان موعد دواء {data['med_name']} ({data['condition']}) ({data['dose']}) {food_txt}"
        rid = await self.db.add_reminder(mid, patient, msg, sched)
        return mid, rid
 # MedGatherer

class ReminderGatherer:
    def __init__(self, db: RafiqDB):
        self.db = db
        self.gathered: dict[str, str] = {}
        self.complete = False
        self.awaiting_details_ack = False

    async def step(self, user_msg: str) -> str:
        user_msg_low = user_msg.lower().strip()
        
        # Regex heuristics for time extraction
        if not self.gathered.get("time_str"):
            for pat in [
                r"بعد\s+(\d+)\s+دقيقة",
                r"كمان\s*(\d+)\s*(?:دقيقة|دقايق)",
                r"الساعة\s+\d+(?::\d+)?",
                r"الساعه\s+\d+(?::\d+)?",
                r"يوم\s+[^\s،,]+",
                r"بكرة|غداً|غدا",
                r"النهاردة|اليوم"
            ]:
                m = re.search(pat, user_msg_low)
                if m:
                    self.gathered["time_str"] = m.group(0)
                    break
        
        # Regex for title/subject
        if not self.gathered.get("title"):
            for keyword in ["امتحان", "اختبار", "اجتماع", "لقاء", "سفر", "طيارة", "طبيب", "مستشفى", "مناسبة", "زيارة"]:
                if keyword in user_msg_low:
                    self.gathered["title"] = keyword
                    break

        prompt = f"""استخرج اسم الموعد أو التنبيه ووقت الموعد من الرسالة.
إذا كان الاسم غير محدد بوضوح، خمن اسم مناسب (مثل: موعد، تنبيه، منبه) أو اتركه فارغاً.
وقت الموعد يجب أن يكون باللغة العربية أو الإنجليزية كما ورد.
أجب بـ JSON فقط. يمنع منعاً باتاً كتابة أي نص تمهيدي أو تعليق أو تغليف المخرجات بوسوم markdown مثل ```json أو ```.
الهيكل المطلوب: {{"title":"","time_str":"","details":""}}
الرسالة: {user_msg}"""
        try:
            resp = await llm([{"role": "user", "content": prompt}], temp=0.05, max_tok=1024)
            if resp:
                from src.core.schemas import parse_reminder_intent
                data = parse_reminder_intent(resp)
                if data:
                    for k in ["title", "time_str", "details"]:
                        val = str(data.get(k, "")).strip()
                        if val and val.lower() not in ["null", "none", "غير محدد"]:
                            self.gathered[k] = val
        except Exception as e:
            log.error(f"reminder extract: {e}")

        # Check if we have title and time_str
        if not self.gathered.get("title"):
            self.gathered["title"] = "موعد"
        
        if not self.gathered.get("time_str"):
            return "ممكن تقولي وقت التنبيه أو الموعد ده إمتى؟"

        # Ask for details if missing and not yet acknowledged
        if not self.gathered.get("details") and not self.awaiting_details_ack:
            self.awaiting_details_ack = True
            return "تحب تقول لي أي تفاصيل للموعد ده عشان أفكرك بيها؟"

        # If they answered the details question
        if self.awaiting_details_ack and not self.gathered.get("details"):
            # Check for negative answers like no
            is_neg = False
            for w in ["لا", "لأ", "no", "بدون", "مش عايز", "لا شكرا", "لا شكراً"]:
                if w in user_msg_low:
                    is_neg = True
                    break
            
            if not is_neg:
                self.gathered["details"] = user_msg.strip()
            else:
                self.gathered["details"] = "لا توجد تفاصيل إضافية."
        
        self.complete = True
        return "DONE"

    async def save(self, patient: str) -> tuple[int, int]:
        title = self.gathered.get("title", "موعد عام")
        details = self.gathered.get("details", "لا توجد تفاصيل إضافية.")
        time_str = self.gathered.get("time_str", "")
        
        med_data = {
            "patient_name": patient,
            "med_name": "تذكير عام",
            "condition": title,
            "dose": "تنبيه",
            "food_relation": "none",
            "time_str": time_str,
            "total_doses": 1,
            "remaining_doses": 1,
            "is_chronic": 0,
            "notes": details,
            "active": 1
        }
        
        mid = await self.db.add_medication(med_data)
        sched = parse_time(time_str) or datetime.datetime.now() + datetime.timedelta(minutes=5)
        
        msg = f"يا {patient}، حان موعد: {title}."
        if details and details != "لا توجد تفاصيل إضافية.":
            msg += f" (تفاصيل: {details})"
            
        rid = await self.db.add_reminder(mid, patient, msg, sched)
        return mid, rid

class ConvEngine:
    MED_TRIGGERS = ["دواء", "حبة", "علاج", "موعد", "تذكير", "جرعة", "medication", "pill"]

    def __init__(self, db: RafiqDB, sched: ReminderScheduler):
        self.db = db
        self.sched = sched
        self.gatherer: MedGatherer | None = None
        self.reminder_gatherer: ReminderGatherer | None = None
        self.last_sentiment = "neutral"
        self.who_rag = who_rag.WhoRAG(cache_dir=WEB_CACHE_DIR, index_ttl_seconds=WHO_INDEX_TTL_SECONDS)
        
        # Clinical Memory Engine v4.0 (Background Loaded)
        from src.services.memory_manager import MemoryServiceManager
        chroma_path = os.environ.get("RAFIQ_CHROMA_PATH", "rafiq_chroma_v4")
        self.memory_manager = MemoryServiceManager(groq_api_key=os.environ.get("GROQ_API_KEY", ""), chroma_path=chroma_path)
        self.memory_manager.start_background_loading()
        self.medical_history = []
        
        # Register dose_due event listener (Event Broker pattern)
        if hasattr(self.sched, "on"):
            self.sched.on("dose_due", self._on_dose_due)

    def _on_dose_due(self, reminder: dict[str, Any]):
        log.info(f"[EVENT_RECEIVER] ConvEngine received dose_due event for reminder: {reminder.get('id')}")

    @property
    def clinical_mem(self):
        return self.memory_manager.get_instance()

    async def _web_context(self, user_text: str) -> trusted_web.WebContext:
        if not ENABLE_WEB_SEARCH:
            return trusted_web.WebContext(text="", is_medical=False, found=False, policy="disabled")
        loop = asyncio.get_running_loop()
        try:
            return await loop.run_in_executor(
                _pool,
                trusted_web.build_web_context,
                user_text,
                WEB_CACHE_DIR,
                ENABLE_GENERAL_WEB_SEARCH,
            )
        except Exception as e:
            log.error(f"web context: {e}", exc_info=True)
            is_medical = trusted_web.is_medical_query(user_text)
            return trusted_web.WebContext(text="", is_medical=is_medical, found=False, policy="error")

    async def _sys_prompt(self, user_text: str, web_context: str = "") -> str:
        facts = await self.db.get_relevant_facts_text(user_text)
        prompt = SYSTEM_PROMPT.format(
            current_time=datetime.datetime.now().strftime("%Y-%m-%d %H:%M (%A)"),
            patient_facts=facts,
            web_context=web_context or "لا توجد مصادر ويب مرفقة لهذا الطلب.",
        )
        sentiment = getattr(self, "last_sentiment", "neutral")
        if sentiment in ("distressed", "urgent"):
            prompt += "\nتنبيه نبرة المريض: المريض يبدو متعباً أو قلقاً أو في حالة عاجلة. يرجى التحدث بنبرة متعاطفة جداً ومطمئنة ومهدئة، وتقديم العون والدعم المعنوي والتحلي بالهدوء الشديد والوضوح في إرشاداتك."
        elif sentiment == "positive":
            prompt += "\nتنبيه نبرة المريض: المريض في حالة مزاجية جيدة أو إيجابية. يرجى التحدث بنبرة ودودة ولطيفة ومشجعة."
        return prompt

    async def _who_bundle(self, route: medical_router.RouteDecision) -> who_rag.WHORagBundle:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(_pool, self.who_rag.retrieve, route.search_query)

    async def _medical_sys_prompt(self, user_text: str, bundle: who_rag.WHORagBundle) -> str:
        facts = await self.db.get_relevant_facts_text(user_text)
        return MEDICAL_SYSTEM_PROMPT.format(
            current_time=datetime.datetime.now().strftime("%Y-%m-%d %H:%M (%A)"),
            patient_facts=facts,
            who_context=bundle.context_text(),
        )

    async def _answer_medical(self, user_text: str, route: medical_router.RouteDecision, on_token_callback=None) -> str:
        bundle = await self._who_bundle(route)
        patient_id = await self.db.get_patient_name() or "default_patient"
        doctor_id = "default_doctor"

        # 1. Retrieve enriched medical memory context
        if self.clinical_mem and self.clinical_mem.enabled:
            mem_ctx = await self.clinical_mem.build_enriched_context(
                patient_id=patient_id,
                doctor_id=doctor_id,
                query=user_text
            )
            patient_history = mem_ctx.get("patient_history", "")
            doctor_prefs = mem_ctx.get("doctor_preferences", "")
        else:
            patient_history = ""
            doctor_prefs = ""

        # 2. Run the LangGraph Multi-Agent medical session
        from src.core.medical_agents import run_medical_consultation
        response = await run_medical_consultation(
            query=user_text,
            who_evidence=bundle.context_text(),
            patient_context=patient_history,
            doctor_rules=doctor_prefs,
            sentiment=getattr(self, "last_sentiment", "neutral"),
            chat_history=self.medical_history,
            on_token_callback=on_token_callback,
            session_id=sess_id
        )

        if not response:
            return "عذراً، تعذر توليد الإجابة الطبية الآن رغم توفر مصدر WHO. حاول مرة أخرى."

        # 3. Apply final medical guardrails and finalize formatting
        guarded = medical_guardrails.finalize_medical_answer(response, bundle.sources, user_text)
        if guarded.violations:
            log.warning("medical guardrail blocked response: %s", ", ".join(guarded.violations))
        
        # Append medical conversation turn to history
        self.medical_history.append({"role": "user", "content": user_text})
        self.medical_history.append({"role": "assistant", "content": guarded.text})
        if len(self.medical_history) > 8:
            self.medical_history = self.medical_history[-8:]

        # Spawn clinical memory extraction task to remember symptoms and timestamps
        if guarded.allowed:
            asyncio.create_task(
                extract_clinical_memory_bg(
                    user_text=user_text,
                    ai_text=guarded.text,
                    clinical_mem=self.clinical_mem,
                    db=self.db,
                    patient_id=patient_id
                )
            )

        await self.db.save_msg("user", "[medical question omitted for privacy]")
        await self.db.save_msg("assistant", "[medical answer grounded in WHO sources]")
        return guarded.text

    async def _store_mood(self, user_text: str):
        global LAST_VOICE_EMOTION
        sentiment = analyze_sentiment_fast(user_text)
        
        # Merge voice emotion if it's strong/clinical
        voice_emo = LAST_VOICE_EMOTION.lower()
        if "sad" in voice_emo or "ang" in voice_emo or "distressed" in voice_emo:
            sentiment = "distressed"
        elif "hap" in voice_emo or "joy" in voice_emo or "positive" in voice_emo:
            if sentiment == "neutral":
                sentiment = "positive"
                
        self.last_sentiment = sentiment
        fact = mood_fact_text(sentiment, user_text)
        
        if fact and voice_emo != "neutral" and voice_emo != "neu":
            fact += f" (مؤشر نبرة الصوت: {voice_emo})"
            
        if fact:
            await self.db.upsert_fact("mood", f"mood_{datetime.datetime.now().date().isoformat()}", fact)

    async def _finish_med_save(self) -> str:
        patient = await self.db.get_patient_name() or "المريض"
        gatherer = self.gatherer
        data = gatherer.gathered
        mid, rid = await gatherer.save(patient)
        if mid <= 0 or rid <= 0:
            self.gatherer = None
            return "حصل خطأ أثناء حفظ الدواء أو التذكير. حاول مرة أخرى."
        sched = parse_time(data.get("time_str", ""))
        t_str = sched.strftime("%H:%M") if sched else "قريباً"
        supply = data.get("supply_info", "")
        chronic_msg = "ده دواء مزمن، هفضل أذكرك كل يوم." if "مزمن" in supply else f"معاك {supply}، وهشيل التذكير لو خلصوا."
        warning = ""
        if gatherer.interaction_warnings:
            warning = "\n" + "\n".join(gatherer.interaction_warnings)
        self.gatherer = None
        await play_earcon("chime")
        return f"تم! سجّلت دواء {data.get('med_name')} ({data.get('condition')}) وهحط تذكيرة الساعة {t_str}.\n{chronic_msg}{warning}"

    def _is_medical_continuation(self, user_text: str) -> bool:
        if not hasattr(self, "medical_history") or not self.medical_history:
            return False
        
        normalized = medical_router.normalize_query(user_text)
        
        exit_keywords = ["شكرا", "شكرًا", "تسلم", "مع السلامة", "خلاص", "تمام شكرا", "باي", "سلام", "ألغي", "الغاء", "الغي", "توقف"]
        if any(kw in normalized for kw in exit_keywords):
            return False
            
        general_patterns = [
            r"الساعه", r"الساعة", r"الوقت", r"الطقس", r"الجو", r"مين انت", r"اسمك ايه", r"مين رفيق"
        ]
        if any(re.search(pat, normalized) for pat in general_patterns):
            return False
            
        return True

    async def process(self, user_text: str, on_token_callback=None, session_id: str | None = None) -> str:
        from src.utils.observability import session_id_var
        import uuid
        sess_id = session_id or session_id_var.get()
        if not sess_id or sess_id == "-":
            # Generate a unique anonymous session per invocation to prevent PII cross-contamination
            sess_id = f"anon_{uuid.uuid4().hex[:12]}"
        session_id_var.set(sess_id)
        # Check for absolute emergencies BEFORE any processing
        if medical_router.is_emergency(user_text):
            from src.core.emergency_handler import EmergencyHandler
            patient = await self.db.get_patient_name() or ""
            handler = EmergencyHandler(db=self.db)
            response = await handler.handle_emergency(user_text, patient)
            # Short-circuit all LLM/network logic and return emergency protocol
            if on_token_callback:
                on_token_callback(response)
            return response

        # Check if we are currently verifying wakefulness for an active reminder
        if self.sched.active and self.sched.active.get("awaiting_wakefulness_math") is not None:
            num1, num2, correct_ans = self.sched.active["awaiting_wakefulness_math"]
            user_nums = re.findall(r"\d+", user_text)
            if user_nums and int(user_nums[0]) == correct_ans:
                patient = self.sched.active.get("patient_name", "المريض")
                rid = self.sched.active["id"]
                title = self.sched.active.get("med_name", "الموعد")
                if title == "تذكير عام":
                    title = self.sched.active.get("condition", "الموعد")
                
                result = await self.sched.confirm(rid)
                self.sched.active = None
                return f"ممتاز يا {patient}! إجابتك صحيحة ({correct_ans})، وأنت فايق ومستيقظ تماماً الآن لـ {title}. ربنا يوفقك!"
            else:
                import random
                new_num1 = random.randint(5, 15)
                new_num2 = random.randint(5, 15)
                self.sched.active["awaiting_wakefulness_math"] = (new_num1, new_num2, new_num1 + new_num2)
                await play_earcon("bloop")
                return f"إجابة غير صحيحة! يبدو أنك لسه نايم ومش فايق. ركز معايا عشان تقفل التنبيه: كم ناتج {new_num1} زائد {new_num2}؟"

        # Check if user is asking for details about the active reminder
        details_triggers = ["موعد ايه", "معاد ايه", "دوا ايه", "دواء ايه", "تفاصيل", "معاد إيه", "موعد إيه", "دواء إيه", "إيه ده", "ايه ده", "أي موعد", "أنهي موعد", "أنهي دواء", "what is this", "details", "ميعاد ايه", "ميعاد إيه"]
        if self.sched.active and any(trig in user_text.lower() for trig in details_triggers):
            active_rem = self.sched.active
            title = active_rem.get("med_name", "الدواء")
            if title == "تذكير عام":
                title = active_rem.get("condition", "موعدك")
            
            med_id = active_rem.get("med_id")
            med_notes = ""
            if med_id:
                med_rec = self.db._get_record("medications", med_id)
                if med_rec:
                    med_notes = med_rec.get("notes") or ""
            
            response_text = f"هذا تنبيه لـ {title}."
            if med_notes and med_notes != "لا توجد تفاصيل إضافية.":
                response_text += f" التفاصيل المسجلة هي: {med_notes}"
            else:
                response_text += " لا توجد تفاصيل إضافية مسجلة."
            return response_text


        # Normalize colloquial Arabic medical terms
        try:
            from src.core.medical_nlp import MedicalTextProcessor
            nlp_processor = MedicalTextProcessor()
            normalized_text = nlp_processor.normalize_arabic_medical(user_text)
            if normalized_text != user_text:
                log.info("Normalized colloquial query: '%s' -> '%s'", privacy.redact_phi(user_text), privacy.redact_phi(normalized_text))
                user_text = normalized_text
        except Exception as e:
            log.error(f"Failed to normalize colloquial medical terms: {e}")

        # Intercept Confirmation/Decline for Shift Suggestion
        if self.sched.pending_shift_minutes > 0:
            if is_confirmation(user_text):
                shift_mins = self.sched.pending_shift_minutes
                med_id = self.sched.pending_shift_med_id
                
                # Reset pending state
                self.sched.pending_shift_minutes = 0
                self.sched.pending_shift_med_id = 0
                
                # Apply shift to the next scheduled reminder
                row = await self.db.get_pending_reminder_for_med(med_id)
                if row:
                    rid = row["id"]
                    old_sched = datetime.datetime.fromisoformat(row["sched_time"])
                    new_sched = old_sched + datetime.timedelta(minutes=shift_mins)
                    await self.db.update_reminder(
                        rid,
                        sched_time=new_sched.isoformat(),
                        next_attempt=new_sched.isoformat()
                    )
                    
                    # Update time_str so all future reminders inherit this shifted time
                    new_time_str = new_sched.strftime("%H:%M")
                    await self.db.update_medication_time_str(med_id, new_time_str)
                    
                    return f"تم! رحلت موعد التنبيه القادم بمقدار {shift_mins} دقيقة بنجاح. الموعد الجديد هو الساعة {new_time_str}."
                return "عذراً، لم أجد التنبيه القادم لتعديله."

            elif is_negative(user_text):
                self.sched.pending_shift_minutes = 0
                self.sched.pending_shift_med_id = 0
                return "تمام، سأبقي التنبيهات في موعدها المعتاد دون أي تعديل."

        await self._store_mood(user_text)

        if is_undo_request(user_text):
            return await self.db.undo_last_insert()

        if self.sched.active:
            active_rem = self.sched.active
            title = active_rem.get("med_name", "")
            msg = active_rem.get("message", "")
            condition = active_rem.get("condition", "")
            patient = active_rem.get("patient_name", "المريض")
            rid = active_rem["id"]
            
            display_title = title
            if title == "تذكير عام":
                display_title = condition or "موعدك"

            if is_confirmation(user_text):
                critical_keywords = ["امتحان", "اختبار", "سفر", "طيران", "طبيب", "مستشفى", "لقاء", "اجتماع", "عمل", "شغل", "exam", "test", "flight", "doctor", "work", "meeting", "urgent"]
                is_critical = any(kw in title.lower() or kw in msg.lower() or kw in condition.lower() for kw in critical_keywords)
                
                if is_critical and active_rem.get("awaiting_wakefulness_math") is None:
                    import random
                    num1 = random.randint(5, 15)
                    num2 = random.randint(5, 15)
                    active_rem["awaiting_wakefulness_math"] = (num1, num2, num1 + num2)
                    return f"للتأكد من أنك مستيقظ وفايق تماماً لـ {display_title}، كم ناتج جمع {num1} زائد {num2}؟"
                
                result = await self.sched.confirm(rid, source="user_voice")
                status = result.get("status")
                remaining = result.get("remaining_doses")
                low_stock = result.get("low_stock")
                streak = int(result.get("streak") or 0)
                shift_msg = result.get("shift_suggestion", "")
                streak_msg = ""
                if streak >= 2 and not result.get("used_snooze"):
                    streak_msg = f" عاش جداً! ده اليوم {arabic_ordinal(streak)} على التوالي بتاخد دوائك بانتظام، استمر."
                
                if title == "تذكير عام":
                    self.sched.active = None
                    return f"تمام يا {patient}! تم تسجيل انتهاء التنبيه لـ {display_title} بنجاح."
                
                if status == "expired":
                    self.sched.active = None
                    return f"ممتاز يا {patient}! أخدت آخر جرعة. ربنا يشفيك، هشيل التذكير خلاص!{streak_msg}"
                if status == "chronic":
                    self.sched.active = None
                    return f"تمام يا {patient}! هفكرك بكرا في نفس المعاد. الدواء ده مهم ومستمر.{streak_msg}{shift_msg}"
                
                low_msg = ""
                if low_stock:
                    low_msg = f" بالمناسبة، فاضل {remaining} جرعات بس؛ علبة الدواء قربت تخلص ومحتاجين نشتري غيرها."
                self.sched.active = None
                return f"ممتاز يا {patient}! تم تسجيل أخذ الدواء. هفكرك بكرا.{streak_msg}{low_msg}{shift_msg}"

            elif is_snooze(user_text):
                await self.sched.snooze(rid, source="user_voice")
                return f"حاضر يا {patient}، تم تأجيل التنبيه لـ {display_title} لمدة 5 دقائق."

            elif is_skip(user_text):
                await self.sched.skip(rid, source="user_voice")
                return f"تمام يا {patient}، تم تخطي هذه الجرعة لـ {display_title}."

            elif is_cancel(user_text):
                await self.sched.cancel(rid, source="user_voice")
                return f"تم إلغاء التنبيه لـ {display_title}."

        # Intercept General Reminder Gatherer
        if self.reminder_gatherer and not self.reminder_gatherer.complete:
            result = await self.reminder_gatherer.step(user_text)
            if result == "DONE":
                patient = await self.db.get_patient_name() or "المريض"
                title = self.reminder_gatherer.gathered.get("title", "موعد")
                time_str = self.reminder_gatherer.gathered.get("time_str", "")
                await self.reminder_gatherer.save(patient)
                self.reminder_gatherer = None
                await play_earcon("chime")
                return f"تم! سجلت تنبيه بـ '{title}' الساعة/الوقت {time_str} بنجاح."
            return result

        if self.gatherer and self.gatherer.awaiting_interaction_ack:
            if is_negative(user_text):
                self.gatherer = None
                return "تمام، ما حفظتش الدواء. راجع الطبيب أو الصيدلي الأول لو في شك في التعارض."
            if is_confirmation(user_text):
                return await self._finish_med_save()
            return "أحفظ الدواء رغم التحذير؟ قل تمام للحفظ أو لا للإلغاء."

        if self.gatherer and not self.gatherer.complete:
            result = await self.gatherer.step(user_text)
            if result == "DONE":
                warnings = await self.gatherer.check_interactions()
                if warnings:
                    self.gatherer.awaiting_interaction_ack = True
                    return "\n".join(warnings) + "\nأحفظ الدواء رغم التحذير؟"
                return await self._finish_med_save()
            return result

        if any(trigger in user_text.lower() for trigger in self.MED_TRIGGERS):
            chk = await llm(
                [{"role": "user", "content": f"هل يريد المريض إضافة موعد دواء؟ أجب YES أو NO فقط.\nالرسالة: {user_text}"}],
                temp=0.1,
                max_tok=1024,
            )
            if chk and "YES" in chk.upper():
                self.gatherer = MedGatherer(self.db)
                q = await self.gatherer.step(user_text)
                if q != "DONE":
                    return q
                warnings = await self.gatherer.check_interactions()
                if warnings:
                    self.gatherer.awaiting_interaction_ack = True
                    return "\n".join(warnings) + "\nأحفظ الدواء رغم التحذير؟"
                return await self._finish_med_save()

        # Check for general reminder intent
        general_triggers = ["معاد", "موعد", "امتحان", "تذكير", "منبه", "ذكرني", "اجتماع", "لقاء", "remind me", "appointment", "meeting", "exam", "alarm"]
        if any(trig in user_text.lower() for trig in general_triggers):
            chk_gen = await llm(
                [{"role": "user", "content": f"هل يريد المستخدم جدولة موعد أو تنبيه أو منبه عام (مثل امتحان، اجتماع، موعد طبيب، منبه استيقاظ، إلخ) وليس إضافة دواء؟ أجب YES أو NO فقط.\nالرسالة: {user_text}"}],
                temp=0.1,
                max_tok=1024,
            )
            if chk_gen and "YES" in chk_gen.upper():
                self.reminder_gatherer = ReminderGatherer(self.db)
                result = await self.reminder_gatherer.step(user_text)
                if result == "DONE":
                    patient = await self.db.get_patient_name() or "المريض"
                    title = self.reminder_gatherer.gathered.get("title", "موعد")
                    time_str = self.reminder_gatherer.gathered.get("time_str", "")
                    await self.reminder_gatherer.save(patient)
                    self.reminder_gatherer = None
                    await play_earcon("chime")
                    return f"تم! سجلت تنبيه بـ '{title}' الساعة/الوقت {time_str} بنجاح."
                return result


        # Check for Doctor Correction / Feedback Loop trigger
        clean_text = user_text.strip()
        is_correction = False
        correction_prefix = ""
        for pref in ["تعديل الطبيب:", "تصحيح طبي:", "تصحيح من الطبيب:", "الطبيب قال:", "تعديل الطبيب", "تصحيح طبي", "تصحيح من الطبيب"]:
            if clean_text.lower().startswith(pref):
                is_correction = True
                correction_prefix = pref
                break
        
        if is_correction:
            correction = clean_text[len(correction_prefix):].strip()
            if correction:
                # Retrieve previous conversation context to attach
                hist = await self.db.get_history(limit=2)
                last_q = ""
                last_a = ""
                if len(hist) >= 2:
                    last_q = hist[-2]["content"]
                    last_a = hist[-1]["content"]
                
                # 1. Save correction to ClinicalMemory
                if self.clinical_mem and self.clinical_mem.enabled:
                    await self.clinical_mem.remember_doctor_correction(
                        doctor_id="default_doctor",
                        correction=correction,
                        context={"query": last_q, "original_answer": last_a}
                    )
                
                # 2. Record to TrainingCollector for offline DSPy tuning
                try:
                    from src.services.training_collector import TrainingCollector
                    collector = TrainingCollector()
                    
                    # Fetch WHO context of the original query if it was medical
                    who_ctx = ""
                    if last_q:
                        orig_route = medical_router.route_query(last_q)
                        if orig_route.is_medical:
                            orig_bundle = await self._who_bundle(orig_route)
                            who_ctx = orig_bundle.context_text()
                    
                    collector.record_correction(
                        query=last_q,
                        original_answer=last_a,
                        corrected_answer=correction,
                        who_context=who_ctx,
                        patient_history="",
                        doctor_id="default_doctor"
                    )
                except Exception as ex:
                    log.error(f"Failed to save training correction: {ex}")
                
                return f"تم تسجيل تعديل الطبيب بنجاح: '{correction}'. سألتزم به في الاستشارات القادمة ولن أكرر الخطأ."

        route = medical_router.route_query(user_text)

        # Check if we should override the routing to stay in medical context
        if not route.is_medical and not route.is_emergency:
            if hasattr(self, "medical_history") and self.medical_history:
                if self._is_medical_continuation(user_text):
                    log.info("Routing overridden to medical continuation for query (redacted): '%s'", privacy.redact_phi(user_text))
                    route = medical_router.RouteDecision(
                        kind="medical",
                        confidence=0.9,
                        normalized_query=route.normalized_query,
                        search_query=medical_router.build_medical_search_query(user_text),
                        reasons=["medical_continuation_flow"],
                        research_mode=False
                    )

        # Clear medical history if topic changes
        if not route.is_medical and not route.is_emergency:
            if hasattr(self, "medical_history"):
                self.medical_history.clear()

        if route.is_emergency:
            return medical_guardrails.emergency_response(user_text)
        if route.is_medical:
            return await self._answer_medical(user_text, route, on_token_callback)

        web_context = await self._web_context(user_text)
        if web_context.is_medical and not web_context.found:
            return "لا أقدر أجاوب طبياً من مصدر غير WHO. لم أجد الآن مصدراً مناسباً من منظمة الصحة العالمية لهذا السؤال، فالأفضل مراجعة طبيب أو صيدلي، أو اسألني بصياغة أدق لربطه بمصدر WHO."

        history = await self.db.get_history(limit=8)
        messages = [{"role": "system", "content": await self._sys_prompt(user_text, web_context.text)}] + history + [{"role": "user", "content": user_text}]
        
        if on_token_callback:
            resp_tokens = []
            async for token in llm_stream(messages):
                resp_tokens.append(token)
                await on_token_callback(token)
            resp = "".join(resp_tokens)
        else:
            resp = await llm(messages)
            
        if not resp:
            return "عذراً، حدث خطأ في الاتصال. حاول مرة أخرى."

        # Guardrail output validation for general queries
        from src.core import medical_guardrails
        validation = medical_guardrails.validate_medical_answer(resp, [], allow_dosage=False)
        serious_violations = [v for v in validation.violations if v != "missing_or_invalid_who_sources"]
        if serious_violations:
            log.warning("[GUARDRAIL_SHADOW_TRIGGER] General response has medical violations: %s | Query: %s", ", ".join(serious_violations), user_text[:100])
            
            # If blocking is explicitly enabled via environment variable
            if os.environ.get("RAFIQ_GUARDRAIL_BLOCK_GENERAL", "0") == "1":
                log.warning("[GUARDRAIL_BLOCKED] Blocking general query response due to medical guardrail violations.")
                lang = medical_guardrails.detect_lang(user_text)
                fallback = medical_guardrails.no_who_context_response(user_text)
                if "specific_dosage_language" in serious_violations:
                    fallback += "\n" + ("لا أقدم جرعات شخصية. راجع الطبيب أو الصيدلي لتحديد الجرعة المناسبة." if lang == "ar" else "I do not provide personal dosing. Ask a clinician or pharmacist for dosing.")
                if "prompt_injection_detected" in serious_violations:
                    fallback = "عذراً، لا يمكنني الاستجابة لهذه الأوامر الخاصة بالنظام."
                resp = fallback

        await self.db.save_msg("user", user_text)
        await self.db.save_msg("assistant", resp)
        asyncio.create_task(extract_memory_bg(user_text, resp, self.db))
        return resp
 # ConvEngine
async def log_watcher():
    last_pos = 0
    hits: list[float] = []
    patterns = ("TimeoutError", "timeout", "LLM timeout", "فشل الاتصال")
    while True:
        try:
            if LOG_PATH.exists():
                text = LOG_PATH.read_text(encoding="utf-8", errors="ignore")
                chunk = text[last_pos:]
                last_pos = len(text)
                now = time.time()
                if any(p in chunk for p in patterns):
                    hits.append(now)
                hits = [h for h in hits if now - h <= 600]
                if len(hits) >= 3:
                    print(tint("\nتنبيه للمطور: رصدت أخطاء اتصال متكررة في rafiq.log. راجع الشبكة أو الـ API.", Color.RED))
                    hits.clear()
        except Exception as e:
            log.error(f"log watcher: {e}")
        await asyncio.sleep(30)
 # log_watcher
def banner(wake: Any):
    try:
        import pyaudio
    except ImportError:
        pyaudio = None
    try:
        import webrtcvad
    except ImportError:
        webrtcvad = None
    try:
        import chromadb
    except ImportError:
        chromadb = None

    print("\n" + "═" * 60)
    print("  🤖  رفيق v3.5 | Phantoms Corp | BATU")
    print("═" * 60)
    print("  🎙️  قل 'رفيق' أو اضغط Enter للمايك")
    print("  🔚  قل/اكتب 'خلاص' لإنهاء المحادثة")
    print("  ↩️   قل 'امسح اللي فات' للتراجع السريع")
    print(f"  Wake engine: {wake.mode} | VAD: {'webrtcvad' if pyaudio and webrtcvad else 'speech_recognition fallback'} | Memory: {'ChromaDB' if chromadb else 'unavailable'}")
    print("═" * 60 + "\n")
 # banner
async def activate_greeting(db: RafiqDB) -> str:
    patient = await db.get_patient_name() or ""
    mood = await db.get_latest_mood_summary()
    if patient and mood:
        return f"أهلاً يا {patient}! أتمنى تكون أحسن من آخر مرة، رفيق معك."
    if patient:
        return f"أهلاً يا {patient}! رفيق معك."
    return "أهلاً! رفيق معك."
 # activate_greeting
async def prewarm_who_index(engine: ConvEngine):
    log.info("Prewarming WHO RAG index...")
    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(_pool, engine.who_rag.ensure_index)
        log.info("WHO RAG index prewarm triggered successfully.")
    except Exception as e:
        log.error(f"Failed to prewarm WHO RAG index: {e}")
 # prewarm_who_index

async def main():
    # Warm up and run the CLI interface for Rafiq
    from src.config import settings
    from src.services.wake_detector import WakeDetector
    from src.services.stt_service import listen_with_indicator, transcribe
    from src.services.tts_service import speak
    
    db_path = settings.DB_PATH
    db = await RafiqDB.create(db_path)
    scheduler = ReminderScheduler(db)
    engine = ConvEngine(db, scheduler)
    
    # Start scheduler in background
    asyncio.create_task(scheduler.run())
    # Start log watcher
    asyncio.create_task(log_watcher())
    
    wake = WakeDetector()
    banner(wake)
    
    greeting = await activate_greeting(db)
    print(tint(greeting, Color.GREEN))
    await speak(greeting)
    
    await db.update_assistant_state("PASSIVE")
    
    while True:
        try:
            triggered = await wake.wait_for_wake()
            if not triggered:
                continue
                
            wav = await listen_with_indicator()
            if not wav:
                continue
                
            text = await transcribe(wav)
            if not text:
                continue
                
            response = await engine.process(text)
            print(tint(f"رفيق: {response}", Color.GREEN))
            await speak(response)
        except Exception as e:
            log.error(f"Error in main loop: {e}", exc_info=True)
            await asyncio.sleep(1)

def run_with_recovery():
    while True:
        try:
            asyncio.run(main())
            os.environ.pop("RAFIQ_RECOVERY_ATTEMPTS", None)
            break
        except KeyboardInterrupt:
            os.environ.pop("RAFIQ_RECOVERY_ATTEMPTS", None)
            break
        except EOFError:
            log.info("No interactive input available; shutting down cleanly.")
            os.environ.pop("RAFIQ_RECOVERY_ATTEMPTS", None)
            break
        except Exception as e:
            log.critical(f"Fatal crash: {e}", exc_info=True)
            if not ENABLE_AUTO_RECOVERY:
                os.environ.pop("RAFIQ_RECOVERY_ATTEMPTS", None)
                raise

            _recovery_env = os.environ.get("RAFIQ_RECOVERY_ATTEMPTS", "")
            _recovery_attempts: list[float] = []
            if _recovery_env:
                try:
                    _recovery_attempts = [float(t) for t in _recovery_env.split(",") if t.strip()]
                except ValueError:
                    pass

            now = time.time()
            _RECOVERY_WINDOW = 60.0
            _recovery_attempts = [t for t in _recovery_attempts if now - t <= _RECOVERY_WINDOW]

            next_count = len(_recovery_attempts) + 1
            cooldown = min(2.0 ** (next_count - 1), 15.0)
            
            log.warning(
                "Auto recovery attempt %d/3 in %.1f seconds...",
                next_count,
                cooldown,
            )
            time.sleep(cooldown)
            restart_process(f"خطأ جذري: {e}")
 # run_with_recovery
