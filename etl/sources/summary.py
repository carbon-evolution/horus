"""Source wrapper: build the companySummary dataset from scores + risks using the
swappable ai.summary generator. Runs last (needs scores/risks loaded)."""
import entities
from real_loader import read_dataset
from ai.summary import generate


def run(industry: str = "semiconductor") -> dict:
    meta = read_dataset(industry, "companyMeta") or {}
    scores = read_dataset(industry, "scores") or {}
    risks = read_dataset(industry, "risks") or {}
    out = {}
    for e in entities.load(industry):
        rlist = risks.get(e["id"]) or []
        ctx = {"name": e["name"], "industry": industry, "scores": scores.get(e["id"]) or {},
               "topRisk": rlist[0] if rlist else None, "hq": meta.get(e["id"], {}).get("hq", "")}
        out[e["id"]] = generate(ctx)
    return {"companySummary": out}
