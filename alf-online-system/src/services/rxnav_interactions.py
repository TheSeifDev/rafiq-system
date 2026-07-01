"""
rxnav_interactions.py — NIH RxNav Drug Interaction Lookup for Rafiq.

Uses the free, public RxNav REST API (https://rxnav.nlm.nih.gov/) to:
1. Map drug names to RxCUI identifiers.
2. Retrieve known drug-drug interactions from the NIH interaction database.

This module does NOT require an API key. It is fully asynchronous and non-blocking
(uses aiohttp) to avoid freezing Rafiq's event loop.

Design decisions
-----------------
* We query **RxNorm** first to map an Arabic or English drug name to one or
  more RxCUI codes. If the user provides an Arabic brand name that RxNorm
  does not know, we silently fall back to the local ``drug_interactions.json``
  (the caller handles this).
* We then query the **Interaction API** for pairs of RxCUI codes.
* Results are returned as simple dataclasses so the caller can format them
  for the user or send them to the LLM for Arabic summarisation.
* All network calls have a maximum timeout of 2.5 seconds.
* Try/except handles NIH server failure, status errors, or timeouts by falling
  back to the local database immediately to avoid disrupting the agent.
"""
from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass, field
from urllib.parse import quote_plus
import aiohttp
import asyncio

log = logging.getLogger(__name__)

RXNORM_BASE = "https://rxnav.nlm.nih.gov/REST"
INTERACTION_BASE = "https://rxnav.nlm.nih.gov/REST/interaction"
USER_AGENT = "RafiqMedicalAssistant/4.2 (+https://rxnav.nlm.nih.gov)"
DEFAULT_TIMEOUT = 2.5

# Common Arabic drug name → English generic name mapping for RxCUI lookup.
# This assists when the user speaks Arabic brand/colloquial names.
_ARABIC_DRUG_NAMES: dict[str, str] = {
    "بنادول": "paracetamol",
    "باراسيتامول": "paracetamol",
    "باراسيتمول": "paracetamol",
    "ادفيل": "ibuprofen",
    "بروفين": "ibuprofen",
    "ابوبروفين": "ibuprofen",
    "اسبرين": "aspirin",
    "أسبرين": "aspirin",
    "اموكسيل": "amoxicillin",
    "أموكسيسيلين": "amoxicillin",
    "وارفارين": "warfarin",
    "كونكور": "bisoprolol",
    "ميتفورمين": "metformin",
    "جلوكوفاج": "metformin",
    "اوميبرازول": "omeprazole",
    "لوسيك": "omeprazole",
    "أتورفاستاتين": "atorvastatin",
    "ليبيتور": "atorvastatin",
    "أملوديبين": "amlodipine",
    "نورفاسك": "amlodipine",
    "سيتالوبرام": "citalopram",
    "سيبرالكس": "escitalopram",
    "زيرتك": "cetirizine",
    "فنتولين": "salbutamol",
    "انسولين": "insulin",
    "الانسولين": "insulin",
    "فيتامين": "vitamin",
}


@dataclass(frozen=True)
class RxCUI:
    """A single RxNorm concept (drug)."""
    rxcui: str
    name: str


@dataclass(frozen=True)
class RxInteraction:
    """A single drug-drug interaction returned by RxNav or Local DB."""
    drug_a: str
    drug_b: str
    description: str
    severity: str  # e.g. "high", "N/A", "medium"
    source: str  # e.g. "DrugBank", "ONCHigh", "LocalDB"


@dataclass
class RxNavResult:
    """Aggregated result of an RxNav interaction lookup."""
    query_drug: str
    existing_drugs: list[str]
    interactions: list[RxInteraction] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    rxcui_map: dict[str, list[RxCUI]] = field(default_factory=dict)

    @property
    def found(self) -> bool:
        return bool(self.interactions)

    def warnings_ar(self) -> list[str]:
        """Return Arabic-formatted warning strings for the user."""
        warnings: list[str] = []
        for ix in self.interactions:
            severity_ar = {
                "high": "خطير",
                "medium": "متوسط",
                "low": "خفيف",
                "N/A": "مهم",
            }.get(ix.severity.lower(), ix.severity or "مهم")
            warnings.append(
                f"تحذير {severity_ar} ({ix.source}): تداخل بين {ix.drug_a} و{ix.drug_b}. "
                f"{ix.description}"
            )
        return warnings


