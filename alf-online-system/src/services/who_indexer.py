from __future__ import annotations
from src.services import trusted_web as tw

def seed_sources() -> list[dict[str, str]]:
    """Returns a list of dictionaries, each containing 'title' and 'url' for WHO health topics."""
    sources = []
    for alias, (title, url) in tw._WHO_TOPIC_ALIASES.items():
        sources.append({"title": title, "url": url})
    return sources

def validate_sources(sources: list[dict[str, str]]) -> list[str]:
    """Validates that all sources have allowed medical URLs and are secure HTTPS links."""
    errors = []
    for source in sources:
        url = source.get("url", "")
        if not url:
            errors.append(f"Missing URL in source: {source}")
            continue
        if not tw.is_allowed_medical_url(url):
            errors.append(f"Disallowed medical URL: {url}")
    return errors
