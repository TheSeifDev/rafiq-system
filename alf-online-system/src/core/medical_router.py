from __future__ import annotations

import re
from dataclasses import dataclass, field

from src.services import trusted_web


ARABIC_DIACRITICS_RE = re.compile(r"[\u064b-\u065f\u0670]")
TATWEEL = "\u0640"

_ARABIC_NORMALIZATION = str.maketrans(
    {
        "أ": "ا",
        "إ": "ا",
        "آ": "ا",
        "ة": "ه",
        "ى": "ي",
        "ؤ": "و",
        "ئ": "ي",
    }
)

_EMERGENCY_PATTERNS = [
    r"الم\s+صدر\s+شديد",
    r"وجع\s+صدر\s+شديد",
    r"مش\s+قادر\s+اتنفس",
    r"لا\s+استطيع\s+التنفس",
    r"ضيق\s+نفس\s+شديد",
    r"نزيف\s+شديد",
    r"جرعه\s+زايده",
    r"اخدت\s+جرعه\s+زياده",
    r"فقدان\s+وعي",
    r"اغماء",
    r"شلل\s+مفاجئ",
    r"تنميل\s+نصف\s+الجسم",
    r"انتحار",
    r"عايز\s+اموت",
    r"افكار\s+انتحاريه",
    # Dialectal / Colloquial emergency additions
    r"قلبي\s+يوجعني",
    r"وجع\s+بصدري",
    r"قلبي\s+واقف",
    r"مخنوق\s+ومش\s+قادر",
    r"ضيقه\s+قويه",
    r"نزيف\s+قوي",
    r"دم\s+كتير",
    r"مغمى\s+عليه",
    r"دايخ\s+وهيغمى",
    r"مش\s+حاسس\s+بنص\s+جسمي",
    r"عايز\s+انتحر",
    r"بموت\s+نفسي",
    # English emergency terms
    r"\bchest pain\b",
    r"\bcan(?:not|'t)\s+breathe\b",
    r"\bshortness of breath\b",
    r"\bsevere bleeding\b",
    r"\boverdose\b",
    r"\bsuicid(?:e|al)\b",
    r"\bstroke\b",
    r"\bseizure\b",
    r"\bheart attack\b",
    r"\banaphylaxis\b",
    r"صدمة\s+حساسية",
    r"حساسية\s+مفرطة",
    r"تورم\s+الوجه",
    r"تورم\s+الحلق",
    r"اختناق",
    r"\bchoking\b",
    r"\bpoisoned\b",
]

_MEDICAL_INTENT_HINTS = {
    # English medical terms
    "symptom",
    "symptoms",
    "diagnosis",
    "diagnose",
    "treat",
    "treatment",
    "therapy",
    "medicine",
    "medication",
    "drug",
    "dose",
    "dosage",
    "side effect",
    "side effects",
    "contraindication",
    "interaction",
    "vaccine",
    "guideline",
    "prescription",
    "chronic",
    "acute",
    "infection",
    "inflammation",
    "allergy",
    "allergic",
    "surgery",
    "hospital",
    "clinic",
    # Standard Arabic medical terms
    "مرض",
    "اعراض",
    "عرض",
    "تشخيص",
    "علاج",
    "دواء",
    "ادويه",
    "جرعه",
    "تداخل",
    "مضاعفات",
    "طبي",
    "طبية",
    "طب",
    "لقاح",
    "تطعيم",
    "ارشادات",
    "وصفه طبيه",
    "مزمن",
    "حاد",
    "عدوى",
    "التهاب",
    "حساسيه",
    "عمليه",
    "مستشفى",
    "عياده",
    # Egyptian dialect
    "وجع",
    "بيوجعني",
    "تعبان",
    "عيان",
    "كشف",
    "دكتور",
    "روشته",
    "حبوب",
    "شراب",
    "حقنه",
    # Gulf dialect
    "عوار",
    "يعورني",
    "مريض",
    "مستوصف",
    "صيدليه",
    # Levantine dialect
    "بدي دوا",
    "عند الحكيم",
    "حكيم",
    # Moroccan dialect
    "طبيب",
    "صحتي",
    "بغيت دوا",
}

_RESEARCH_HINTS = {
    "research",
    "study",
    "paper",
    "evidence",
    "guideline",
    "systematic review",
    "trial",
    "prevalence",
    "incidence",
    "باحث",
    "بحث طبي",
    "دراسه",
    "دراسة",
    "ادله",
    "أدلة",
    "ارشادات",
    "إرشادات",
    "انتشار",
    "معدل",
}


