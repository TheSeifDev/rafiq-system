from __future__ import annotations

import json
import os
import re
import concurrent.futures
import hashlib
import time
from dataclasses import dataclass
from html.parser import HTMLParser
import socket
import ipaddress
from pathlib import Path
from urllib.parse import parse_qs, quote_plus, unquote, urljoin, urlparse
from urllib.request import Request, urlopen, build_opener, HTTPRedirectHandler


USER_AGENT = "RafiqMedicalAssistant/3.5 (+https://www.who.int)"
WHO_TOPIC_INDEX_URL = "https://www.who.int/health-topics"
DUCKDUCKGO_HTML_URL = "https://duckduckgo.com/html/"
DEFAULT_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60

_ARABIC_TO_WHO_TERMS = {
    # Diabetes
    "السكري": "diabetes",
    "سكر": "diabetes",
    "السكر": "diabetes",
    "سكري": "diabetes",
    "الانسولين": "diabetes",
    "انسولين": "diabetes",
    # Hypertension
    "ضغط": "hypertension",
    "الضغط": "hypertension",
    "ضغط الدم": "hypertension",
    "ارتفاع الضغط": "hypertension",
    # Mental health
    "اكتئاب": "depression",
    "الاكتئاب": "depression",
    "قلق": "mental health",
    "الصحة النفسية": "mental health",
    "نفسي": "mental health",
    "توتر": "mental health",
    # Cancer
    "سرطان": "cancer",
    "السرطان": "cancer",
    "ورم": "cancer",
    "اورام": "cancer",
    # COVID
    "كوفيد": "covid",
    "كورونا": "covid",
    # Vaccines
    "لقاح": "vaccines",
    "لقاحات": "vaccines",
    "تطعيم": "vaccines",
    "تطعيمات": "vaccines",
    # Nutrition & Obesity
    "تغذية": "nutrition",
    "سمنة": "obesity",
    "وزن": "obesity",
    "السمنة": "obesity",
    # Hepatitis
    "الكبد": "hepatitis",
    "التهاب الكبد": "hepatitis",
    "كبد": "hepatitis",
    # Infectious diseases
    "ملاريا": "malaria",
    "درن": "tuberculosis",
    "سل": "tuberculosis",
    "كوليرا": "cholera",
    "حصبة": "measles",
    "شلل الأطفال": "polio",
    "شلل الاطفال": "polio",
    "إيدز": "hiv",
    "الايدز": "hiv",
    "إيبولا": "ebola",
    "ايبولا": "ebola",
    "جدري القرود": "mpox",
    "امبوكس": "mpox",
    # Respiratory
    "ربو": "chronic respiratory diseases",
    "الربو": "chronic respiratory diseases",
    "حساسية الصدر": "chronic respiratory diseases",
    "انفلونزا": "influenza",
    "الانفلونزا": "influenza",
    "كحة": "chronic respiratory diseases",
    # Cardiovascular
    "قلب": "cardiovascular diseases",
    "النوبة القلبية": "cardiovascular diseases",
    "جلطة": "stroke",
    "الجلطة": "stroke",
    # GI
    "إسهال": "diarrhoea",
    "اسهال": "diarrhoea",
    # Tobacco
    "تدخين": "tobacco",
    "تبغ": "tobacco",
    "سجائر": "tobacco",
    # Additional common terms
    "صداع": "headache disorders",
    "الصداع": "headache disorders",
    "صرع": "epilepsy",
    "الصرع": "epilepsy",
    "انيميا": "anaemia",
    "الأنيميا": "anaemia",
    "فقر الدم": "anaemia",
    "حمى": "dengue",
    "كلى": "kidney diseases",
    "الكلى": "kidney diseases",
    "غسيل كلى": "kidney diseases",
    "حمل": "maternal health",
    "حامل": "maternal health",
    "الحمل": "maternal health",
    "ولادة": "maternal health",
    "رضاعة": "infant and young child feeding",
    "رضاعه": "infant and young child feeding",
    "حساسية": "allergies",
    "الحساسية": "allergies",
    # Gulf dialect terms
    "عوار": "pain",
    "صداع نصفي": "headache disorders",
    "حرارة": "dengue",
    "خفقان": "cardiovascular diseases",
    "بلاعيم": "influenza",
    # Levantine dialect terms
    "وجع": "pain",
    "وجع راس": "headache disorders",
    "سخرنة": "dengue",
    "رشح": "influenza",
    "ضيقة نفس": "chronic respiratory diseases",
    "كريب": "influenza",
    # Egyptian dialect terms
    "سخونية": "dengue",
    "مغص": "diarrhoea",
    "تعبان": "pain",
    "نفسيتي": "mental health",
    # Moroccan dialect terms
    "سخانة": "dengue",
    "سعال": "chronic respiratory diseases",
    "شقيقة": "headache disorders",
    "مزيار": "mental health",
    "حريق": "pain",
    "رواح": "influenza",
    # Additional expanded dialect terms
    "سخونة": "dengue",
    "لوز": "influenza",
    "اللوز": "influenza",
    "بلعوم": "influenza",
    "بلغم": "chronic respiratory diseases",
    "البلغم": "chronic respiratory diseases",
    "كولسترول": "cardiovascular diseases",
    "كلسترول": "cardiovascular diseases",
    "امساك": "diarrhoea",
    "إمساك": "diarrhoea",
}

