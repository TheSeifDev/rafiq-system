"""
Rafiq v4.0 — Medical NLP Pipeline
Provides medical term normalization, medication detection, and negations.
Includes optional integration with scispaCy/medspaCy, falling back to regex + dictionary.
"""
import re
import logging

log = logging.getLogger("rafiq.nlp")

# Pre-defined colloquial-to-formal Arabic medical mapping
AR_COLLOQUIAL_MAP = {
    "سكر": "داء السكري",
    "ضغط": "ارتفاع ضغط الدم",
    "كلسترول": "ارتفاع الكوليسترول في الدم",
    "كوليسترول": "ارتفاع الكوليسترول في الدم",
    "جلطة": "احتشاء عضلة القلب / جلطة دموية",
    "ربو": "مرض الربو الشعبي",
    "حساسية": "رد فعل تحسسي",
    "قولون": "متلازمة القولون العصبي",
    "روماتيزم": "التهاب المفاصل الروماتويدي",
}

# Arabic-to-English Drug Name mapping for interaction checks and indexing
AR_DRUG_MAP = {
    "بنادول": "paracetamol",
    "بروفين": "ibuprofen",
    "أسبرين": "aspirin",
    "أسبيرين": "aspirin",
    "أوجمنتين": "augmentin",
    "أموكسيسيلين": "amoxicillin",
    "وارفارين": "warfarin",
    "كومادين": "warfarin",
    "سيلدينافيل": "sildenafil",
    "فياجرا": "sildenafil",
    "نيتروجليسرين": "nitroglycerin",
    "ميتفورمين": "metformin",
    "جلوكوفاج": "metformin",
    "أنسولين": "insulin",
    "ليبيتور": "atorvastatin",
    "أتورفاستاتين": "atorvastatin",
    "لوسارتان": "losartan",
    "كوزار": "losartan",
}

# Optional SpaCy imports
HAS_SCISPACY = False
_NLP_EN = None

try:
    import spacy
    import scispacy
    try:
        # Load the medium biomedical disease + chemical model
        _NLP_EN = spacy.load("en_ner_bc5cdr_md")
        HAS_SCISPACY = True
        log.info("scispaCy (en_ner_bc5cdr_md) successfully loaded.")
    except OSError:
        log.warning("scispaCy model 'en_ner_bc5cdr_md' not found. Run: pip install https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/releases/v0.5.4/en_ner_bc5cdr_md-0.5.4.tar.gz")
except ImportError:
    pass

HAS_MEDSPACY = False
_NLP_CLINICAL = None

try:
    import medspacy
    try:
        _NLP_CLINICAL = medspacy.load()
        HAS_MEDSPACY = True
        log.info("medspaCy clinical pipeline loaded successfully.")
    except Exception as e:
        log.warning(f"medspaCy loaded but pipeline failed to build: {e}")
except ImportError:
    pass


class MedicalTextProcessor:
    """Handles Arabic and English clinical terms and extracts entities."""
    
    def normalize_arabic_medical(self, text: str) -> str:
        """Translates colloquial Arabic medical terms into standardized terminology, preserving prefixes."""
        normalized = text
        for colloquial, formal in AR_COLLOQUIAL_MAP.items():
            # Unicode-safe boundary matching handling common Arabic prefixes (و, ال, وال, إلخ)
            pattern = rf"(?<![\u0600-\u06FF\w])(ال|و|وال|ب|وب|ف|وف)?{colloquial}(?![\u0600-\u06FF\w])"
            normalized = re.sub(pattern, lambda m: (m.group(1) or "") + formal, normalized)
        return normalized

    def extract_entities(self, text: str) -> dict:
        """
        Extracts diseases, drugs, and symptoms.
        Combines dictionary/regex mapping (for Arabic/English) and optionally scispaCy.
        """
        results = {
            "diseases": [],
            "drugs": [],
            "symptoms": []
        }
        
        # 1. Dictionary-based extraction (for Arabic and common English brands)
        lower_text = text.lower()
        for ar_name, en_name in AR_DRUG_MAP.items():
            if ar_name in text or en_name in lower_text:
                if en_name not in results["drugs"]:
                    results["drugs"].append(en_name)

        # 2. scispaCy ML-based extraction if available
        if HAS_SCISPACY and _NLP_EN:
            try:
                doc = _NLP_EN(text)
                for ent in doc.ents:
                    if ent.label_ == "DISEASE" and ent.text.lower() not in results["diseases"]:
                        results["diseases"].append(ent.text)
                    elif ent.label_ == "CHEMICAL" and ent.text.lower() not in results["drugs"]:
                        results["drugs"].append(ent.text)
            except Exception as e:
                log.error(f"scispaCy extraction failed: {e}")

        # 3. Basic Symptom extraction rules (Arabic and English)
        symptom_keywords = ["كحة", "صداع", "حمى", "سخونة", "ترجيع", "غثيان", "إسهال", "ألم", "fever", "cough", "headache", "nausea", "pain"]
        for key in symptom_keywords:
            if key in lower_text:
                results["symptoms"].append(key)

        return results

    def check_negation(self, text: str) -> list[dict]:
        """
        Detects negated medical terms (e.g. 'no diabetes', 'patient denies pain').
        Uses medspaCy if available, otherwise falls back to a simple rule-based checker.
        """
        negations = []
        
        # 1. medspaCy Negation Detection
        if HAS_MEDSPACY and _NLP_CLINICAL:
            try:
                doc = _NLP_CLINICAL(text)
                for ent in doc.ents:
                    negations.append({
                        "text": ent.text,
                        "label": ent.label_,
                        "negated": ent._.is_negated
                    })
                return negations
            except Exception as e:
                log.error(f"medspaCy negation check failed: {e}")

        # 2. Basic rule-based fallback for Negation Detection
        # Check for negation words preceding common medical terms
        negation_signals = ["لا يوجد", "ليس لديه", "بدون", "لا يعاني", "no", "without", "denies", "neg", "negative for"]
        entities = self.extract_entities(text)
        all_ents = entities["diseases"] + entities["drugs"] + entities["symptoms"]
        
        for ent in all_ents:
            # Check if any negation signal is within 3 words before the entity
            pattern = rf"(?:{'|'.join(negation_signals)})\s+(?:\w+\s+){{0,2}}{re.escape(ent)}"
            negated = bool(re.search(pattern, text, re.IGNORECASE))
            negations.append({
                "text": ent,
                "label": "ENTITY",
                "negated": negated
            })
            
        return negations
