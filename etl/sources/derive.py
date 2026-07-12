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


def _cap_num(s: str) -> float:
    """'$1.20T' -> 1.2e12, '$300B' -> 3e11."""
    try:
        s = (s or "").strip().lstrip("$")
        mult = 1e12 if s.endswith("T") else 1e9 if s.endswith("B") else 1e6 if s.endswith("M") else 1.0
        return float(s.rstrip("TBMK")) * mult
    except Exception:
        return 0.0


def _fmt_cap(n: float) -> str:
    if n >= 1e12:
        return f"${n / 1e12:.2f}T"
    if n >= 1e9:
        return f"${n / 1e9:.0f}B"
    if n >= 1e6:
        return f"${n / 1e6:.0f}M"
    return f"${n:.0f}"


def build_market_snapshot(companies: list[dict]) -> dict | None:
    """Live sector snapshot from the real Yahoo quotes in the companies dataset:
    aggregate market cap, 24h breadth, YTD average, cap concentration and movers."""
    rows = [c for c in companies if _cap_num(c.get("marketCap")) > 0]
    if not rows:
        return None
    by_cap = sorted(rows, key=lambda c: -_cap_num(c.get("marketCap")))
    total = sum(_cap_num(c.get("marketCap")) for c in rows) or 1.0
    top3 = sum(_cap_num(c.get("marketCap")) for c in by_cap[:3])
    ch = [c for c in rows if isinstance(c.get("change24h"), (int, float))]
    yts = [c["changeYtd"] for c in rows if isinstance(c.get("changeYtd"), (int, float))]

    def mover(c: dict) -> dict:
        return {"id": c["id"], "name": c["name"], "ticker": c.get("ticker", ""),
                "changePct": round(c.get("change24h", 0), 2)}

    return {
        "totalMarketCap": _fmt_cap(total),
        "tracked": len(rows),
        "advancers": sum(1 for c in ch if c["change24h"] > 0),
        "decliners": sum(1 for c in ch if c["change24h"] < 0),
        "avgYtdPct": round(sum(yts) / len(yts), 1) if yts else 0.0,
        "top3ConcentrationPct": round(top3 / total * 100, 1),
        "topGainers": [mover(c) for c in sorted(ch, key=lambda c: -c["change24h"])[:3]],
        "topLosers": [mover(c) for c in sorted(ch, key=lambda c: c["change24h"])[:3]],
        "leaders": [{"id": c["id"], "name": c["name"], "ticker": c.get("ticker", ""),
                     "marketCap": c.get("marketCap", ""),
                     "capSharePct": round(_cap_num(c.get("marketCap")) / total * 100, 1)}
                    for c in by_cap[:5]],
    }


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


# Rough global annual trade value ($B/yr) per material, used to give the derived
# material shipping lanes plausible relative magnitudes. Estimates, not exact.
TRADE_VALUE_B = {
    "Polysilicon": 8, "Gallium": 1.5, "Germanium": 1, "Rare Earths": 10,
    "Palladium": 22, "Tungsten": 4, "Neon Gas": 1, "Photoresist": 6,
    "Lithium": 40, "Cobalt": 15, "Nickel": 30, "Graphite": 5, "Manganese": 8,
    "HBM Memory": 60, "GPUs": 120, "CoWoS Packaging": 30, "ABF Substrate": 8,
}
# Materials that move by air (gases, chemicals, finished components) vs by sea.
AIR_CATEGORIES = {"Process Gas", "Chemical", "Component", "Accelerator"}
SKIP_CATEGORIES = {"Utility"}  # not physically shipped (e.g. grid power)


def build_material_lanes(materials: list[dict], industry: str, geo: list[dict]) -> list[dict]:
    """Producer country -> consuming hub shipping lanes for each raw material, so
    the maritime chokepoint map can project every material's supply route. Top
    producers by share; sea/air by category; volume from a trade-value estimate ×
    producer share; risk from the producer's geopolitical tension + concentration."""
    hubs = list((CONSUMER_HUBS.get(industry) or {"USA": 1, "China": 1}).keys())
    tension = {g["country"]: g.get("tension", 0) for g in geo}
    lanes: list[dict] = []
    for m in materials:
        cat = m.get("category", "")
        if cat in SKIP_CATEGORIES:
            continue
        mode = "air" if cat in AIR_CATEGORIES else "sea"
        tv = TRADE_VALUE_B.get(m["name"], 3.0)
        conc = m.get("concentration") or 0
        for p in sorted(m.get("topProducers", []), key=lambda x: -x["share"])[:2]:
            origin = p["country"]
            dest = next((h for h in hubs if h != origin), hubs[0])
            val = tv * p["share"] / 100.0
            t = tension.get(origin, 0)
            risk = "high" if t >= 70 or conc >= 85 else "medium" if t >= 45 or conc >= 70 else "low"
            vol = f"${val:.1f}B/yr" if val >= 1 else f"${round(val * 1000)}M/yr"
            lanes.append({
                "lane": f"{origin} → {dest}", "origin": origin, "destination": dest,
                "mode": mode, "commodity": m["name"], "volume": vol, "tariff": "—", "risk": risk,
            })
    return lanes


def build_material_sankey(materials: list[dict], industry: str) -> dict:
    """Origin country -> raw material -> destination, built from the SAME curated
    `materials.topProducers` the Raw Materials page uses, so producer shares are
    identical across both views. Link value = share of supply (%)."""
    hubs = CONSUMER_HUBS.get(industry) or {"USA": 40, "China": 30, "Europe": 30}
    hub_total = sum(hubs.values()) or 1
    mats = [m for m in materials if m.get("topProducers")]
    mats.sort(key=lambda m: -(m.get("concentration") or 0))

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
    geo = read_dataset(industry, "geo") or []
    out = {
        "kpis": build_kpis(seeded, len(companies), len(news)),
        "compareRadar": build_compare_radar(companies, curated, meta_map, esg_list),
    }
    if materials:
        out["sankey"] = build_material_sankey(materials, industry)
        out["materialLanes"] = build_material_lanes(materials, industry, geo)
    # Merge a live market snapshot into the (otherwise curated) marketIntel so the
    # Market Intelligence page shows real quotes, not just static inventory data.
    snapshot = build_market_snapshot(companies)
    if snapshot:
        market = read_dataset(industry, "marketIntel") or {}
        out["marketIntel"] = {**market, "marketSnapshot": snapshot}
    return out