_WHO_TOPIC_ALIASES = {
    "diabetes": ("Diseases and conditions Diabetes", "https://www.who.int/health-topics/diabetes"),
    "hypertension": ("Diseases and conditions Hypertension", "https://www.who.int/health-topics/hypertension"),
    "depression": ("Diseases and conditions Depression", "https://www.who.int/health-topics/depression"),
    "mental health": ("Health topics Mental health", "https://www.who.int/health-topics/mental-health"),
    "cancer": ("Diseases and conditions Cancer", "https://www.who.int/health-topics/cancer"),
    "covid": ("Diseases and conditions Coronavirus disease", "https://www.who.int/health-topics/coronavirus"),
    "vaccines": ("Health interventions Vaccines and immunization", "https://www.who.int/health-topics/vaccines-and-immunization"),
    "nutrition": ("Health topics Nutrition", "https://www.who.int/health-topics/nutrition"),
    "obesity": ("Diseases and conditions Obesity", "https://www.who.int/health-topics/obesity"),
    "hepatitis": ("Diseases and conditions Hepatitis", "https://www.who.int/health-topics/hepatitis"),
    "malaria": ("Diseases and conditions Malaria", "https://www.who.int/health-topics/malaria"),
    "tuberculosis": ("Diseases and conditions Tuberculosis", "https://www.who.int/health-topics/tuberculosis"),
    "chronic respiratory diseases": ("Diseases and conditions Chronic respiratory diseases", "https://www.who.int/health-topics/chronic-respiratory-diseases"),
    "cardiovascular diseases": ("Diseases and conditions Cardiovascular diseases", "https://www.who.int/health-topics/cardiovascular-diseases"),
    "stroke": ("Diseases and conditions Stroke", "https://www.who.int/health-topics/stroke"),
    "diarrhoea": ("Diseases and conditions Diarrhoea", "https://www.who.int/health-topics/diarrhoea"),
    "cholera": ("Diseases and conditions Cholera", "https://www.who.int/health-topics/cholera"),
    "measles": ("Diseases and conditions Measles", "https://www.who.int/health-topics/measles"),
    "polio": ("Diseases and conditions Poliomyelitis", "https://www.who.int/health-topics/poliomyelitis"),
    "hiv": ("Diseases and conditions HIV", "https://www.who.int/health-topics/hiv-aids"),
    "ebola": ("Diseases and conditions Ebola disease", "https://www.who.int/health-topics/ebola-disease"),
    "mpox": ("Diseases and conditions Mpox", "https://www.who.int/health-topics/mpox"),
    "tobacco": ("Health risk factors Tobacco", "https://www.who.int/health-topics/tobacco"),
    # Additional WHO health topics
    "influenza": ("Diseases and conditions Influenza", "https://www.who.int/health-topics/influenza-seasonal"),
    "headache disorders": ("Diseases and conditions Headache disorders", "https://www.who.int/health-topics/headache-disorders"),
    "epilepsy": ("Diseases and conditions Epilepsy", "https://www.who.int/health-topics/epilepsy"),
    "anaemia": ("Diseases and conditions Anaemia", "https://www.who.int/health-topics/anaemia"),
    "kidney diseases": ("Diseases and conditions Kidney diseases", "https://www.who.int/health-topics/kidney-diseases"),
    "maternal health": ("Life course Maternal health", "https://www.who.int/health-topics/maternal-health"),
    "infant and young child feeding": ("Life course Infant and young child feeding", "https://www.who.int/health-topics/infant-and-young-child-feeding"),
    "allergies": ("Diseases and conditions Allergies", "https://www.who.int/health-topics/allergies"),
    "antimicrobial resistance": ("Health topics Antimicrobial resistance", "https://www.who.int/health-topics/antimicrobial-resistance"),
    "dengue": ("Diseases and conditions Dengue and severe dengue", "https://www.who.int/health-topics/dengue-and-severe-dengue"),
    "rabies": ("Diseases and conditions Rabies", "https://www.who.int/health-topics/rabies"),
    "pain": ("Health topics Pain management", "https://www.who.int/health-topics/palliative-care"),
    # WHO News Room Fact Sheets
    "diabetes_fact_sheet": ("WHO Fact Sheets: Diabetes", "https://www.who.int/news-room/fact-sheets/detail/diabetes"),
    "hypertension_fact_sheet": ("WHO Fact Sheets: Hypertension", "https://www.who.int/news-room/fact-sheets/detail/hypertension"),
    "depression_fact_sheet": ("WHO Fact Sheets: Depression", "https://www.who.int/news-room/fact-sheets/detail/depression"),
    "cancer_fact_sheet": ("WHO Fact Sheets: Cancer", "https://www.who.int/news-room/fact-sheets/detail/cancer"),
    "obesity_fact_sheet": ("WHO Fact Sheets: Obesity", "https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight"),
    "asthma_fact_sheet": ("WHO Fact Sheets: Asthma", "https://www.who.int/news-room/fact-sheets/detail/asthma"),
    "cardiovascular_fact_sheet": ("WHO Fact Sheets: Cardiovascular diseases", "https://www.who.int/news-room/fact-sheets/detail/cardiovascular-diseases-(cvds)"),
}

