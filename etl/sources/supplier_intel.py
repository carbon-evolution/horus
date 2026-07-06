"""Supplier Intelligence: turn the raw supplier graph (supplierEdges) into a
per-supplier profile with country, tier, products, dependent buyers, five risk
sub-scores (financial/cyber/ESG/political/disaster), dependency flags
(sole-source / single-region / alternates) and performance metrics. Tracked
suppliers inherit their own company scores; others are derived from country +
a deterministic seed. Read-only over other datasets (runs after scores)."""
import hashlib
import entities
from real_loader import read_dataset
from sources.geoutil import COUNTRY_TENSION

# Supplier -> HQ country (covers every name appearing in supplierEdges).
SUPPLIER_COUNTRY = {
    "ASML": "Netherlands", "Applied Materials": "USA", "Broadcom": "USA", "CATL": "China",
    "Cymer": "USA", "Dell": "USA", "GM": "USA", "Ganfeng Lithium": "China",
    "Glencore": "Switzerland", "Huayou Cobalt": "China", "Marvell": "USA", "NVIDIA": "USA",
    "POSCO Future M": "South Korea", "Panasonic": "Japan", "SK hynix": "South Korea",
    "Shin-Etsu Chemical": "Japan", "Sumitomo": "Japan", "TSMC": "Taiwan",
    "Tokyo Electron": "Japan", "Umicore": "Belgium", "Vertiv": "USA", "Zeiss": "Germany",
}
# Natural-disaster exposure per country (earthquake/flood/typhoon), 0-100.
DISASTER = {
    "Japan": 78, "Taiwan": 72, "Philippines": 80, "Indonesia": 75, "China": 55,
    "South Korea": 45, "USA": 40, "India": 58, "Netherlands": 32, "Germany": 25,
    "Belgium": 25, "Switzerland": 20, "Sweden": 18, "France": 28, "United Kingdom": 28,
    "Canada": 25,
}
RISK_BANDS = [(66, "high"), (40, "medium"), (0, "low")]


def _seed(*p):
    return int(hashlib.md5("|".join(p).encode()).hexdigest()[:8], 16)


def _clamp(v, lo=8, hi=95):
    return int(max(lo, min(hi, round(v))))


def _spend_num(s: str) -> float:
    try:
        s = s.strip().lstrip("$")
        mult = 1e9 if s.endswith("B") else 1e6 if s.endswith("M") else 1.0
        return float(s.rstrip("TBMK")) * mult
    except Exception:
        return 0.0


def _band(v: int) -> str:
    for t, b in RISK_BANDS:
        if v >= t:
            return b
    return "low"


def build_profiles(edges: list[dict], scores: dict, name_to_id: dict) -> list[dict]:
    suppliers = sorted({e["supplier"] for e in edges})
    # material -> set of suppliers (for sole-source / alternates), country per material.
    mat_suppliers: dict[str, set] = {}
    for e in edges:
        mat_suppliers.setdefault(e["material"], set()).add(e["supplier"])

    out = []
    for name in suppliers:
        mine = [e for e in edges if e["supplier"] == name]
        country = SUPPLIER_COUNTRY.get(name, "Global")
        cid = name_to_id.get(name.strip().lower())
        tracked_scores = scores.get(cid) if cid else None
        political = COUNTRY_TENSION.get(country, 50)
        disaster = DISASTER.get(country, 40)
        if tracked_scores:  # supplier is a tracked company -> reuse its real scores
            risk = {"financial": tracked_scores["financial"], "cyber": tracked_scores["cyber"],
                    "esg": tracked_scores["esg"], "political": political, "disaster": disaster}
        else:
            risk = {"financial": _clamp(35 + _seed(name, "fin") % 45),
                    "cyber": _clamp(30 + _seed(name, "cyb") % 40),
                    "esg": _clamp(30 + _seed(name, "esg") % 50),
                    "political": political, "disaster": disaster}
        overall = _clamp(sum(risk.values()) / len(risk))
        materials = sorted({e["material"] for e in mine})
        # sole-source if this supplier is the ONLY one for any material it provides.
        sole = any(len(mat_suppliers[m]) == 1 for m in materials)
        alternates = max((len(mat_suppliers[m]) - 1 for m in materials), default=0)
        buyers = sorted({e["buyer"] for e in mine})
        out.append({
            "name": name, "country": country, "companyId": cid,
            "tier": min(e["tier"] for e in mine),
            "products": materials, "buyers": buyers,
            "totalSpend": round(sum(_spend_num(e["spend"]) for e in mine) / 1e9, 1),
            "overallRisk": overall, "overallBand": _band(overall), "risk": risk,
            "dependency": {"soleSource": sole, "singleRegion": True, "alternates": alternates},
            "performance": {"delivery": _clamp(80 + _seed(name, "del") % 18),
                            "quality": _clamp(85 + _seed(name, "qua") % 14),
                            "leadTimeDays": 20 + _seed(name, "lt") % 80,
                            "capacityUtil": _clamp(65 + _seed(name, "cap") % 33)},
        })
    out.sort(key=lambda p: -p["overallRisk"])
    return out


def run(industry: str = "semiconductor") -> dict:
    edges = read_dataset(industry, "supplierEdges") or []
    scores = read_dataset(industry, "scores") or {}
    companies = read_dataset(industry, "companies") or []
    name_to_id = {c["name"].strip().lower(): c["id"] for c in companies}
    return {"supplierProfiles": build_profiles(edges, scores, name_to_id)}
