"""Wikidata SPARQL -> companyMeta (CEO, HQ, founded, employees) merged with
derived healthScore/exposure/segments (same hash derivation as the provider)."""
import entities
from real_loader import read_dataset
from sources.base import get_json

SPARQL = "https://query.wikidata.org/sparql"
EXPOSURE = ["low", "medium", "high"]


def _hash(s: str) -> int:
    h = 0
    for ch in s:
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
        if h >= 0x80000000:
            h -= 0x100000000
    return abs(h)


def build_meta(facts: dict, company: dict, industry: str) -> dict:
    h = _hash(company["id"])
    return {
        "ceo": facts.get("ceo", "—"),
        "hq": facts.get("hq", "—"),
        "employees": facts.get("employees", f"{20 + h % 200}k"),
        "founded": facts.get("founded", str(1970 + h % 45)),
        "description": facts.get(
            "description", f"{company['name']} is a tracked {industry} company."),
        "healthScore": 50 + (20 if company.get("changeYtd", 0) > 0 else 5) + h % 20,
        "exposure": EXPOSURE[h % 3],
        "segments": [
            {"name": "Core", "share": 60},
            {"name": "Adjacent", "share": 25},
            {"name": "Other", "share": 15},
        ],
    }


def _fetch_facts(qids: list[str]) -> dict[str, dict]:
    values = " ".join(f"wd:{q}" for q in qids)
    query = f"""
    SELECT ?item ?ceoLabel ?hqLabel ?founded ?employees ?desc WHERE {{
      VALUES ?item {{ {values} }}
      OPTIONAL {{ ?item wdt:P169 ?ceo. }}
      OPTIONAL {{ ?item wdt:P159 ?hq. }}
      OPTIONAL {{ ?item wdt:P571 ?founded. }}
      OPTIONAL {{ ?item wdt:P1128 ?employees. }}
      OPTIONAL {{ ?item schema:description ?desc. FILTER(LANG(?desc)="en") }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }}"""
    data = get_json(SPARQL, "wikidata_meta", params={"query": query, "format": "json"})
    out: dict[str, dict] = {}
    for b in data["results"]["bindings"]:
        qid = b["item"]["value"].rsplit("/", 1)[-1]
        f = out.setdefault(qid, {})
        if "ceoLabel" in b:
            f["ceo"] = b["ceoLabel"]["value"]
        if "hqLabel" in b:
            f["hq"] = b["hqLabel"]["value"]
        if "founded" in b:
            f["founded"] = b["founded"]["value"][:4]
        if "employees" in b:
            f["employees"] = f"{int(float(b['employees']['value'])):,}"
        if "desc" in b:
            f["description"] = b["desc"]["value"].capitalize()
    return out


def run(industry: str = "semiconductor") -> dict:
    ents = entities.load(industry)
    facts_by_qid = _fetch_facts([e["qid"] for e in ents if e.get("qid")])
    companies = {c["id"]: c for c in (read_dataset(industry, "companies") or [])}
    meta = {}
    for e in ents:
        company = companies.get(e["id"], {"id": e["id"], "name": e["name"], "changeYtd": 0})
        meta[e["id"]] = build_meta(facts_by_qid.get(e.get("qid"), {}), company, industry)
    return {"companyMeta": meta}