_MEDICAL_KEYWORDS = {
    "abortion",
    "anaemia",
    "anxiety",
    "asthma",
    "blood",
    "cancer",
    "cholera",
    "covid",
    "depression",
    "diabetes",
    "diagnosis",
    "disease",
    "doctor",
    "dose",
    "drug",
    "health",
    "hepatitis",
    "hiv",
    "hypertension",
    "infection",
    "medicine",
    "mental",
    "obesity",
    "patient",
    "pharmacist",
    "pill",
    "pregnancy",
    "symptom",
    "symptoms",
    "therapy",
    "treatment",
    "vaccine",
    "فيروس",
    "مرض",
    "أعراض",
    "اعراض",
    "تشخيص",
    "علاج",
    "دواء",
    "ادوية",
    "أدوية",
    "جرعة",
    "طبيب",
    "صيدلي",
    "مريض",
    "صحة",
    "عدوى",
    "التهاب",
}

_WEB_SEARCH_HINTS = {
    "ابحث",
    "دور",
    "فتش",
    "بحث",
    "جوجل",
    "على النت",
    "من الانترنت",
    "internet",
    "search",
    "latest",
    "today",
    "news",
    "سعر",
    "اسعار",
    "أسعار",
    "أخبار",
    "اخبار",
    "اليوم",
    "الطقس",
    "طقس",
    "الجو",
    "حرارة",
    "الحرارة",
    "الدولار",
    "الذهب",
    "صرف",
    "عملة",
    "عملات",
    "رئيس",
    "مباراة",
    "مباريات",
    "نتائج",
    "متى",
    "من هو",
    "مين هو",
    "معلومات عن",
}


@dataclass(frozen=True)
class SearchResult:
    title: str
    url: str
    snippet: str
    source: str


@dataclass(frozen=True)
class WebContext:
    text: str
    is_medical: bool
    found: bool
    policy: str


class _LinkParser(HTMLParser):
    def __init__(self, base_url: str):
        super().__init__()
        self.base_url = base_url
        self.links: list[tuple[str, str]] = []
        self._href: str | None = None
        self._text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]):
        if tag.lower() == "a":
            self._href = dict(attrs).get("href")
            self._text = []

    def handle_data(self, data: str):
        if self._href:
            text = data.strip()
            if text:
                self._text.append(text)

    def handle_endtag(self, tag: str):
        if tag.lower() != "a" or not self._href:
            return
        title = " ".join(self._text).strip()
        if title:
            self.links.append((urljoin(self.base_url, self._href), title))
        self._href = None
        self._text = []


