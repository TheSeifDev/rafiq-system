"""Insert sample data so you can poke the API without writing 30 curl calls.

Run:
    python seed.py
"""
import sys
from datetime import datetime, timedelta

if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

import db


def main() -> None:
    db.init_db()

    # 1. Patient
    pid = db.create_patient({
        "name": "أحمد محمود",
        "age": 67,
        "gender": "male",
        "blood_type": "O+",
        "medical_history": "ضغط دم مرتفع، سكري من النوع الثاني",
    })
    print(f"✅ patient #{pid} created")

    # 2. Alert
    aid = db.create_alert({
        "patient_id": pid,
        "type": "heart_rate",
        "message": "نبضات القلب مرتفعة (115 نبضة/دقيقة)",
        "severity": "high",
    })
    print(f"✅ alert #{aid} created")

    # 3. Devices
    d1 = db.register_device({"patient_id": pid, "device_name": "ESP32-Vitals",
                             "type": "vital_monitor", "status": "online"})
    d2 = db.register_device({"patient_id": pid, "device_name": "GarminWatch-7",
                             "type": "wearable",      "status": "online"})
    print(f"✅ devices #{d1}, #{d2} registered")

    # 4. Emergency contacts
    db.add_contact({"patient_id": pid, "name": "فاطمة (الزوجة)",
                    "relationship": "spouse", "phone_number": "+201001234567",
                    "priority": 1})
    db.add_contact({"patient_id": pid, "name": "د. حسن (الطبيب)",
                    "relationship": "doctor", "phone_number": "+201112223344",
                    "priority": 2})
    print("✅ 2 emergency contacts added")

    # 5. Location
    db.record_location(pid, latitude=30.0444, longitude=31.2357)  # Cairo
    print("✅ location recorded")

    # 6. Reminders — three meds spread across the day
    import zoneinfo
    now = datetime.now(zoneinfo.ZoneInfo("Africa/Cairo"))
    for offset, title, desc in [
        (timedelta(hours=1),  "دواء الضغط",  "حبة واحدة بعد الإفطار"),
        (timedelta(hours=6),  "قياس السكر",  "قبل الغداء"),
        (timedelta(hours=12), "دواء السكري", "حبة واحدة قبل النوم"),
    ]:
        db.add_reminder({
            "patient_id":  pid,
            "title":       title,
            "description": desc,
            "time":        (now + offset).isoformat(timespec="seconds"),
            "is_active":   True,
        })
    print("✅ 3 reminders added")

    print("\n🎉 Seed complete. Try:")
    print("    python -c 'import db; print(db.list_patients())'")
    print("    uvicorn api:app --port 8001 --reload")


if __name__ == "__main__":
    main()
