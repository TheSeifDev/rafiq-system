import os
import sys
import re
import logging
import asyncio
import datetime
from pathlib import Path
from typing import Any

from src.config.settings import REMINDER_CHECK_SECS, MAX_REMINDER_ATTEMPTS, LOW_STOCK_THRESHOLD, PROACTIVE_CHECKIN_HOUR, PROACTIVE_CHECKIN_MINUTE, REMINDER_SNOOZE_MIN
from src.utils.helpers import log, arabic_ordinal, Color, tint
from src.database.db_operational import RafiqDB
from src.services.tts_service import speak, play_alarm
from src.services.stt_service import listen_with_indicator, transcribe

class ReminderScheduler:
    def __init__(self, db: RafiqDB):
        self.db = db
        self.active: dict[str, Any] | None = None
        self.just_fired = False
        # v4.1 Adaptive scheduling state
        self.pending_shift_minutes = 0
        self.pending_shift_med_id = 0
        self._event_listeners = {}

    def on(self, event_name: str, callback: Any):
        if event_name not in self._event_listeners:
            self._event_listeners[event_name] = []
        self._event_listeners[event_name].append(callback)

    def _fire_event(self, event_name: str, *args, **kwargs):
        if event_name in self._event_listeners:
            for cb in self._event_listeners[event_name]:
                try:
                    if asyncio.iscoroutinefunction(cb):
                        asyncio.create_task(cb(*args, **kwargs))
                    else:
                        cb(*args, **kwargs)
                except Exception as e:
                    log.error(f"Error in event listener {event_name}: {e}")

    async def run(self):
        while True:
            try:
                await self._tick()
            except Exception as e:
                log.error(f"Scheduler tick: {e}", exc_info=True)
            await asyncio.sleep(REMINDER_CHECK_SECS)

    def _inventory_suffix(self, reminder: dict[str, Any]) -> str:
        if reminder.get("is_chronic"):
            return ""
        remaining = int(reminder.get("remaining_doses") or 0)
        if 0 < remaining < LOW_STOCK_THRESHOLD:
            return " بالمناسبة، علبة الدواء دي قربت تخلص، محتاجين نشتري غيرها."
        return ""

    async def _reschedule_next_slot(self, rid: int, reminder: dict[str, Any]):
        med_id = reminder.get("med_id")
        med = self.db._get_record("medications", int(med_id))
        if not med or not int(med.get("active") or 0):
            return
            
        time_str = reminder.get("time_str", "")
        if not time_str:
            time_str = await self.db.get_medication_time_str(med_id)
            
        interval = None
        if time_str:
            match = re.search(r"(?:كل|every)\s+(\d+)\s+(?:ساعة|ساعات|hour|hours)", time_str, re.IGNORECASE)
            if match:
                interval = datetime.timedelta(hours=int(match.group(1)))
            elif any(x in time_str for x in ["3 مرات", "ثلاث مرات", "3 times"]):
                interval = datetime.timedelta(hours=8)
            elif any(x in time_str for x in ["مرتين", "2 times", "2 مرة"]):
                interval = datetime.timedelta(hours=12)

        try:
            sched_time_str = reminder.get("sched_time") or reminder.get("next_attempt")
            old_sched = datetime.datetime.fromisoformat(sched_time_str)
            if interval:
                new_sched = old_sched + interval
                while new_sched <= datetime.datetime.now():
                    new_sched += interval
            else:
                new_sched = old_sched + datetime.timedelta(days=1)
                while new_sched <= datetime.datetime.now():
                    new_sched += datetime.timedelta(days=1)
        except Exception:
            new_sched = datetime.datetime.now() + (interval or datetime.timedelta(hours=24))
        
        await self.db.update_reminder(
            rid,
            status="pending",
            attempts=0,
            next_attempt=new_sched.isoformat(),
            sched_time=new_sched.isoformat(),
        )

    async def _tick(self):
        # Auto-snooze scanner
        if self.active and self.active.get("status") == "awaiting_confirmation":
            fired_at = getattr(self, "fired_at", None)
            if fired_at and (datetime.datetime.now() - fired_at).total_seconds() > 60:
                active_id = self.active.get("id")
                log.info(f"Auto-snoozing active reminder {active_id} due to 60s timeout.")
                await self.snooze(active_id, source="system_timeout")

        for reminder in await self.db.get_due_reminders():
            rid = reminder["id"]
            attempts = reminder["attempts"]
            patient = reminder["patient_name"] or "المريض"
            
            # Overdue Check (>24 hours)
            sched_time_str = reminder.get("next_attempt") or reminder.get("sched_time")
            if sched_time_str:
                try:
                    sched_dt = datetime.datetime.fromisoformat(sched_time_str)
                    if (datetime.datetime.now() - sched_dt).total_seconds() > 24 * 3600:
                        await self.expire(rid, reminder)
                        continue
                except Exception as e:
                    log.error(f"Error parsing sched_time in tick overdue check: {e}")

            # Check if assistant is disabled or locked
            current_state = await self.db.get_assistant_state()
            if current_state in ("DISABLED", "LOCKED"):
                continue

            if attempts >= MAX_REMINDER_ATTEMPTS:
                print(f"\n🚨🚨🚨 إنذار طارئ وسارينة! {reminder['message']}")
                await speak(f"تحذير عاجل يا {patient}! لم يتم الاستجابة للتنبيه بعد {MAX_REMINDER_ATTEMPTS} محاولات. أطلق صفارة الإنذار!", priority="emergency", sentiment="urgent")
                from src.services.tts_service import play_earcon
                await play_earcon("siren")
                await self.db.update_reminder(rid, status="alarmed", attempts=attempts + 1)
                await self._reschedule_next_slot(rid, reminder)
                if self.active and self.active.get("id") == rid:
                    self.active = None
                    self.just_fired = False
                await self.db.update_assistant_state("PASSIVE")
                continue

            # Fetch health streak
            streak_row = await self.db.get_health_streak(patient, reminder["med_id"])
            streak = streak_row["current_streak"] if streak_row else 0

            # Fetch patient current mood
            mood = await self.db.get_latest_mood_summary() or "neutral"

            # Generate dynamic motivation message
            if reminder.get("med_name") in ["تذكير عام", "منبه عام", "موعد عام", "تذكير", "موعد", "منبه"]:
                message = reminder["message"]
                priority = "low"
            else:
                from src.services.motivation_manager import MotivationManager
                is_urgent = (attempts > 0)
                motivating_msg = await MotivationManager.generate_message(
                    med_name=reminder["med_name"],
                    patient_name=patient,
                    streak=streak,
                    mood=mood,
                    is_urgent=is_urgent
                )
                message = motivating_msg + self._inventory_suffix(reminder)
                priority = "medium"

            print(tint(f"\n⏰  [{datetime.datetime.now().strftime('%H:%M')}] تذكير: {message}", Color.ORANGE))
            await self.db.update_reminder(rid, status="awaiting_confirmation")
            await self.db.update_assistant_state("AWAITING_REMINDER_RESPONSE")
            self.active = dict(reminder)
            self.active["status"] = "awaiting_confirmation"
            self.fired_at = datetime.datetime.now()
            self.just_fired = True
            
            # Speak the message AFTER updating state to awaiting_confirmation
            await speak(message, priority=priority)
            self._fire_event("dose_due", reminder)

    async def confirm(self, rid: int, source: str = "user_voice") -> dict[str, Any]:
        reminder = self.active
        now_iso = datetime.datetime.now().isoformat()
        await self.db.update_reminder(
            rid,
            status="confirmed",
            confirmation_source=source,
            confirmation_time=now_iso
        )
        if not reminder or reminder.get("id") != rid:
            reminder = self.db._get_record("reminders", rid)
            if not reminder:
                return {"status": "active"}
            med = self.db._get_record("medications", int(reminder.get("med_id") or 0))
            if med:
                reminder = dict(reminder)
                reminder.update({
                    "is_chronic": int(med.get("is_chronic") or 0),
                    "remaining_doses": int(med.get("remaining_doses") or 0),
                    "med_name": med.get("med_name", ""),
                    "dose": med.get("dose", ""),
                    "time_str": med.get("time_str", ""),
                })
            else:
                return {"status": "active"}

        used_snooze = int(reminder.get("attempts") or 0) > 0
        streak = await self.db.record_dose_taken(reminder, used_snooze=used_snooze)
        med_result = await self.db.decrement_doses(reminder.get("med_id"))
        status = med_result.get("status", "active")
        med_id = reminder.get("med_id")

        if status != "expired":
            await self._reschedule_next_slot(rid, reminder)

        # Shift Suggestion check:
        # Fetch last 3 dose events for this medication to check for delay pattern
        shift_suggestion = ""
        try:
            events = await self.db.get_recent_dose_events(med_id, limit=3)
            if len(events) >= 3:
                delays = []
                for ev in events:
                    taken = datetime.datetime.fromisoformat(ev["taken_at"])
                    sched = datetime.datetime.fromisoformat(ev["sched_time"])
                    diff = (taken - sched).total_seconds() / 60.0
                    delays.append(diff)
                
                avg_delay = sum(delays) / len(delays)
                if avg_delay >= 15:
                    self.pending_shift_minutes = int(avg_delay)
                    self.pending_shift_med_id = med_id
                    shift_suggestion = f"\nبالمناسبة، لاحظت إنك بتاخد جرعاتك متأخرة بمتوسط {int(avg_delay)} دقيقة. تحب أرحل التنبيه القادم عشان يناسب وقتك الفعلي؟"
        except Exception as e:
            log.error(f"Failed to calculate adaptive reminder shift: {e}")

        self.active = None
        self.just_fired = False
        await self.db.update_assistant_state("PASSIVE")
        med_result["streak"] = streak
        med_result["used_snooze"] = used_snooze
        med_result["shift_suggestion"] = shift_suggestion
        return med_result

    async def snooze(self, rid: int, source: str = "user_voice"):
        reminder = self.active
        if not reminder or reminder.get("id") != rid:
            reminder = self.db._get_record("reminders", rid)
        if not reminder:
            return
        attempts = int(reminder.get("attempts") or 0) + 1
        nxt = (datetime.datetime.now() + datetime.timedelta(minutes=REMINDER_SNOOZE_MIN)).isoformat()
        await self.db.update_reminder(
            rid,
            status="snoozed",
            attempts=attempts,
            next_attempt=nxt
        )
        self.active = None
        self.just_fired = False
        await self.db.update_assistant_state("PASSIVE")
        log.info(f"Reminder {rid} snoozed by {source}. Next attempt: {nxt}")

    async def skip(self, rid: int, source: str = "user_voice"):
        reminder = self.active
        if not reminder or reminder.get("id") != rid:
            reminder = self.db._get_record("reminders", rid)
        if not reminder:
            return
        await self.db.update_reminder(rid, status="missed")
        await self._reschedule_next_slot(rid, dict(reminder))
        self.active = None
        self.just_fired = False
        await self.db.update_assistant_state("PASSIVE")
        log.info(f"Reminder {rid} skipped/missed by {source}.")

    async def cancel(self, rid: int, source: str = "user_voice"):
        reminder = self.active
        if not reminder or reminder.get("id") != rid:
            reminder = self.db._get_record("reminders", rid)
        if not reminder:
            return
        await self.db.update_reminder(rid, status="cancelled")
        await self._reschedule_next_slot(rid, dict(reminder))
        self.active = None
        self.just_fired = False
        await self.db.update_assistant_state("PASSIVE")
        log.info(f"Reminder {rid} cancelled by {source}.")

    async def expire(self, rid: int, reminder: dict[str, Any]):
        await self.db.update_reminder(rid, status="expired")
        await self._reschedule_next_slot(rid, reminder)
        if self.active and self.active.get("id") == rid:
            self.active = None
            self.just_fired = False
            await self.db.update_assistant_state("PASSIVE")
        log.info(f"Reminder {rid} expired due to being overdue (>24h).")
 # ReminderScheduler