class _TextParser(HTMLParser):
    _skip_tags = {"script", "style", "noscript", "svg", "nav", "footer", "header"}

    def __init__(self):
        super().__init__()
        self.parts: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]):
        if tag.lower() in self._skip_tags:
            self._skip_depth += 1

    def handle_endtag(self, tag: str):
        if tag.lower() in self._skip_tags and self._skip_depth:
            self._skip_depth -= 1

    def handle_data(self, data: str):
        if self._skip_depth:
            return
        text = re.sub(r"\s+", " ", data).strip()
        if len(text) >= 3:
            self.parts.append(text)

    def text(self) -> str:
        return re.sub(r"\s+", " ", " ".join(self.parts)).strip()


def _tokens(text: str) -> set[str]:
    return set(re.findall(r"[0-9a-zA-Z\u0600-\u06FF]+", text.lower()))


def _expanded_query_tokens(query: str) -> set[str]:
    lowered = query.lower()
    extra: list[str] = []
    for arabic, english in _ARABIC_TO_WHO_TERMS.items():
        pattern = r"\b(?:ال|ب|و|ف|لل|ك)?" + re.escape(arabic) + r"(?:ي|ك|ه|ها|هم|نا|ة|ات|ين|ون)?\b"
        if re.search(pattern, lowered):
            extra.append(english)
    return _tokens(" ".join([query, *extra]))


def is_medical_query(query: str) -> bool:
    tokens = _expanded_query_tokens(query)
    if tokens & _MEDICAL_KEYWORDS:
        return True
    
    lowered = query.lower()
    for term in _ARABIC_TO_WHO_TERMS:
        pattern = r"\b(?:ال|ب|و|ف|لل|ك)?" + re.escape(term) + r"(?:ي|ك|ه|ها|هم|نا|ة|ات|ين|ون)?\b"
        if re.search(pattern, lowered):
            return True
    return False


def wants_web_search(query: str) -> bool:
    lowered = query.lower()
    return any(hint in lowered for hint in _WEB_SEARCH_HINTS)


def _configured_medical_hosts() -> set[str]:
    raw = os.environ.get("RAFIQ_MEDICAL_ALLOWED_DOMAINS", "")
    hosts = {"who.int"}
    hosts.update(item.strip().lower() for item in raw.split(",") if item.strip())
    return hosts


def is_allowed_medical_url(url: str) -> bool:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if parsed.scheme != "https":
        return False
    if host.endswith(".who.int") or host in _configured_medical_hosts():
        return True
    return False


