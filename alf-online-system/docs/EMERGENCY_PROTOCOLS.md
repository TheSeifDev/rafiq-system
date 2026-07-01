# 🚨 Emergency Protocols

## Triggers
Local patterns in `medical_router.py` check for:
* **Chest/Heart Pain**: "وجع بصدري", "chest pain", "قلبي يوجعني".
* **Dyspnea**: "مش قادر اتنفس", "can't breathe", "كتمة".
* **Acute trauma / Poisoning / Overdose**: "انتحار", "overdose", "نزيف شديد".

## Escalation Path
* The system interrupts any speech and plays an emergency alert sound.
* Displays local response directing patient to call the ambulance or seek immediate medical help.