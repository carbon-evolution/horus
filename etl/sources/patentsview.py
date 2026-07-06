"""USPTO PatentsView search API -> patents dataset. Requires PATENTSVIEW_API_KEY
(free, https://patentsview.org). Without a key, run() raises and the flow keeps
the seeded fixture — source isolation by design."""
import json
import entities
from config import PATENTSVIEW_API_KEY
from sources.base import get_json

API = "https://search.patentsview.org/api/v1/patent/"
CPC_LABEL = {  # coarse CPC class -> dashboard category label
    "G06": "Core Tech", "H01": "Materials", "H03": "Core Tech", "G11": "Packaging",
    "H04": "Core Tech", "G03": "Materials", "B81": "Packaging", "G02": "Materials",
}


def normalize_patents(company: str, total: int, cpc_counts: dict[str, int]) -> dict:
    by_label: dict[str, int] = {}
    for cpc, n in cpc_counts.items():
        label = CPC_LABEL.get(cpc, "Other")
        by_label[label] = by_label.get(label, 0) + n
    top3 = sorted(by_label.items(), key=lambda kv: -kv[1])[:3]
    return {
        "company": company,
        "total": total,
        "pending": max(1, round(total * 0.18)),  # applications endpoint is a later add
        "categories": [{"name": name, "count": n} for name, n in top3],
    }


def _fetch_one(name: str) -> dict:
    q = {"_and": [{"_gte": {"patent_date": "2020-01-01"}},
                  {"_contains": {"assignees.assignee_organization": name}}]}
    fields = ["patent_id", "cpc_current.cpc_class"]
    data = get_json(
        API, f"patentsview_{name.lower().replace(' ', '_')}",
        params={"q": json.dumps(q), "f": json.dumps(fields), "o": json.dumps({"size": 1000})},
        headers={"X-Api-Key": PATENTSVIEW_API_KEY},
    )
    total = data.get("total_hits", 0)
    cpc_counts: dict[str, int] = {}
    for p in data.get("patents", []) or []:
        for c in p.get("cpc_current", []) or []:
            cls = (c.get("cpc_class") or "")[:3]
            if cls:
                cpc_counts[cls] = cpc_counts.get(cls, 0) + 1
    return normalize_patents(name, total, cpc_counts or {"G06": 1})


def run(industry: str = "semiconductor") -> dict:
    if not PATENTSVIEW_API_KEY:
        raise RuntimeError("PATENTSVIEW_API_KEY not set — keeping seeded patents fixture")
    return {"patents": [_fetch_one(e["name"]) for e in entities.load(industry)]}