class SafeRedirectHandler(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not is_allowed_medical_url(newurl):
            raise ValueError(f"Redirection to disallowed URL: {newurl}")
        
        parsed = urlparse(newurl)
        host = parsed.hostname
        if not host:
            raise ValueError("No hostname in redirect URL")
        
        try:
            ips = socket.getaddrinfo(host, None)
            for item in ips:
                ip = item[4][0]
                ip_obj = ipaddress.ip_address(ip)
                if (ip_obj.is_private or 
                    ip_obj.is_loopback or 
                    ip_obj.is_link_local or 
                    ip_obj.is_multicast or 
                    ip_obj.is_reserved or 
                    ip_obj.is_unspecified):
                    raise ValueError(f"Private IP resolution prohibited: {ip}")
        except Exception as e:
            raise ValueError(f"Failed to resolve redirect hostname securely: {e}")
            
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class SafePublicRedirectHandler(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        parsed = urlparse(newurl)
        if parsed.scheme not in ("http", "https"):
            raise ValueError(f"Disallowed scheme in redirect: {parsed.scheme}")
            
        host = parsed.hostname
        if not host:
            raise ValueError("No hostname in redirect URL")
            
        try:
            ips = socket.getaddrinfo(host, None)
            for item in ips:
                ip = item[4][0]
                ip_obj = ipaddress.ip_address(ip)
                if (ip_obj.is_private or 
                    ip_obj.is_loopback or 
                    ip_obj.is_link_local or 
                    ip_obj.is_multicast or 
                    ip_obj.is_reserved or 
                    ip_obj.is_unspecified):
                    raise ValueError(f"Private IP resolution prohibited in redirect: {ip}")
        except Exception as e:
            raise ValueError(f"Failed to resolve redirect hostname securely: {e}")
            
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _read_url(url: str, timeout: float, max_bytes: int = 1_000_000) -> str:
    if not is_allowed_medical_url(url):
        raise ValueError(f"Disallowed medical URL: {url}")
        
    parsed = urlparse(url)
    host = parsed.hostname
    if not host:
        raise ValueError("Invalid URL hostname")
        
    try:
        ips = socket.getaddrinfo(host, None)
        for item in ips:
            ip = item[4][0]
            ip_obj = ipaddress.ip_address(ip)
            if (ip_obj.is_private or 
                ip_obj.is_loopback or 
                ip_obj.is_link_local or 
                ip_obj.is_multicast or 
                ip_obj.is_reserved or 
                ip_obj.is_unspecified):
                raise ValueError(f"Private/Loopback IP resolution prohibited: {ip}")
    except Exception as e:
        raise ValueError(f"Failed to resolve host securely: {e}")
        
    opener = build_opener(SafeRedirectHandler())
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with opener.open(req, timeout=timeout) as response:
        data = response.read(max_bytes)
        encoding = response.headers.get_content_charset() or "utf-8"
    return data.decode(encoding, errors="ignore")


def _extract_links(html: str, base_url: str) -> list[tuple[str, str]]:
    parser = _LinkParser(base_url)
    parser.feed(html)
    return parser.links


def _extract_text(html: str) -> str:
    parser = _TextParser()
    parser.feed(html)
    return parser.text()


def _result_snippet(text: str, query: str, limit: int = 700) -> str:
    tokens = _expanded_query_tokens(query)
    sentences = re.split(r"(?<=[.!?؟])\s+", text)
    selected = [s for s in sentences if _tokens(s) & tokens]
    snippet = " ".join(selected[:4]) if selected else text[:limit]
    return re.sub(r"\s+", " ", snippet).strip()[:limit]


def _dedupe_links(links: list[tuple[str, str]]) -> list[tuple[str, str]]:
    seen: set[str] = set()
    clean: list[tuple[str, str]] = []
    for url, title in links:
        parsed = urlparse(url)
        normalized = parsed._replace(fragment="", query="").geturl()
        if normalized in seen:
            continue
        seen.add(normalized)
        clean.append((normalized, re.sub(r"\s+", " ", title).strip()))
    return clean


class TrustedMedicalWebClient:
    def __init__(self, cache_dir: Path, timeout: float = 6.0, cache_ttl_seconds: int = DEFAULT_CACHE_TTL_SECONDS):
        self.cache_dir = cache_dir
        self.timeout = timeout
        self.cache_ttl_seconds = cache_ttl_seconds
        self.cache_dir.mkdir(exist_ok=True)
        (self.cache_dir / "pages").mkdir(exist_ok=True)

    @property
    def _topic_cache_path(self) -> Path:
        return self.cache_dir / "who_health_topics.json"

    def _load_cached_topics(self) -> list[dict[str, str]] | None:
        path = self._topic_cache_path
        if not path.exists() or time.time() - path.stat().st_mtime > self.cache_ttl_seconds:
            return None
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return data if isinstance(data, list) else None
        except (OSError, json.JSONDecodeError):
            return None

    def _save_cached_topics(self, topics: list[dict[str, str]]):
        try:
            self._topic_cache_path.write_text(json.dumps(topics, ensure_ascii=False, indent=2), encoding="utf-8")
        except OSError:
            pass

    def _page_cache_path(self, url: str) -> Path:
        digest = hashlib.sha256(url.encode("utf-8")).hexdigest()
        return self.cache_dir / "pages" / f"{digest}.txt"

    def _read_page_text(self, url: str) -> str:
        path = self._page_cache_path(url)
        if path.exists() and time.time() - path.stat().st_mtime <= self.cache_ttl_seconds:
            try:
                return path.read_text(encoding="utf-8")
            except OSError:
                pass
        html = _read_url(url, timeout=self.timeout)
        text = _extract_text(html)
        try:
            path.write_text(text, encoding="utf-8")
        except OSError:
            pass
        return text

    def health_topics(self) -> list[dict[str, str]]:
        cached = self._load_cached_topics()
        if cached is not None:
            return cached
        html = _read_url(WHO_TOPIC_INDEX_URL, timeout=self.timeout)
        topics: list[dict[str, str]] = []
        for url, title in _dedupe_links(_extract_links(html, WHO_TOPIC_INDEX_URL)):
            parsed = urlparse(url)
            if not is_allowed_medical_url(url):
                continue
            if not parsed.path.startswith("/health-topics/") or parsed.path.rstrip("/") == "/health-topics":
                continue
            topics.append({"title": title, "url": url})
        self._save_cached_topics(topics)
        return topics

    def _rank_topics(self, query: str) -> list[dict[str, str]]:
        q_tokens = _expanded_query_tokens(query)
        ranked: list[dict[str, str]] = []
        seen: set[str] = set()
        for term, (title, url) in _WHO_TOPIC_ALIASES.items():
            if _tokens(term) & q_tokens and url not in seen:
                ranked.append({"title": title, "url": url})
                seen.add(url)
        if ranked:
            return ranked

        scored: list[tuple[int, dict[str, str]]] = []
        for topic in self.health_topics():
            slug = urlparse(topic["url"]).path.replace("-", " ")
            haystack = _tokens(topic["title"] + " " + slug)
            score = len(q_tokens & haystack)
            if score:
                scored.append((score, topic))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [topic for _, topic in scored]

    def search(self, query: str, max_results: int = 3) -> list[SearchResult]:
        topics = self._rank_topics(query)[:max_results]

        def fetch(topic: dict[str, str]) -> SearchResult | None:
            url = topic["url"]
            if not is_allowed_medical_url(url):
                return None
            try:
                text = self._read_page_text(url)
            except Exception:
                return None
            snippet = _result_snippet(text, query)
            return SearchResult(topic["title"], url, snippet, "WHO") if snippet else None

        results: list[SearchResult] = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(max_results, max(len(topics), 1))) as executor:
            for result in executor.map(fetch, topics):
                if result:
                    results.append(result)
        return results


def _read_public_url(url: str, timeout: float, max_bytes: int = 150_000) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"Disallowed scheme: {parsed.scheme}")
        
    host = parsed.hostname
    if not host:
        raise ValueError("Invalid URL hostname")
        
    try:
        ips = socket.getaddrinfo(host, None)
        for item in ips:
            ip = item[4][0]
            ip_obj = ipaddress.ip_address(ip)
            if (ip_obj.is_private or 
                ip_obj.is_loopback or 
                ip_obj.is_link_local or 
                ip_obj.is_multicast or 
                ip_obj.is_reserved or 
                ip_obj.is_unspecified):
                raise ValueError(f"Private/Loopback IP resolution prohibited: {ip}")
    except Exception as e:
        raise ValueError(f"Failed to resolve host securely: {e}")
        
    opener = build_opener(SafePublicRedirectHandler())
    req = Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
    )
    with opener.open(req, timeout=timeout) as response:
        data = response.read(max_bytes)
        encoding = response.headers.get_content_charset() or "utf-8"
    return data.decode(encoding, errors="ignore")