def _normalize_drug_name(name: str) -> str:
    """Map Arabic drug names to English generics for RxCUI lookup."""
    cleaned = name.strip().lower()
    # Try direct Arabic mapping first
    for arabic, english in _ARABIC_DRUG_NAMES.items():
        if arabic in cleaned or cleaned in arabic:
            return english
    # Remove common Arabic noise words
    cleaned = re.sub(r"^(?:دواء|حبة|حبوب|علاج|قرص)\s+", "", cleaned)
    return cleaned


async def _fetch_json(url: str, timeout: float = DEFAULT_TIMEOUT) -> dict:
    """Fetch JSON from a URL asynchronously, raising an exception on status error or network failure."""
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    client_timeout = aiohttp.ClientTimeout(total=timeout)
    async with aiohttp.ClientSession(timeout=client_timeout) as session:
        async with session.get(url, headers=headers) as resp:
            if resp.status == 200:
                data = await resp.read()
                return json.loads(data.decode("utf-8", errors="ignore"))
            else:
                raise RuntimeError(f"RxNav API status code error {resp.status} for {url}")


async def lookup_rxcui(drug_name: str, timeout: float = DEFAULT_TIMEOUT) -> list[RxCUI]:
    """
    Map a drug name (English or Arabic) to RxCUI codes using the RxNorm API asynchronously.

    Returns a list of matching RxCUI entries (may be empty if not found).
    """
    normalized = _normalize_drug_name(drug_name)
    if not normalized:
        return []

    # Try approximate match first (more forgiving)
    url = f"{RXNORM_BASE}/approximateTerm.json?term={quote_plus(normalized)}&maxEntries=3"
    results: list[RxCUI] = []
    try:
        data = await _fetch_json(url, timeout=timeout)
        if data:
            candidates = data.get("approximateGroup", {}).get("candidate", [])
            for candidate in candidates:
                rxcui = candidate.get("rxcui", "")
                name = candidate.get("name", "") or normalized
                if rxcui:
                    results.append(RxCUI(rxcui=rxcui, name=name))
    except Exception as e:
        log.warning("approximateTerm lookup failed: %s. Trying exact match...", e)

    if results:
        return results

    # Fallback to exact search
    url = f"{RXNORM_BASE}/rxcui.json?name={quote_plus(normalized)}&search=1"
    data = await _fetch_json(url, timeout=timeout)
    if data:
        id_group = data.get("idGroup", {})
        rxcui_list = id_group.get("rxnormId", [])
        for rxcui in rxcui_list:
            results.append(RxCUI(rxcui=rxcui, name=id_group.get("name", normalized)))

    return results


async def check_interactions(
    rxcui_list: list[str],
    timeout: float = DEFAULT_TIMEOUT,
) -> list[RxInteraction]:
    """
    Check drug-drug interactions for a list of RxCUI codes asynchronously.

    Uses the RxNav interaction API endpoint:
    https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=RXCUI1+RXCUI2
    """
    if len(rxcui_list) < 2:
        return []

    rxcuis_param = "+".join(rxcui_list)
    url = f"{INTERACTION_BASE}/list.json?rxcuis={rxcuis_param}"
    data = await _fetch_json(url, timeout=timeout)
    if not data:
        return []

    interactions: list[RxInteraction] = []
    for group in data.get("fullInteractionTypeGroup", []):
        source = group.get("sourceName", "Unknown")
        for ix_type in group.get("fullInteractionType", []):
            pairs = ix_type.get("interactionPair", [])
            for pair in pairs:
                desc = pair.get("description", "")
                severity = pair.get("severity", "N/A")
                concepts = pair.get("interactionConcept", [])
                drug_names = []
                for concept in concepts:
                    min_concept = concept.get("minConceptItem", {})
                    drug_names.append(min_concept.get("name", "Unknown"))
                if len(drug_names) >= 2:
                    interactions.append(
                        RxInteraction(
                            drug_a=drug_names[0],
                            drug_b=drug_names[1],
                            description=desc[:500],
                            severity=severity,
                            source=source,
                        )
                    )
    return interactions


