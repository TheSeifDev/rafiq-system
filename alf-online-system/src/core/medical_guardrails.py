from __future__ import annotations

import re
from dataclasses import dataclass, field

from src.services import trusted_web


FORBIDDEN_MEDICAL_SOURCES = [
    "webmd",
    "mayoclinic",
    "mayo clinic",
    "cdc.gov",
    "healthline",
    "clevelandclinic",
    "rxlist",
    "drugs.com",
    "wikipedia",
]

# Allow qualified possibilities (e.g. "you may have"), block only definitive diagnoses
PERSONAL_DIAGNOSIS_PATTERNS = [
    r"\b(?<!may\s)(?<!might\s)(?<!could\s)(?<!probably\s)(?<!possibly\s)you\s+have\b",
    r"\b(?<!may\s)(?<!might\s)(?<!could\s)(?<!probably\s)(?<!possibly\s)you\s+are\s+diagnosed\b",
    r"(?<!قد\s)(?<!ربما\s)(?<!احتمال\s)(?<!يمكن\s)(?<!محتمل\s)أنت\s+مصاب\s+بـ?",
    r"(?<!قد\s)(?<!ربما\s)(?<!احتمال\s)(?<!يمكن\s)(?<!محتمل\s)انت\s+مصاب\s+بـ?",
    r"(?<!قد\s)(?<!ربما\s)(?<!احتمال\s)(?<!يمكن\s)(?<!محتمل\s)لديك\s+مرض",
    r"تشخيصك\s+النهائي\s+هو",
]

DOSAGE_PATTERNS = [
    r"\b\d+\s*(?:mg|ملغ|مجم|مج|g|جرام|جم|مل|ml|ميكروجرام|mcg)\b",
    r"\b\d+\s*(?:tablet|tablets|pill|pills|capsule|capsules)\b",
    r"\b\d+\s*(?:حبه|حبة|قرص|اقراص|كبسولة|كبسولات)\b",
    r"\b(?:جرعة|جرعات|حبة|حبتين|قرص|قرصين|ملعقة|ملعقتين)\b",
    r"\b(?:واحد|اثنان|ثلاثة|اربعة|خمسة|ستة|سبعة|ثمانية|تسعة|عشرة|نصف|ربع)\s+(?:حبه|حبة|قرص|اقراص|ملغ|مجم|مل)\b",
]

PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(?:previous|system|instructions)",
    r"forget\s+(?:everything|instructions)",
    r"override\s+policy",
    r"ignore\s+who",
    r"تجاهل\s+(?:التعليمات|الأوامر|القواعد)",
    r"انسى\s+(?:كل|التعليمات|الأوامر)",
    r"أنت\s+الآن\s+لست",
    r"تحدث\s+كطبيب\s+شخصي",
]

AR_MEDICAL_DISCLAIMER = "هذه معلومات عامة موثقة من منظمة الصحة العالمية، وليست تشخيصاً أو بديلاً عن الطبيب. في الحالات العاجلة أو القرارات العلاجية راجع طبيباً أو صيدلياً."
EN_MEDICAL_DISCLAIMER = "This is general information grounded in WHO sources, not a diagnosis or a substitute for a clinician. For urgent symptoms or treatment decisions, contact a doctor or pharmacist."


@dataclass(frozen=True)
class GuardrailResult:
    allowed: bool
    text: str
    violations: list[str] = field(default_factory=list)


def detect_lang(text: str) -> str:
    arabic = sum(1 for char in text if "\u0600" <= char <= "\u06FF")
    latin = sum(1 for char in text if char.isascii() and char.isalpha())
    letters = arabic + latin
    if letters == 0:
        return "ar"
    return "ar" if arabic / letters >= 0.25 else "en"


def emergency_response(user_text: str) -> str:
    if detect_lang(user_text) == "en":
        return (
            "This may be urgent. Call local emergency services now or go to the nearest emergency department. "
            "If possible, stay with another person and do not wait for an AI response."
        )
    return (
        "ده ممكن يكون موقف طارئ. اتصل بالإسعاف أو اذهب لأقرب طوارئ الآن. "
        "لو تقدر، خليك مع شخص قريب منك ولا تنتظر رد الذكاء الاصطناعي."
    )


def no_who_context_response(user_text: str) -> str:
    if detect_lang(user_text) == "en":
        return (
            "I could not find a suitable WHO source for this medical question, so I will not guess. "
            "Please rephrase the question or consult a clinician."
        )
    return (
        "لم أجد مصدراً مناسباً من منظمة الصحة العالمية لهذا السؤال الطبي، لذلك لن أخمّن. "
        "اكتب السؤال بصياغة أدق أو راجع طبيباً/صيدلياً."
    )


def _source_block(sources: list[str], lang: str) -> str:
    valid = [source for source in sources if trusted_web.is_allowed_medical_url(source)]
    if not valid:
        return ""
    title = "مصادر WHO:" if lang == "ar" else "WHO sources:"
    lines = [title]
    lines.extend(f"- {source}" for source in valid)
    return "\n".join(lines)


def validate_medical_answer(text: str, sources: list[str], allow_dosage: bool = False) -> GuardrailResult:
    lowered = text.lower()
    violations: list[str] = []
    
    if not sources or not all(trusted_web.is_allowed_medical_url(source) for source in sources):
        violations.append("missing_or_invalid_who_sources")
        
    for forbidden in FORBIDDEN_MEDICAL_SOURCES:
        if forbidden in lowered:
            violations.append(f"forbidden_source:{forbidden}")
            
    # Check for personal diagnosis
    if any(re.search(pattern, lowered) for pattern in PERSONAL_DIAGNOSIS_PATTERNS):
        violations.append("personal_diagnosis_language")
        
    if not allow_dosage and any(re.search(pattern, lowered) for pattern in DOSAGE_PATTERNS):
        violations.append("specific_dosage_language")
        
    if any(re.search(pattern, lowered) for pattern in PROMPT_INJECTION_PATTERNS):
        violations.append("prompt_injection_detected")
        
    return GuardrailResult(allowed=not violations, text=text, violations=violations)