def _fetch_real_snippet(cleaned_url: str, query: str, default_snippet: str, timeout: float) -> str:
    if not cleaned_url:
        return default_snippet
    try:
        html = _read_public_url(cleaned_url, timeout=timeout, max_bytes=150000)
        text = _extract_text(html)
        snippet = _result_snippet(text, query, limit=500)
        if snippet and len(snippet.strip()) > 30:
            return snippet
    except Exception:
        pass
    return default_snippet


class GeneralWebSearchClient:
    def __init__(self, timeout: float = 6.0):
        self.timeout = timeout

    def search(self, query: str, max_results: int = 5) -> list[SearchResult]:
        if is_medical_query(query):
            raise ValueError("Medical queries must use WHO-only search.")
        
        import urllib.request
        import urllib.parse
        
        url = "https://lite.duckduckgo.com/lite/"
        data = urllib.parse.urlencode({'q': query}).encode('utf-8')
        req = urllib.request.Request(
            url, 
            data=data, 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        
        results: list[SearchResult] = []
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                html = response.read().decode('utf-8', errors='ignore')
                
            try:
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(html, 'html.parser')
                links = soup.find_all('a', class_='result-link')
                snippets = soup.find_all('td', class_='result-snippet')
                
                for i in range(min(len(links), len(snippets), max_results)):
                    title = links[i].get_text(strip=True)
                    raw_url = links[i].get('href', '')
                    cleaned_url = self._clean_duck_url(raw_url)
                    snippet = snippets[i].get_text(strip=True)
                    
                    if not cleaned_url.startswith(("http://", "https://")):
                        continue
                    if is_allowed_medical_url(cleaned_url):
                        continue
                        
                    results.append(SearchResult(title, cleaned_url, snippet, "Public web"))
            except Exception as bs_err:
                # Regex fallback
                link_matches = re.findall(r"href=['\"]([^'\"]+)['\"][^>]*class=['\"]result-link['\"][^>]*>(.*?)</a>", html, re.DOTALL)
                snippet_matches = re.findall(r"class=['\"]result-snippet['\"][^>]*>(.*?)</td>", html, re.DOTALL)
                
                for i in range(min(len(link_matches), len(snippet_matches), max_results)):
                    raw_url, title = link_matches[i]
                    cleaned_url = self._clean_duck_url(raw_url)
                    title = re.sub(r'<[^>]+>', '', title).strip()
                    snippet = re.sub(r'<[^>]+>', '', snippet_matches[i]).strip()
                    
                    if not cleaned_url.startswith(("http://", "https://")):
                        continue
                    if is_allowed_medical_url(cleaned_url):
                        continue
                        
                    results.append(SearchResult(title, cleaned_url, snippet, "Public web"))

            # Fetch destination page content in parallel to extract real context and actual numbers
            if results:
                to_fetch_count = len(results)
                with concurrent.futures.ThreadPoolExecutor(max_workers=to_fetch_count) as executor:
                    futures = {
                        executor.submit(_fetch_real_snippet, results[idx].url, query, results[idx].snippet, 4.0): idx
                        for idx in range(to_fetch_count)
                    }
                    for future in concurrent.futures.as_completed(futures):
                        idx = futures[future]
                        try:
                            real_snippet = future.result()
                            if real_snippet:
                                results[idx] = SearchResult(
                                    title=results[idx].title,
                                    url=results[idx].url,
                                    snippet=real_snippet,
                                    source=results[idx].source
                                )
                        except Exception:
                            pass

        except Exception as e:
            # Import log locally to avoid circular dependencies if any
            import logging
            logging.getLogger("rafiq.web").error(f"GeneralWebSearchClient error: {e}")
            
        return results

    @staticmethod
    def _clean_duck_url(url: str) -> str:
        parsed = urlparse(url)
        if parsed.netloc.endswith("duckduckgo.com") and parsed.path.startswith("/l/"):
            target = parse_qs(parsed.query).get("uddg", [""])[0]
            return unquote(target)
        return url


def format_web_context(results: list[SearchResult], is_medical: bool) -> str:
    if not results:
        return ""
    header = (
        "مصادر طبية موثوقة من WHO فقط. استخدم هذه المقتطفات فقط لأي معلومة طبية، ولا تستخدم الويب العام للطب."
        if is_medical
        else "نتائج بحث عامة غير طبية. لا تستخدمها لأي معلومة طبية."
    )
    lines = [header]
    for i, result in enumerate(results, start=1):
        lines.append(f"[{i}] {result.title}\nSource: {result.source}\nURL: {result.url}\nExcerpt: {result.snippet or 'لا يوجد مقتطف.'}")
    return "\n\n".join(lines)


def build_web_context(query: str, cache_dir: Path, general_search_enabled: bool = True) -> WebContext:
    if is_medical_query(query):
        results = TrustedMedicalWebClient(cache_dir=cache_dir).search(query)
        return WebContext(
            text=format_web_context(results, is_medical=True),
            is_medical=True,
            found=bool(results),
            policy="medical_who_only",
        )
    if general_search_enabled and wants_web_search(query):
        results = GeneralWebSearchClient().search(query, max_results=5)
        return WebContext(
            text=format_web_context(results, is_medical=False),
            is_medical=False,
            found=bool(results),
            policy="general_public_web",
        )
    return WebContext(text="", is_medical=False, found=False, policy="no_web_needed")
