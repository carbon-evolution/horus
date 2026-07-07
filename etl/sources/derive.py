"""Derived datasets computed from other loaded datasets (run last in the flow):
  - kpis: patch real company/news counts into the seeded KPI cards.
  - compareRadar: a per-axis risk profile for EVERY tracked company (not just the
    3 curated leaders), so the Risk Radar can show the whole universe. Curated
    entities keep their hand-assessed values; the rest are derived from the real
    signals we have (companyMeta.healthScore, .exposure, esg emissions) blended
    with a deterministic per-company seed, anchored to the sector composite so
    values stay plausible. The Sector Composite reference line is preserved.
"""
import hashlib
from real_loader import read_dataset

AXES = ["Geopolitical", "Supplier Conc.", "Financial", "Operational",
        "Regulatory", "ESG", "Raw Material", "Logistics"]
EXPOSURE_GEO = {"low": 35, "medium": 58, "high": 82}


def build_kpis(seeded: list[dict], companies_count: int, news_count: int) -> list[dict]:
    computed = {
        "Companies Tracked": str(companies_count) if companies_count else None,
        "News Impacting Markets": str(news_count) if news_count else None,
    }
    out = []
    for k in seeded:
        k = dict(k)
        if computed.get(k["label"]):
            k["value"] = computed[k["label"]]
        out.append(k)
    return out


def _seed(*parts: str) -> int:
    """Stable cross-process hash (Python's hash() is salted per run)."""
    return int(hashlib.md5("|".join(parts).encode()).hexdigest()[:8], 16)


def _color(idx: int) -> str:
    """Distinct categorical hue per company via the golden angle (HSL->hex)."""
    h = (idx * 137.508) % 360
    s, l = 0.62, 0.60
    c = (1 - abs(2 * l - 1)) * s
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = l - c / 2
    r, g, b = [((x, c, 0), (c, x, 0), (0, c, x), (0, x, c), (x, 0, c), (c, 0, x))[int(h // 60)][k]
               for k in range(3)]
    return "#" + "".join(f"{round((v + m) * 255):02x}" for v in (r, g, b))


def _clamp(v: float, lo: int = 12, hi: int = 93) -> int:
    return int(max(lo, min(hi, round(v))))


def _esg_score(profile: dict) -> int:
    """ESG *risk* 0-100 from emissions + ethical sourcing (higher = worse)."""
    total = (profile.get("scope1", 0) or 0) + (profile.get("scope2", 0) or 0) + (profile.get("scope3", 0) or 0)
    emissions = min(70, total * 1.1)  # ~64 Mt maps toward the high end
    sourcing = {"low": 25, "medium": 12, "high": 0}.get(profile.get("ethicalSourcing"), 15)
    return _clamp(emissions + sourcing, 15, 92)


def _derive_axes(cid: str, name: str, composite: list[int], meta: dict, esg: dict) -> list[int]:
    """Per-company axis values: jitter around the sector composite, then override
    the axes we have a real signal for (financial health, exposure, ESG)."""
    vals = [_clamp(composite[i] + (_seed(cid, AXES[i]) % 37 - 18)) for i in range(len(AXES))]
    if meta:
        if isinstance(meta.get("healthScore"), (int, float)):
            vals[2] = _clamp(100 - meta["healthScore"], 10, 90)   # Financial risk = inverse health
        if meta.get("exposure") in EXPOSURE_GEO:
            vals[0] = _clamp(EXPOSURE_GEO[meta["exposure"]] + (_seed(cid, "geo") % 11 - 5), 20, 90)
    if esg:
        vals[5] = _esg_score(esg)                                  # ESG risk from emissions
    return vals


def build_compare_radar(companies: list[dict], curated: list[dict],
                        meta_map: dict, esg_list: list[dict]) -> list[dict]:
    """One risk series per tracked company + the curated Sector Composite."""
    if not companies or not curated:
        return curated  # nothing to expand from — keep the fixture as-is
    composite_entry = next((s for s in curated if s["entity"] == "Sector Composite"), None)
    composite = [a["value"] for a in composite_entry["axes"]] if composite_entry else [55] * len(AXES)
    curated_by_name = {s["entity"]: s for s in curated if s["entity"] != "Sector Composite"}
    esg_by_name = {e["company"]: e for e in esg_list}

    series: list[dict] = []
    for idx, c in enumerate(companies):
        name = c.get("name", c.get("id"))
        if name in curated_by_name:            # keep the analyst-curated leaders verbatim
            series.append(curated_by_name[name])
            continue
        vals = _derive_axes(c["id"], name, composite, meta_map.get(c["id"], {}), esg_by_name.get(name, {}))
        series.append({"entity": name, "color": _color(idx),
                       "axes": [{"axis": AXES[i], "value": vals[i]} for i in range(len(AXES))]})
    if composite_entry:
        series.append(composite_entry)
    return series


# Major manufacturing/consuming hubs per industry — the destination column of the
# sourcing sankey. Weights are the rough share of downstream manufacturing.
CONSUMER_HUBS = {
    "semiconductor": {"Taiwan": 30, "China": 25, "South Korea": 22, "USA": 15, "Japan": 8},
    "battery": {"China": 42, "USA": 20, "South Korea": 16, "Germany": 12, "Japan": 10},
    "ai": {"USA": 45, "China": 25, "Taiwan": 12, "South Korea": 10, "Europe": 8},
}


def build_material_sankey(materials: list[dict], industry: str) -> dict:
    """Origin country -> raw material -> destination, built from the SAME curated
    `materials.topProducers` the Raw Materials page uses, so producer shares are
    identical across both views. Link value = share of supply (%). Materials are
    the most concentrated few, to stay readable."""
    hubs = CONSUMER_HUBS.get(industry) or {"USA": 40, "China": 30, "Europe": 30}
    hub_total = sum(hubs.values()) or 1
    mats = [m for m in materials if m.get("topProducers")]
    mats.sort(key=lambda m: -(m.get("concentration") or 0))
    mats = mats[:6]

    nodes: list[dict] = []
    index: dict[str, int] = {}

    def node(name: str) -> int:
        if name not in index:
            index[name] = len(nodes)
            nodes.append({"name": name})
        return index[name]

    links: list[dict] = []
    for m in mats:
        mi = node(m["name"])
        total = 0.0
        for p in m["topProducers"]:
            links.append({"source": node(p["country"]), "target": mi, "value": p["share"]})
            total += p["share"]
        # split the material's tracked inflow across the consuming hubs
        for hub, w in hubs.items():
            links.append({"source": mi, "target": node(hub + " "), "value": round(total * w / hub_total, 1)})
    return {"nodes": nodes, "links": links, "unit": "% of supply"}


def run(industry: str = "semiconductor") -> dict:
    seeded = read_dataset(industry, "kpis") or []
    companies = read_dataset(industry, "companies") or []
    news = read_dataset(industry, "news") or []
    curated = read_dataset(industry, "compareRadar") or []
    meta_map = read_dataset(industry, "companyMeta") or {}
    esg_list = read_dataset(industry, "esg") or []
    materials = read_dataset(industry, "materials") or []
    out = {
        "kpis": build_kpis(seeded, len(companies), len(news)),
        "compareRadar": build_compare_radar(companies, curated, meta_map, esg_list),
    }
    if materials:
        out["sankey"] = build_material_sankey(materials, industry)
    return out
