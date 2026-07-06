"""U.S. Federal Register API -> policies (export-control / CHIPS / trade rules).
Keyless, official US-government source of record. Terms are tuned per industry so
the policy feed reflects the sector's regulatory surface. Company names appearing
in a rule's title/abstract become its `targets`."""
import re
import entities
from sources.base import get_json

API = "https://www.federalregister.gov/api/v1/documents.json"
TERM = {
    "semiconductor": "semiconductor export control OR advanced computing chips",
    "ai": "artificial intelligence export control OR advanced computing",
    "battery": "critical minerals OR EV battery OR lithium supply chain",
}
HIGH = re.compile(r"export control|restrict|prohibit|ban|entity list|sanction|tariff", re.I)
MED = re.compile(r"proposed|review|notice|comment|amend|license", re.I)


def _severity(doc: dict) -> str:
    text = f"{doc.get('title', '')} {doc.get('abstract') or ''}"
    if HIGH.search(text):
        return "high"
    return "medium" if MED.search(text) or doc.get("type") == "Proposed Rule" else "low"


def normalize_policy(doc: dict, names: list[str], idx: int) -> dict:
    text = f"{doc.get('title', '')} {doc.get('abstract') or ''}".lower()
    targets = [n for n in names if n.lower() in text]
    agencies = [a.get("name") for a in doc.get("agencies", []) if a.get("name")]
    return {
        "id": f"fr{idx}",
        "title": doc["title"][:160],
        "authority": agencies[0] if agencies else "Federal Register",
        "region": "USA",
        "date": doc.get("publication_date", ""),
        "severity": _severity(doc),
        "targets": targets[:4],
        "summary": (doc.get("abstract") or doc["title"])[:280],
    }


def run(industry: str = "semiconductor") -> dict:
    names = [e["name"] for e in entities.load(industry)]
    data = get_json(
        API, f"fedreg_{industry}",
        params={"conditions[term]": TERM.get(industry, TERM["semiconductor"]),
                "per_page": 20, "order": "newest",
                "fields[]": ["title", "publication_date", "abstract", "html_url",
                             "agencies", "type"]},
        max_age_h=12,
    )
    policies = [normalize_policy(d, names, i + 1)
                for i, d in enumerate(data.get("results", [])) if d.get("title")]
    return {"policies": policies[:12]}
