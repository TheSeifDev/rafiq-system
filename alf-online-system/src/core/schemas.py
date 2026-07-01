import re
import logging
from pydantic import BaseModel, Field
from typing import List, Literal
from src.utils.beta_telemetry import record_structured_output

log = logging.getLogger("rafiq.schemas")

# Metrics Registry for Structured Outputs
STRUCTURED_OUTPUT_METRICS = {
    "validation_success_count": 0,
    "validation_failure_count": 0,
    "fallback_usage_count": 0
}

def get_validation_metrics() -> dict:
    success = STRUCTURED_OUTPUT_METRICS["validation_success_count"]
    failure = STRUCTURED_OUTPUT_METRICS["validation_failure_count"]
    total = success + failure
    return {
        "validation_success_count": success,
        "validation_failure_count": failure,
        "fallback_usage_count": STRUCTURED_OUTPUT_METRICS["fallback_usage_count"],
        "validation_success_rate": success / total if total > 0 else 1.0,
        "validation_failure_rate": failure / total if total > 0 else 0.0
    }

class MemoryFact(BaseModel):
    category: Literal["personal", "medical", "preference", "mood"]
    key: str = Field(..., min_length=1)
    value: str = Field(..., min_length=1)

class MemoryFactList(BaseModel):
    facts: List[MemoryFact]

class MedicationIntent(BaseModel):
    med_name: str = ""
    condition: str = ""
    dose: str = ""
    time_str: str = ""
    food_relation: Literal["before", "after", "with", "before_meal", "after_meal", "with_meal", "none"] = "none"
    supply_info: str = ""

class ReminderIntent(BaseModel):
    title: str = ""
    time_str: str = ""
    details: str = ""


def parse_memory_facts(resp: str) -> dict | None:
    from src.config.settings import ENABLE_STRUCTURED_OUTPUTS
    from src.utils.helpers import extract_json_from_text
    
    if ENABLE_STRUCTURED_OUTPUTS:
        try:
            cleaned = resp.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                cleaned = match.group(0)
                
            model = MemoryFactList.model_validate_json(cleaned)
            STRUCTURED_OUTPUT_METRICS["validation_success_count"] += 1
            record_structured_output(success=True, fallback_used=False)
            return model.model_dump()
        except Exception as e:
            STRUCTURED_OUTPUT_METRICS["validation_failure_count"] += 1
            STRUCTURED_OUTPUT_METRICS["fallback_usage_count"] += 1
            record_structured_output(success=False, fallback_used=True)
            log.warning(f"MemoryFactList Pydantic validation failed: {e}. Falling back to regex parser.")
            
    res = extract_json_from_text(resp)
    if not ENABLE_STRUCTURED_OUTPUTS:
        # If disabled, we still check if we extracted successfully via regex
        record_structured_output(success=res is not None, fallback_used=True)
    return res


def parse_medication_intent(resp: str) -> dict | None:
    from src.config.settings import ENABLE_STRUCTURED_OUTPUTS
    from src.utils.helpers import extract_json_from_text
    
    if ENABLE_STRUCTURED_OUTPUTS:
        try:
            cleaned = resp.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                cleaned = match.group(0)
                
            model = MedicationIntent.model_validate_json(cleaned)
            STRUCTURED_OUTPUT_METRICS["validation_success_count"] += 1
            record_structured_output(success=True, fallback_used=False)
            return model.model_dump()
        except Exception as e:
            STRUCTURED_OUTPUT_METRICS["validation_failure_count"] += 1
            STRUCTURED_OUTPUT_METRICS["fallback_usage_count"] += 1
            record_structured_output(success=False, fallback_used=True)
            log.warning(f"MedicationIntent Pydantic validation failed: {e}. Falling back to regex parser.")
            
    res = extract_json_from_text(resp)
    if not ENABLE_STRUCTURED_OUTPUTS:
        record_structured_output(success=res is not None, fallback_used=True)
    return res


def parse_reminder_intent(resp: str) -> dict | None:
    from src.config.settings import ENABLE_STRUCTURED_OUTPUTS
    from src.utils.helpers import extract_json_from_text
    
    if ENABLE_STRUCTURED_OUTPUTS:
        try:
            cleaned = resp.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                cleaned = match.group(0)
                
            model = ReminderIntent.model_validate_json(cleaned)
            STRUCTURED_OUTPUT_METRICS["validation_success_count"] += 1
            record_structured_output(success=True, fallback_used=False)
            return model.model_dump()
        except Exception as e:
            STRUCTURED_OUTPUT_METRICS["validation_failure_count"] += 1
            STRUCTURED_OUTPUT_METRICS["fallback_usage_count"] += 1
            record_structured_output(success=False, fallback_used=True)
            log.warning(f"ReminderIntent Pydantic validation failed: {e}. Falling back to regex parser.")
            
    res = extract_json_from_text(resp)
    if not ENABLE_STRUCTURED_OUTPUTS:
        record_structured_output(success=res is not None, fallback_used=True)
    return res
