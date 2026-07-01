# Phase 1 SAFE Validation Metrics — Structured Outputs

## Metrics Tracking Architecture
The structured outputs migration implements a metrics tracking registry in [schemas.py](file:///c:/Users/aboha/Desktop/rafiq-system/src/core/schemas.py) which collects validation data at runtime. This allows us to observe:
* **Validation Success Rate**: The percentage of LLM responses that comply perfectly with the defined Pydantic models.
* **Validation Failure Rate**: The percentage of LLM responses that violate Pydantic models.
* **Fallback Usage Count**: The absolute number of times the system had to rely on the regex fallback parser due to model mismatch or JSON decoding errors.

$$\text{Validation Success Rate} = \frac{\text{Success Count}}{\text{Success Count} + \text{Failure Count}}$$

$$\text{Validation Failure Rate} = \frac{\text{Failure Count}}{\text{Success Count} + \text{Failure Count}}$$

---

## 📊 Test Suite Execution Metrics
The following metrics were captured immediately following the execution of the structured outputs validation suite (`tests/test_structured_outputs.py`):

| Metric | Captured Count / Value | Description |
| :--- | :--- | :--- |
| **Validation Success Count** | `6` | Successful Pydantic validations matching Pydantic models. |
| **Validation Failure Count** | `2` | Expected Pydantic validation failures (e.g. invalid category, invalid literal). |
| **Fallback Usage Count** | `2` | Number of times the system fell back to the legacy regex JSON parser. |
| **Validation Success Rate** | `75.0%` | Rate of successful schema validations relative to total validation attempts. |
| **Validation Failure Rate** | `25.0%` | Rate of schema validation failures requiring fallback. |

*Note: The 25.0% validation failure rate in the test suite is intentional and represents test assertions verifying the safety and reliability of the regex fallback parser on corrupt or non-conformant JSON data.*

---

## 🔍 Interpretation of Metrics

1. **Success Count (`6`)**: Shows that valid payloads (including markdown-enclosed JSON blocks and partial outputs with default values) are parsed and validated successfully by Pydantic.
2. **Failure Count / Fallback Count (`2`)**: Confirms that when the LLM outputs a field value violating schema constraints (e.g., an invalid food relation or a category not allowed by `Literal`), the exception is successfully caught.
3. **No-Flag Isolation**: When `RAFIQ_STRUCTURED_OUTPUTS=0` is set, Pydantic validation is bypassed, and metrics counters are not incremented, confirming clean isolation of the feature flag.
