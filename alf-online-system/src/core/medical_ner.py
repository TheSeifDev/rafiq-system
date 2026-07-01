import logging
import os
import re

log = logging.getLogger("rafiq.ner")

# Lazy load holders
_ner_pipeline = None
_ner_loaded = False

# Local dictionaries for fallback
DISEASE_KEYWORDS = [
    "سكري", "سكر", "ضغط", "كلسترول", "كوليسترول", "جلطة", "ربو", "قولون", 
    "روماتيزم", "سرطان", "حساسية", "كورونا", "إنفلونزا"
]
DRUG_KEYWORDS = [
    "بنادول", "بروفين", "أسبرين", "أسبيرين", "أوجمنتين", "أموكسيسيلين", 
    "وارفارين", "كومادين", "سيلدينافيل", "فياجرا", "نيتروجليسرين", 
    "ميتفورمين", "جلوكوفاج", "أنسولين", "ليبيتور", "أتورفاستاتين", 
    "لوسارتان", "كوزار", "باراسيتامول", "إيبوبروفين"
]
SYMPTOM_KEYWORDS = [
    "كحة", "صداع", "حمى", "سخونة", "ترجيع", "غثيان", "إسهال", "ألم", 
    "دوخة", "تعب", "إرهاق"
]

def load_ner_model(model_name: str = "aubmindlab/bert-base-arabertv02"):
    """Lazily loads the Transformers NER pipeline, trying local cache first."""
    global _ner_pipeline, _ner_loaded
    if _ner_loaded:
        return _ner_pipeline is not None
    
    try:
        from transformers import pipeline
        log.info(f"Attempting to load local Arabic Medical NER model: {model_name}...")
        try:
            # Try to load from local cache first to avoid hanging on slow download
            _ner_pipeline = pipeline(
                "ner",
                model=model_name,
                aggregation_strategy="simple",
                local_files_only=True
            )
            _ner_loaded = True
            log.info("Arabic Medical NER model loaded from local cache.")
            return True
        except Exception:
            # If not in cache and offline mode is requested, skip download
            if os.environ.get("RAFIQ_OFFLINE", "0") == "1":
                log.warning("Offline mode active: skipping NER model download. Using local dictionary fallback.")
                _ner_loaded = True
                _ner_pipeline = None
                return False
            
            log.info("Model not found in local cache. Attempting to download from Hugging Face...")
            _ner_pipeline = pipeline(
                "ner",
                model=model_name,
                aggregation_strategy="simple"
            )
            _ner_loaded = True
            log.info("Arabic Medical NER model downloaded and loaded successfully.")
            return True
    except Exception as e:
        log.warning(f"Failed to load Hugging Face NER pipeline ({e}). Fallback to local dictionary/regex extraction.")
        _ner_loaded = True
        _ner_pipeline = None
        return False

def extract_medical_entities(text: str) -> dict:
    """
    Extracts diseases, drugs, and symptoms from Arabic medical text.
    Uses Hugging Face model if loaded, otherwise falls back to local dictionary matching.
    """
    # Attempt lazy loading (won't reload if already attempted)
    load_ner_model()
    
    results = {
        "أمراض": [],
        "أدوية": [],
        "أعراض": []
    }
    
    # 1. Local fallback extraction using Unicode word boundaries
    def extract_with_keywords(keywords, text_to_search):
        matched = []
        for kw in keywords:
            pattern = rf"(?<![\u0600-\u06FF\w])(ال|و|وال|ب|وب|ف|وف)?{re.escape(kw)}(?![\u0600-\u06FF\w])"
            if re.search(pattern, text_to_search):
                matched.append(kw)
        return matched

    results["أمراض"] = extract_with_keywords(DISEASE_KEYWORDS, text)
    results["أدوية"] = extract_with_keywords(DRUG_KEYWORDS, text)
    results["أعراض"] = extract_with_keywords(SYMPTOM_KEYWORDS, text)
    
    # 2. Try Hugging Face pipeline if it was loaded successfully
    if _ner_pipeline:
        try:
            entities = _ner_pipeline(text)
            for e in entities:
                word = e.get("word", "").strip()
                group = e.get("entity_group", "").upper()
                
                # Clean subwords (AraBERT tokenization might produce ## prefix)
                word = word.replace("##", "").strip()
                if not word or len(word) < 2:
                    continue
                
                if group in ["DISEASE", "DISEASES", "ILLNESS", "مرض", "أمراض", "B-DISEASE", "I-DISEASE"]:
                    if word not in results["أمراض"]:
                        results["أمراض"].append(word)
                elif group in ["DRUG", "DRUGS", "MEDICATION", "MEDICINE", "دواء", "أدوية", "B-DRUG", "I-DRUG"]:
                    if word not in results["أدوية"]:
                        results["أدوية"].append(word)
                elif group in ["SYMPTOM", "SYMPTOMS", "عَرَض", "أعراض", "B-SYMPTOM", "I-SYMPTOM"]:
                    if word not in results["أعراض"]:
                        results["أعراض"].append(word)
        except Exception as e:
            log.error(f"Error during Transformers NER inference: {e}")
            
    # Remove duplicates
    results["أمراض"] = list(set(results["أمراض"]))
    results["أدوية"] = list(set(results["أدوية"]))
    results["أعراض"] = list(set(results["أعراض"]))
    
    return results