@dataclass(frozen=True)
class RouteDecision:
    kind: str
    confidence: float
    normalized_query: str
    search_query: str
    reasons: list[str] = field(default_factory=list)
    research_mode: bool = False

    @property
    def is_medical(self) -> bool:
        return self.kind == "medical"

    @property
    def is_emergency(self) -> bool:
        return self.kind == "emergency"


def normalize_arabic(text: str) -> str:
    text = ARABIC_DIACRITICS_RE.sub("", text)
    text = text.replace(TATWEEL, "")
    return text.translate(_ARABIC_NORMALIZATION)


def normalize_query(text: str) -> str:
    text = normalize_arabic(text.lower())
    text = re.sub(r"\s+", " ", text).strip()
    return text


def is_urgent_emergency(text: str) -> bool:
    normalized = normalize_query(text)
    if any(re.search(pattern, normalized) for pattern in _EMERGENCY_PATTERNS):
        return True
    
    # Precise word-boundary regex checks for chest/heart pain
    chest_regex = r"\b(?:ال|ب|و|ف|لل)?(?:صدر|صدري|قلب|قلبي)\b"
    pain_regex = r"\b(?:ال|ب|و|ف|لل)?(?:الم|وجع|نغزه|نغزات|ضاغط|ضغط|حرقان|ثقل|وجعني|يوجعني|واقف|وقف|بيوجعني)\b"
    
    has_chest = bool(re.search(chest_regex, normalized))
    has_pain = bool(re.search(pain_regex, normalized))
    
    if has_chest and has_pain:
        return True
        
    # Dyspnea phrases (precise word boundary)
    cant_breathe_regex = r"\b(?:مش\s+قادر(?:ه)?\s+(?:اتنفس|اخذ\s+نفسي|اخد\s+نفسي)|مش\s+عارف(?:ه)?\s+(?:اتنفس|اخذ\s+نفسي|اخد\s+نفسي)|ضيق\s+نفس|ضيقه\s+نفس|كتمه|مخنوق)\b"
    if re.search(cant_breathe_regex, normalized):
        return True
        
    return False


def has_emergency_signal(text: str) -> bool:
    return is_urgent_emergency(text)

# Alias for ConvEngine to use
is_emergency = is_urgent_emergency


def is_research_mode(text: str) -> bool:
    normalized = normalize_query(text)
    return any(hint in normalized for hint in _RESEARCH_HINTS)


def is_medical_query(text: str) -> bool:
    normalized = normalize_query(text)
    if trusted_web.is_medical_query(normalized):
        return True
    return any(hint in normalized for hint in _MEDICAL_INTENT_HINTS)


def build_medical_search_query(text: str) -> str:
    normalized = normalize_query(text)
    expansions: list[str] = []
    for arabic, english in trusted_web._ARABIC_TO_WHO_TERMS.items():
        norm_arabic = normalize_query(arabic)
        pattern = r"\b(?:ال|ب|و|ف|لل|ك)?" + re.escape(norm_arabic) + r"(?:ي|ك|ه|ها|هم|na|ة|ات|ين|ون)?\b"
        if re.search(pattern, normalized):
            expansions.append(english)
    tokens = [normalized, *expansions]
    return " ".join(item for item in tokens if item).strip()


def route_query(text: str) -> RouteDecision:
    normalized = normalize_query(text)
    reasons: list[str] = []
    if is_urgent_emergency(text):
        return RouteDecision(
            kind="emergency",
            confidence=0.99,
            normalized_query=normalized,
            search_query=build_medical_search_query(normalized),
            reasons=["hard_emergency_bypass"],
            research_mode=False,
        )

    if is_medical_query(normalized):
        if trusted_web.is_medical_query(normalized):
            reasons.append("trusted_web_medical_match")
        if any(hint in normalized for hint in _MEDICAL_INTENT_HINTS):
            reasons.append("medical_intent_hint")
        return RouteDecision(
            kind="medical",
            confidence=0.92,
            normalized_query=normalized,
            search_query=build_medical_search_query(normalized),
            reasons=reasons or ["medical_default"],
            research_mode=is_research_mode(normalized),
        )

    return RouteDecision(
        kind="general",
        confidence=0.8,
        normalized_query=normalized,
        search_query=normalized,
        reasons=["no_medical_signal"],
        research_mode=False,
    )
