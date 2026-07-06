"""Wikidata SPARQL -> holdings: per-company corporate structure — parent owner,
subsidiaries (P355) and owned entities / investments (P1830). Real cross-company
ownership links; companies without a QID simply get no entry (graceful).

Values are filtered to organizations (via direct P31 type) so people and product
brands that Wikidata attaches to these properties don't leak into the panel."""
import entities
from sources.base import get_json

SPARQL = "https://query.wikidata.org/sparql"

# Wikidata P127 "owned by" lists major shareholders for public companies; these
# passive index managers are not a meaningful "parent" and would mislead.
INSTITUTIONAL = {
    "BlackRock", "The Vanguard Group", "Vanguard", "State Street Corporation",
    "State Street", "State Street Global Advisors", "The Capital Group Companies",
    "Fidelity Investments", "FMR", "Berkshire Hathaway",
}
# Direct P31 types that mark an entity as a company/organization (fast — no
# transitive P279* closure, which times out WDQS for a 20-company batch).
ORG_TYPES = {
    "Q4830453", "Q783794", "Q6881511", "Q891723", "Q167037", "Q43229",
    "Q18388277", "Q1589009", "Q658255", "Q219577", "Q210167", "Q2085381",
    "Q160016", "Q1093829", "Q3918", "Q161726", "Q748019", "Q6500733",
}
HUMAN = "Q5"


def _query(qids: list[str]) -> str:
    values = " ".join(f"wd:{q}" for q in qids)
    return f"""
    SELECT ?item ?rel ?otherLabel ?type WHERE {{
      VALUES ?item {{ {values} }}
      {{ ?item wdt:P355 ?other. BIND("subsidiary" AS ?rel) }}
      UNION {{ ?item wdt:P1830 ?other. BIND("investment" AS ?rel) }}
      UNION {{ ?item wdt:P127 ?other. BIND("parent" AS ?rel) }}
      OPTIONAL {{ ?other wdt:P31 ?type. }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }}"""


def build_holdings(bindings: list[dict], qid_to_id: dict[str, str]) -> dict[str, dict]:
    # Collect the direct types seen for each (company, relation, name) triple.
    types: dict[tuple, set] = {}
    for b in bindings:
        cid = qid_to_id.get(b["item"]["value"].rsplit("/", 1)[-1])
        name = b.get("otherLabel", {}).get("value", "")
        if not cid or (name.startswith("Q") and name[1:].isdigit()):
            continue
        t = b["type"]["value"].rsplit("/", 1)[-1] if "type" in b else None
        types.setdefault((cid, b["rel"]["value"], name), set()).add(t)

    out: dict[str, dict] = {}
    for (cid, rel, name), tset in types.items():
        if HUMAN in tset:  # drop people (e.g. founder listed as "owned by")
            continue
        rec = out.setdefault(cid, {"parent": None, "subsidiaries": [], "investments": []})
        if rel == "subsidiary":  # P355 targets are companies by definition
            rec["subsidiaries"].append(name)
        elif rel == "investment" and tset & ORG_TYPES:  # drop product/brand holdings
            rec["investments"].append(name)
        elif rel == "parent" and name not in INSTITUTIONAL and tset & ORG_TYPES:
            rec["parent"] = rec["parent"] or name

    for rec in out.values():
        rec["subsidiaries"] = sorted(set(rec["subsidiaries"]))[:14]
        rec["investments"] = sorted(set(rec["investments"]))[:14]
    return {k: v for k, v in out.items()
            if v["parent"] or v["subsidiaries"] or v["investments"]}


def run(industry: str = "semiconductor") -> dict:
    ents = [e for e in entities.load(industry) if e.get("qid")]
    qid_to_id = {e["qid"]: e["id"] for e in ents}
    data = get_json(
        SPARQL, f"holdings_{industry}",
        params={"query": _query(list(qid_to_id)), "format": "json"},
        timeout=60, max_age_h=48,
    )
    return {"holdings": build_holdings(data["results"]["bindings"], qid_to_id)}