class TodayMedsDisplay:
    def __init__(self, db: RafiqDB):
        self.db = db
        self.last = ""

    async def run(self):
        while True:
            try:
                table = await self.db.today_meds_table()
                if table != self.last:
                    self.last = table
                    print(tint("\nأدوية اليوم", Color.GREEN))
                    print(table + "\n")
            except Exception as e:
                log.error(f"today meds display: {e}")
            await asyncio.sleep(60)
 # TodayMedsDisplay
class ProactiveCheckin:
    def __init__(self, db: RafiqDB, engine: Any = None):
        self.db = db
        self.engine = engine
        self.last_date: str | None = None
        self._callbacks = []

    def register_callback(self, cb: Any):
        self._callbacks.append(cb)

    async def run(self):
        while True:
            try:
                now = datetime.datetime.now()
                today = now.date().isoformat()
                target = now.replace(hour=PROACTIVE_CHECKIN_HOUR, minute=PROACTIVE_CHECKIN_MINUTE, second=0, microsecond=0)
                if now >= target and self.last_date != today:
                    self.last_date = today
                    await self._check_in()
                await asyncio.sleep(60)
            except Exception as e:
                log.error(f"proactive checkin: {e}", exc_info=True)
                await asyncio.sleep(60)

    async def _check_in(self):
        patient = await self.db.get_patient_name() or ""
        mood = await self.db.get_latest_mood_summary()
        opener = "صباح الخير"
        if patient:
            opener += f" يا {patient}"
        if mood:
            opener += ". أتمنى تكون أحسن من آخر مرة. طمني، كيف تشعر اليوم؟"
        else:
            opener += ". كيف تشعر اليوم?"
        print(tint(f"\nرفيق يبادر: {opener}", Color.BLUE))
        await speak(opener, priority="medium", sentiment="positive")
        wav = await listen_with_indicator(timeout=8.0, phrase_limit=20.0)
        if not wav:
            return
        user_text = await transcribe(wav)
        if not user_text:
            return
        print(f"🎤 أنت: {user_text}")
        
        # Use callbacks if registered (Event Broker pattern)
        if self._callbacks:
            response = await self._callbacks[0](user_text)
            sentiment = "neutral"
        else:
            ENABLE_LEGACY_ENGINE = False
            if ENABLE_LEGACY_ENGINE and self.engine:
                response = await self.engine.process(user_text)
                sentiment = self.engine.last_sentiment
            else:
                response = "تم تعطيل الاستدعاء المباشر للمحرك."
                sentiment = "neutral"
            
        print(f"\n🤖 رفيق: {response}\n")
        await speak(response, priority="high", sentiment=sentiment)
 # ProactiveCheckin