def check_local_interactions(new_drug: str, existing_drugs: list[str]) -> RxNavResult:
    """
    Query the local drug_interactions.json database as a fast fallback.
    """
    result = RxNavResult(query_drug=new_drug, existing_drugs=list(existing_drugs))
    
    try:
        new_canon = INTERACTION_CHECKER.canonical(new_drug)
        existing_canons = {INTERACTION_CHECKER.canonical(med): med for med in existing_drugs if med}
        
        local_ix_list = []
        for item in INTERACTION_CHECKER.interactions:
            drugs = [INTERACTION_CHECKER.canonical(d) for d in item.get("drugs", [])]
            if len(drugs) != 2:
                continue
            if new_canon in drugs:
                other_canon = drugs[1] if drugs[0] == new_canon else drugs[0]
                if other_canon in existing_canons:
                    orig_existing_name = existing_canons[other_canon]
                    severity = item.get("severity", "N/A")
                    desc = item.get("message_ar") or item.get("message", "")
                    local_ix_list.append(
                        RxInteraction(
                            drug_a=new_drug,
                            drug_b=orig_existing_name,
                            description=desc,
                            severity=severity,
                            source="LocalDB"
                        )
                    )
        result.interactions = local_ix_list
    except Exception as e:
        log.error("Failed to query local drug interactions: %s", e)
        result.errors.append(f"Local DB query failed: {e}")
        
    return result


async def check_drug_interactions(
    new_drug: str,
    existing_drugs: list[str],
    timeout: float = DEFAULT_TIMEOUT,
) -> RxNavResult:
    """
    High-level function: check if ``new_drug`` interacts with any drug in
    ``existing_drugs`` using the NIH RxNav API.

    Returns an ``RxNavResult`` with all found interactions and any errors.
    Automatically falls back to local database query if connection/API fails.
    """
    try:
        # Step 1: Resolve RxCUI for the new drug
        new_cuis = await lookup_rxcui(new_drug, timeout=timeout)
        if not new_cuis:
            # Fall back to local check if RxNorm can't map the drug name (e.g. Arabic brand name)
            local_res = check_local_interactions(new_drug, existing_drugs)
            if local_res.interactions:
                return local_res
            result = RxNavResult(query_drug=new_drug, existing_drugs=list(existing_drugs))
            result.errors.append(f"Could not find RxCUI for '{new_drug}'")
            return result

        result = RxNavResult(query_drug=new_drug, existing_drugs=list(existing_drugs))
        result.rxcui_map[new_drug] = new_cuis

        # Step 2: Resolve RxCUI for each existing drug
        all_cuis: list[str] = [cui.rxcui for cui in new_cuis]
        for drug in existing_drugs:
            if not drug or not drug.strip():
                continue
            cuis = await lookup_rxcui(drug, timeout=timeout)
            if cuis:
                result.rxcui_map[drug] = cuis
                all_cuis.extend(cui.rxcui for cui in cuis)
            else:
                result.errors.append(f"Could not find RxCUI for '{drug}'")

        # Step 3: Deduplicate and check interactions
        unique_cuis = list(dict.fromkeys(all_cuis))  # preserve order, remove dupes
        if len(unique_cuis) < 2:
            return result

        interactions = await check_interactions(unique_cuis, timeout=timeout)
        result.interactions = interactions
        return result

    except Exception as e:
        log.warning("NIH RxNav server connection failed, falling back to local JSON database: %s", e)
        return check_local_interactions(new_drug, existing_drugs)


from src.utils.helpers import tokenize
from src.config.settings import DRUG_INTERACTIONS_FILE

class DrugInteractionChecker:
    def __init__(self, path: Path):
        self.path = path
        self.aliases: dict[str, list[str]] = {}
        self.interactions: list[dict[str, Any]] = []
        self.load()

    def load(self):
        try:
            if not self.path.exists():
                log.warning("drug_interactions.json غير موجود؛ سيتم تخطي فحص التعارضات.")
                return
            data = json.loads(self.path.read_text(encoding="utf-8"))
            self.aliases = data.get("aliases", {})
            self.interactions = data.get("interactions", [])
        except Exception as e:
            log.error(f"load drug interactions: {e}")

    def canonical(self, med_name: str) -> str:
        cleaned = " ".join(tokenize(med_name))
        for canon, aliases in self.aliases.items():
            values = [canon, *aliases]
            if any(" ".join(tokenize(v)) in cleaned or cleaned in " ".join(tokenize(v)) for v in values):
                return canon
        return cleaned

    def check(self, new_med: str, existing_meds: list[str]) -> list[str]:
        new_canon = self.canonical(new_med)
        existing = {self.canonical(m) for m in existing_meds if m}
        warnings: list[str] = []
        for item in self.interactions:
            drugs = [self.canonical(d) for d in item.get("drugs", [])]
            if len(drugs) != 2:
                continue
            if new_canon in drugs and any(other in existing for other in drugs if other != new_canon):
                severity = item.get("severity_ar") or item.get("severity", "مهم")
                msg = item.get("message_ar") or item.get("message", "")
                warnings.append(f"تحذير {severity}: {msg}")
        return warnings


INTERACTION_CHECKER = DrugInteractionChecker(DRUG_INTERACTIONS_FILE)
