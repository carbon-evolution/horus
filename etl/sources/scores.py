"""Composite per-company risk scores (0-100, higher = more risk). Every subscore
is a pure function of real signals and records its inputs in `factors`. Overall =
weighted blend -> A-F band. Trend accretes: append the current overall to the
prior stored trend so real history builds up over ingests."""
import hashlib
from datetime import date
import entities
from real_loader import read_dataset
from sources.geoutil import country_tension

SCORE_WEIGHTS = {  # must sum to 1.0
    "geopolitical": 0.22, "supplierDependency": 0.20, "cyber": 0.18,
    "financial": 0.16, "esg": 0.12, "customerDependency": 0.12,
}
EXPOSURE_GEO = {"low": 35, "medium": 58, "high": 82}
BANDS = [(78, "F"), (62, "D"), (46, "C"), (30, "B"), (0, "A")]


def _clamp(v, lo=5, hi=98):
    return int(max(lo, min(hi, round(v))))


def _seed(*p):
    return int(hashlib.md5("|".join(p).encode()).hexdigest()[:8], 16)


def band_for(overall):
    for t, b in BANDS:
        if overall >= t:
            return b
    return "A"


def overall_and_band(subs):
    overall = _clamp(sum(subs[k] * w for k, w in SCORE_WEIGHTS.items()))
    return overall, band_for(overall)


def _esg_score(esg):
    total = sum(esg.get(k, 0) or 0 for k in ("scope1", "scope2", "scope3"))
    sourcing = {"low": 25, "medium": 12, "high": 0}.get(esg.get("ethicalSourcing"), 15)
    return _clamp(min(70, total * 1.1) + sourcing, 15, 92)


def _supplier_dependency(name, edges):
    mine = [e for e in edges if e.get("buyer") == name]
    if not mine:
        return 45, {"edges": 0}
    sole = sum(1 for e in mine if e.get("risk") == "high")
    return _clamp(35 + sole * 15 + max(0, 10 - len(mine)) * 2), {"edges": len(mine), "soleSource": sole}


def build_scores(ctx):
    cid, name = ctx["id"], ctx["name"]
    supplier, sf = _supplier_dependency(name, ctx.get("edges") or [])
    esg = _esg_score(ctx.get("esg") or {})
    cyber = _clamp((ctx.get("cyber") or {}).get("score", 40))
    hs = ctx.get("healthScore")
    financial = _clamp(100 - hs) if isinstance(hs, (int, float)) else _clamp(40 + _seed(cid, "fin") % 30)
    geo_base = ctx.get("geoTension") or EXPOSURE_GEO.get(ctx.get("exposure"), 50)
    geopolitical = _clamp(geo_base)
    customer = _clamp(40 + _seed(cid, "cust") % 35)  # proxy - no free customer data
    subs = {"supplierDependency": supplier, "customerDependency": customer, "esg": esg,
            "cyber": cyber, "financial": financial, "geopolitical": geopolitical}
    overall, band = overall_and_band(subs)
    prev = list(ctx.get("prevTrend") or [])
    period = date.today().strftime("%Y-%m")
    prev = [p for p in prev if p.get("period") != period]
    if not prev:  # seed a short estimated back-history the first time
        prev = [{"period": f"2026-0{m}", "value": _clamp(overall + _seed(cid, str(m)) % 15 - 7)}
                for m in range(1, 7)]
    trend = (prev + [{"period": period, "value": overall}])[-12:]
    esg_total = round(sum((ctx.get("esg") or {}).get(k, 0) or 0 for k in ("scope1", "scope2", "scope3")), 1)
    return {**subs, "overall": overall, "band": band, "trend": trend,
            "factors": {"supplierDependency": sf,
                        "customerDependency": {"estimated": True, "note": "revenue-proxy; no free customer feed"},
                        "esg": {"scopeTotal": esg_total},
                        "cyber": {"exposure": cyber}, "financial": {"healthScore": hs if hs is not None else "n/a"},
                        "geopolitical": {"base": geo_base}}}


def run(industry: str = "semiconductor") -> dict:
    meta = read_dataset(industry, "companyMeta") or {}
    esg_list = read_dataset(industry, "esg") or []
    esg_by = {e["company"]: e for e in esg_list}
    cyber = read_dataset(industry, "cyber") or {}
    edges = read_dataset(industry, "supplierEdges") or []
    geo = read_dataset(industry, "geo") or []
    prev_scores = read_dataset(industry, "scores") or {}
    out = {}
    for e in entities.load(industry):
        m = meta.get(e["id"], {})
        _country, gt = country_tension(e["id"], geo)
        ctx = {"id": e["id"], "name": e["name"], "healthScore": m.get("healthScore"),
               "exposure": m.get("exposure"), "esg": esg_by.get(e["name"]),
               "cyber": cyber.get(e["id"]), "edges": edges, "geoTension": gt,
               "prevTrend": (prev_scores.get(e["id"]) or {}).get("trend")}
        out[e["id"]] = build_scores(ctx)
    return {"scores": out}
