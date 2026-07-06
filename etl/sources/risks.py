"""Per-company risk register. Each risk object is derived from a real signal
(cyber score, export-control policy, geopolitical tension, sole-source supplier,
financial weakness) so `source` always traces to data. Recovery time + actions
are per-category heuristics; 'projection' items are flagged in `source`."""
import entities
from real_loader import read_dataset
from sources.geoutil import country_tension

# category -> (recommended actions, typical recovery days)
PLAYBOOK = {
    "cyber": (["Patch KEV-listed CVEs within 72h", "Segment OT/IT networks", "Review third-party access"], 21),
    "regulatory": (["Map affected SKUs to controlled ECCNs", "File license applications", "Qualify non-restricted alternates"], 120),
    "geopolitical": (["Dual-source outside the flashpoint region", "Build 60-90d safety stock", "Model tariff pass-through"], 180),
    "single-source": (["Qualify a second source", "Negotiate buffer inventory", "Add contractual capacity guarantees"], 150),
    "financial": (["Monitor supplier liquidity", "Prepay/secure critical POs", "Prepare alternate-supplier bench"], 90),
    "operational": (["Activate continuity plan", "Reroute logistics", "Confirm alternate capacity"], 30),
}


def _risk(cid, cat, title, severity, prob, impact, suppliers, facilities, conf, source):
    actions, recovery = PLAYBOOK[cat]
    return {"id": f"{cid}-{cat}", "category": cat, "title": title,
            "severity": int(severity), "probability": round(prob, 2),
            "financialImpactUsd": int(impact), "timeToRecoveryDays": recovery,
            "impactedSuppliers": suppliers, "impactedFacilities": facilities,
            "recommendedActions": actions, "confidence": round(conf, 2), "source": source}


def build_risks(ctx: dict) -> list[dict]:
    cid, name = ctx["id"], ctx["name"]
    risks = []
    cyber = ctx.get("cyber") or {}
    if cyber.get("score", 0) >= 45:
        kev = len(cyber.get("kevHits") or [])
        risks.append(_risk(cid, "cyber", f"Elevated cyber exposure ({cyber['score']}/100)",
                           cyber["score"], min(0.9, 0.3 + 0.15 * kev), 5e7 + kev * 2e7,
                           [], [], 0.6 + 0.1 * bool(kev), "NVD + CISA KEV"))
    for p in ctx.get("policies") or []:
        targets = p.get("targets") or []
        text = f"{p.get('title', '')} {p.get('summary', '')}"
        if any(name == t or name in t for t in targets) or name.lower() in text.lower():
            sev = {"high": 78, "medium": 55, "low": 35}.get(p.get("severity"), 50)
            risks.append(_risk(cid, "regulatory", f"Policy exposure: {p['title']}", sev, 0.7,
                               8e7, [], [], 0.7, "Federal Register / policy tracker"))
            break
    country, tension = ctx.get("geoCountry", ""), ctx.get("geoTension", 0)
    if country and tension >= 55:
        risks.append(_risk(cid, "geopolitical", f"Geopolitical tension in {country} ({tension})",
                           tension, tension / 120, 1.2e8, [], [], 0.65,
                           f"Geo risk index ({country})"))
    sole = [e for e in (ctx.get("supplierEdges") or []) if e.get("buyer") == name and e.get("risk") == "high"]
    if sole:
        mats = ", ".join(sorted({e["material"] for e in sole})[:3])
        risks.append(_risk(cid, "single-source", f"Single-source dependency: {mats}", 70, 0.5,
                           6e7, [e["supplier"] for e in sole][:5], [], 0.6, "Supplier graph"))
    hs = ctx.get("healthScore")
    if isinstance(hs, (int, float)) and hs < 55:
        risks.append(_risk(cid, "financial", f"Financial fragility (health {hs}/100)",
                           100 - hs, 0.4, 4e7, [], [], 0.55, "Financial health model"))
    risks.sort(key=lambda r: -r["severity"])
    return risks


def run(industry: str = "semiconductor") -> dict:
    meta = read_dataset(industry, "companyMeta") or {}
    cyber = read_dataset(industry, "cyber") or {}
    policies = read_dataset(industry, "policies") or []
    geo = read_dataset(industry, "geo") or []
    edges = read_dataset(industry, "supplierEdges") or []
    out = {}
    for e in entities.load(industry):
        m = meta.get(e["id"], {})
        country, tension = country_tension(e["id"], geo)
        ctx = {"id": e["id"], "name": e["name"], "cyber": cyber.get(e["id"]),
               "policies": policies, "geoCountry": country, "geoTension": tension,
               "supplierEdges": edges, "healthScore": m.get("healthScore")}
        out[e["id"]] = build_risks(ctx)
    return {"risks": out}
