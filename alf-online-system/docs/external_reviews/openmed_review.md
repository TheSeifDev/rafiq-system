# 🏥 External Architecture Review: OpenMed

## strengths
* **On-Device Clinical NER**: Zero-shot clinical Named Entity Recognition (NER) for diseases and medications running fully offline.
* **HIPAA Safe Harbor 18 De-identification**: Formidable PII de-identification covering all 18 identifiers with format-preserving fakes.
* **MLX Apple Silicon Optimization**: Native performance acceleration for Apple devices.

## weaknesses
* **High Hardware Overhead**: Local transformer models require significant CPU/GPU resources, which is problematic for low-end home care PCs.
* **Limited Reasoning Capability**: Completely offline local models (under 8B parameters) perform worse than cloud APIs on complex psychological or medical queries.
* **Platform Constraints**: Strong optimization for Apple macOS/iOS, making cross-platform Windows/Linux deployments challenging.

## ideas worth stealing
* **Safe Harbor 18 PII Regex Patterns**: Expand Rafiq's regex rules in `privacy.py` with OpenMed's robust checks. `[SAFE_TO_ADOPT]`
* **Lightweight Local NER Checks**: Extracting medical concepts (disease/medication) locally to pass to `RxNav` before LLM calls. `[ADAPT_REQUIRED]`

## components worth replacing
* None. (Rafiq preserves Cloud-AI First for complex reasoning; full local LLM is out of scope).

## components worth adapting
* **PII Pseudonymization Logic**: Adapt OpenMed's format-preserving fake data generation (e.g. realistic fake names/addresses) to replace simple bracket placeholders. `[ADAPT_REQUIRED]`

## patterns worth adopting
* **Local Pre-processing for Safety**: Performing local NER checks to feed safety databases (like RxNav) *before* sending pseudonymized prompts to the cloud. `[SAFE_TO_ADOPT]`

## anti-patterns to avoid
* **Hardware Lock-in**: Relying heavily on hardware-specific acceleration (like MLX) which breaks Windows compatibility. `[NOT_RECOMMENDED]`