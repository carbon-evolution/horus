"""Categorize + score existing news items (deterministic). Reads the `news`
dataset any prior source wrote, tags each item with a taxonomy category, a
numeric impactScore/riskLevel/confidence, a geo hint and related tracked
companies, and writes the enriched `news` back. Pure enrichment (no new fetch).

Uses `impactScore` (0-100) for the new numeric signal so the existing string
`impact` (RiskLevel) that the news feed already renders is left intact."""
import re
from real_loader import read_dataset

# Ordered (first match wins): specific/high-signal categories before generic.
TAXONOMY = [
    ("cyber-attack", ["ransomware", "breach", "hacked", "cyberattack", "cyber attack", "malware", "zero-day", "data leak"]),
    ("export-restriction", ["export control", "export ban", "sanction", "entity list", "restrict export"]),
    ("m&a", ["acquire", "acquisition", "merger", "buyout", "takeover", "to buy"]),
    ("factory-shutdown", ["shutdown", "halt production", "closes plant", "idle", "output cut"]),
    ("factory-expansion", ["expansion", "new fab", "new plant", "breaks ground", "capacity boost", "invest"]),
    ("disaster", ["earthquake", "flood", "wildfire", "hurricane", "typhoon", "tsunami", "volcano"]),
    ("labor-strike", ["strike", "walkout", "union", "labor dispute", "layoff"]),
    ("lawsuit", ["lawsuit", "sues", "settlement", "antitrust", "court"]),
    ("regulatory", ["regulation", "regulator", "fine", "probe", "investigation", "compliance"]),
    ("environmental", ["emissions", "pollution", "spill", "contamination"]),
    ("geopolitical", ["tariff", "trade war", "military", "conflict", "border"]),
    ("shortage", ["shortage", "supply crunch", "bottleneck", "constraint"]),
    ("exec-change", ["ceo", "resign", "steps down", "appoints", "new chief"]),
    ("product-launch", ["launch", "unveils", "announces new", "releases"]),
    ("financial", ["earnings", "revenue", "profit", "guidance", "quarterly", "dividend"]),
]
# Base impact by category (0-100) — how much a fresh event of this type matters.
CATEGORY_IMPACT = {
    "cyber-attack": 82, "export-restriction": 80, "disaster": 78, "factory-shutdown": 75,
    "geopolitical": 68, "shortage": 66, "m&a": 60, "labor-strike": 58, "regulatory": 55,
    "lawsuit": 50, "environmental": 52, "factory-expansion": 40, "exec-change": 38,
    "financial": 35, "product-launch": 30, "general": 25,
}
COUNTRIES = ["Taiwan", "China", "South Korea", "Japan", "USA", "United States",
             "Germany", "Netherlands", "India", "Vietnam", "Malaysia", "Arizona"]


def classify_news(text: str) -> tuple[str, float]:
    """(category, confidence 0..1). Confidence scales with keyword-hit count."""
    t = text.lower()
    for category, kws in TAXONOMY:
        hits = sum(1 for k in kws if k in t)
        if hits:
            return category, min(1.0, 0.55 + 0.15 * hits)
    return "general", 0.4


def _geo(text: str) -> str:
    for c in COUNTRIES:
        if c.lower() in text.lower():
            return "United States" if c in ("USA", "Arizona") else c
    return "Global"


def enrich_item(item: dict, company_names: list[str]) -> dict:
    text = " ".join(str(item.get(k, "")) for k in ("headline", "title", "summary", "company"))
    category, confidence = classify_news(text)
    impact_score = CATEGORY_IMPACT.get(category, 25)
    level = "high" if impact_score >= 70 else "medium" if impact_score >= 45 else "low"
    related = [n for n in company_names if re.search(rf"\b{re.escape(n)}\b", text, re.I)]
    out = dict(item)
    out.update({
        "category": category, "impactScore": impact_score,
        "impact": item.get("impact") or level,   # keep existing RiskLevel; fill if missing
        "confidence": round(confidence, 2), "geo": _geo(text),
        "relatedCompanies": related,
    })
    return out


def run(industry: str = "semiconductor") -> dict:
    news = read_dataset(industry, "news") or []
    names = [c["name"] for c in (read_dataset(industry, "companies") or [])]
    return {"news": [enrich_item(n, names) for n in news]}
