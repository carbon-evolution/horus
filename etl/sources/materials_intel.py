"""Raw-materials intelligence: overlay the curated `materials` base with the deep
fields an analyst needs — strategic importance, global production, shortage
status, import reliance, recyclability, alternatives, environmental concern,
export restrictions (linked to the policies dataset) and a price-history series.
Curated reference facts + deterministic derivations; runs read-only after the
base materials + policies are loaded."""
import hashlib
import re
from real_loader import read_dataset

# Per-material reference facts (keyed by lowercased name). Materials absent here
# (e.g. AI 'GPUs') get graceful defaults.
MATERIAL_REF = {
    "polysilicon": ("~1,000,000 t/yr", "low", ["upgraded metallurgical silicon"], "High energy/carbon (Siemens process)"),
    "neon gas": ("~540 t/yr (semi-grade)", "medium", ["krypton/xenon blends (partial)"], "Air-separation & steel byproduct"),
    "gallium": ("~600 t/yr", "low", ["silicon for some RF devices"], "Byproduct of alumina refining"),
    "germanium": ("~140 t/yr", "medium", ["silicon photonics"], "Byproduct of zinc/coal ash"),
    "photoresist": ("Specialty chemical", "none", ["EUV vs DUV resist chemistries"], "PFAS/solvent concerns"),
    "rare earths": ("~350,000 t/yr", "low", ["ferrite magnets (weaker)"], "Radioactive tailings, high impact"),
    "palladium": ("~210 t/yr", "high", ["platinum (partial substitution)"], "PGM mining footprint"),
    "tungsten": ("~84,000 t/yr", "high", ["molybdenum (some uses)"], "Moderate; conflict-mineral scrutiny"),
    "lithium": ("~180,000 t/yr", "low (growing)", ["sodium-ion (emerging)"], "Brine water use / hard-rock mining"),
    "cobalt": ("~230,000 t/yr", "medium", ["LFP cobalt-free chemistries"], "Artisanal mining / human-rights risk"),
    "nickel": ("~3,600,000 t/yr", "high", ["LFP chemistries"], "Laterite smelting emissions"),
    "graphite": ("~1,600,000 t/yr", "low", ["silicon anode (emerging)"], "Flake mining / synthetic energy use"),
    "manganese": ("~20,000,000 t/yr", "medium", ["high-manganese alt cathodes"], "Moderate mining impact"),
}
# Export-control keyword -> matches a material by name substrings.
RESTRICTION_TERMS = {
    "gallium": ["gallium"], "germanium": ["germanium"], "rare earths": ["rare earth", "rare-earth"],
    "graphite": ["graphite"], "tungsten": ["tungsten"], "neon gas": ["neon"],
}
# Documented real-world export controls (keyed by lowercased material name).
# Federal Register (our live policy feed) rarely names specific commodities, so
# these well-known controls are curated to supplement any policy-linked matches.
KNOWN_RESTRICTIONS = {
    "gallium": [{"title": "China gallium export licensing (permits required)", "authority": "MOFCOM"}],
    "germanium": [{"title": "China germanium export licensing (permits required)", "authority": "MOFCOM"}],
    "graphite": [{"title": "China graphite export permit requirements", "authority": "MOFCOM"}],
    "rare earths": [{"title": "China rare-earth extraction/separation export controls", "authority": "MOFCOM"}],
    "tungsten": [{"title": "China tungsten & related export controls", "authority": "MOFCOM"}],
    "neon gas": [{"title": "Ukraine neon supply disruption (semiconductor-grade)", "authority": "Market"}],
}
RISK_ADD = {"high": 16, "medium": 8, "low": 0}


def _seed(*p):
    return int(hashlib.md5("|".join(p).encode()).hexdigest()[:8], 16)


def _clamp(v, lo=5, hi=99):
    return int(max(lo, min(hi, round(v))))


def _price_num(price: str) -> float:
    m = re.search(r"[\d,]+(?:\.\d+)?", price or "")
    return float(m.group(0).replace(",", "")) if m else 0.0


def _price_history(name: str, current: float) -> list[dict]:
    """12-month back-series ending at the current price (deterministic wobble)."""
    if current <= 0:
        return []
    out = []
    for m in range(12, 0, -1):
        delta = (_seed(name, str(m)) % 30 - 15) / 100.0  # +/-15%
        out.append({"period": f"m-{m}", "value": round(current * (1 + delta * m / 12), 2)})
    out.append({"period": "now", "value": round(current, 2)})
    return out


def _restrictions(name: str, policies: list[dict]) -> list[dict]:
    """Documented known controls for the material, plus any live policy that
    names it (deduped by title)."""
    hits = list(KNOWN_RESTRICTIONS.get(name.lower(), []))
    seen = {h["title"] for h in hits}
    terms = RESTRICTION_TERMS.get(name.lower(), [name.lower()])
    for p in policies:
        text = f"{p.get('title', '')} {p.get('summary', '')}".lower()
        title = p.get("title", "")
        if any(t in text for t in terms) and title not in seen:
            hits.append({"title": title, "authority": p.get("authority", p.get("region", ""))})
            seen.add(title)
    return hits[:3]


def enrich_material(m: dict, policies: list[dict]) -> dict:
    name = m.get("name", "")
    ref = MATERIAL_REF.get(name.lower(), ("—", "n/a", [], "—"))
    production, recyclability, alternatives, environmental = ref
    conc = m.get("concentration", 50)
    risk = m.get("supplyRisk", "medium")
    strategic = _clamp(conc * 0.7 + RISK_ADD.get(risk, 8) + 10)
    top_share = m["topProducers"][0]["share"] if m.get("topProducers") else conc
    if risk == "high":
        shortage = "acute" if conc >= 80 else "tight"
    elif risk == "medium":
        shortage = "tight"
    else:
        shortage = "balanced"
    out = dict(m)
    out.update({
        "strategicImportance": strategic,
        "strategicLabel": "critical" if strategic >= 80 else "high" if strategic >= 60 else "moderate",
        "globalProduction": production,
        "importReliance": top_share,
        "shortageStatus": shortage,
        "recyclability": recyclability,
        "alternatives": alternatives,
        "environmentalConcern": environmental,
        "exportRestrictions": _restrictions(name, policies),
        "priceHistory": _price_history(name, _price_num(m.get("price", ""))),
    })
    return out


def run(industry: str = "semiconductor") -> dict:
    materials = read_dataset(industry, "materials") or []
    policies = read_dataset(industry, "policies") or []
    return {"materials": [enrich_material(m, policies) for m in materials]}
