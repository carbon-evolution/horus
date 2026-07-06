"""Executive summary generator. Single seam: generate(context) -> str. The
deterministic implementation composes a factual paragraph from the structured
scores/risks. Swap this body for an LLM call later - callers and datasets are
unchanged."""

_DRIVERS = {
    "geopolitical": "geopolitical exposure", "supplierDependency": "supplier concentration",
    "cyber": "cyber exposure", "financial": "financial fragility",
    "esg": "ESG/emissions risk", "customerDependency": "customer concentration",
}


def generate(ctx: dict) -> str:
    name = ctx["name"]
    s = ctx.get("scores") or {}
    overall, band = s.get("overall", 50), s.get("band", "C")
    subs = {k: s.get(k, 0) for k in _DRIVERS}
    top2 = sorted(subs, key=lambda k: -subs[k])[:2]
    drivers = " and ".join(_DRIVERS[k] for k in top2)
    level = "elevated" if overall >= 62 else "moderate" if overall >= 46 else "contained"
    hq = ctx.get("hq", "")
    risk_line = ""
    if ctx.get("topRisk"):
        risk_line = f" The most pressing risk is {ctx['topRisk']['title'].lower()}."
    return (f"{name} carries {level} overall supply-chain risk (score {overall}/100, band {band}), "
            f"driven primarily by {drivers}." + (f" Headquartered in {hq}." if hq else "") +
            risk_line + " Scores are computed from filings, ownership, cyber, policy and "
            "geopolitical signals; see the scorecard for factor-level detail.")