class MedicalGuardrails:
    FORBIDDEN_PATTERNS = [
        r"\d+\s*(?:mg|ملغ|مجم|مج|g|جرام|جم|مل|ml|ميكروجرام|mcg)",          # جرعات محددة بالمليغرام
        r"\b(?:واحد|اثنان|ثلاثة|اربعة|خمسة|ستة|سبعة|ثمانية|تسعة|عشرة|نصف|ربع)\s+(?:حبه|حبة|قرص|اقراص|ملغ|مجم|مل)\b",
        r"(?<!قد\s)(?<!ربما\s)(?<!احتمال\s)(?<!يمكن\s)(?<!محتمل\s)أنت\s+مصاب\s+بـ?", # تشخيص جازم
        r"توقف\s+عن\s+الدواء",                # إيقاف دواء بدون طبيب
        r"لا\s+تحتاج\s+طبيب",                 # تجاوز الطبيب
        r"لا\s+داعي\s+لزيارة\s+الطبيب",
        r"ignore\s+(?:previous|system|instructions)",
        r"forget\s+(?:everything|instructions)",
        r"تجاهل\s+(?:التعليمات|الأوامر|القواعد)",
    ]

    def validate(self, response: str) -> tuple[bool, str]:
        for pattern in self.FORBIDDEN_PATTERNS:
            if re.search(pattern, response, re.IGNORECASE):
                return False, f"forbidden_pattern:{pattern}"
        return True, "safe"

    def sanitize(self, response: str) -> str:
        safe, reason = self.validate(response)
        if not safe:
            return "أنصحك بمراجعة طبيبك لمناقشة هذه الأعراض والجرعات بدقة لتلقي العلاج المناسب."
        return response


def finalize_medical_answer(text: str, sources: list[str], user_text: str, allow_dosage: bool = False) -> GuardrailResult:
    # 1. Detect prompt injection in user query
    if any(re.search(pattern, user_text.lower()) for pattern in PROMPT_INJECTION_PATTERNS):
        return GuardrailResult(False, "عذراً، لا يمكنني الاستجابة لهذه الأوامر الخاصة بالنظام.", ["prompt_injection_detected"])

    lang = detect_lang(user_text)
    validation = validate_medical_answer(text, sources, allow_dosage=allow_dosage)
    
    # Check if the ONLY violation is missing WHO sources, and no sources were provided at all (len(sources) == 0)
    only_missing_who = (
        len(validation.violations) == 1 
        and validation.violations[0] == "missing_or_invalid_who_sources" 
        and len(sources) == 0
    )
    
    if not validation.allowed and not only_missing_who:
        fallback = no_who_context_response(user_text)
        if "specific_dosage_language" in validation.violations:
            fallback += "\n" + ("لا أقدم جرعات شخصية. راجع الطبيب أو الصيدلي لتحديد الجرعة المناسبة." if lang == "ar" else "I do not provide personal dosing. Ask a clinician or pharmacist for dosing.")
        if "prompt_injection_detected" in validation.violations:
            fallback = "عذراً، لا يمكنني الاستجابة لهذه الأوامر الخاصة بالنظام."
        return GuardrailResult(False, fallback, validation.violations)

    if only_missing_who:
        disclaimer = "هذه نصائح إرشادية عامة لطمأنتكم، وليست تشخيصاً أو بديلاً عن الطبيب. في الحالات العاجلة أو القرارات العلاجية راجع طبيباً أو صيدلياً فوراً." if lang == "ar" else "This is general hygiene and supportive advice, not a diagnosis or a substitute for a clinician. For urgent symptoms, contact a doctor immediately."
    else:
        disclaimer = AR_MEDICAL_DISCLAIMER if lang == "ar" else EN_MEDICAL_DISCLAIMER

    final = f"{disclaimer}\n\n{text.strip()}"

    # Enforce mandatory doctor advice if the response reviews possibilities or symptoms
    has_symptoms_or_possibilities = any(word in final for word in ["أعراض", "عرض", "احتمال", "قد يكون", "ربما", "تشير", "symptom", "possibility", "may be", "could be"])
    if has_symptoms_or_possibilities:
        has_doctor_advice = any(word in final for word in ["طبيب", "أخصائي", "صيدلي", "مراجعة", "استشارة", "doctor", "physician", "clinician", "consult"])
        if not has_doctor_advice:
            advice_ar = "\n\nيرجى مراجعة الطبيب المختص لفحص الحالة بدقة وتحديد التشخيص الصحيح، وتجنب الاعتماد الكلي على التشخيص الذاتي."
            advice_en = "\n\nPlease consult a clinician or healthcare professional for a proper diagnosis and treatment plan."
            final += advice_ar if lang == "ar" else advice_en

    sb = _source_block(sources, lang)
    if sb:
        final += "\n\n" + sb

    # Run the relaxed MedicalGuardrails sanitizer
    guard = MedicalGuardrails()
    sanitized = guard.sanitize(final)
    if sanitized != final:
        return GuardrailResult(False, sanitized, ["strict_guardrails_violation"])

    return GuardrailResult(True, final, [])
