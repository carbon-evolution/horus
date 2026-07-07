"""UN Comtrade public preview API -> real trade data, cached on disk.

Produces TWO datasets per industry:
  shipments — top bilateral export lanes (freight table)
  sankey    — origin country -> material -> destination flow with REAL USD
              volumes (link value = $B/yr), so the diagram can draw thickness
              proportional to trade and dependency shares per material.

Keyless preview endpoint; rate-limited, so responses cache to etl/cache/
(24h) and every call is throttled. Stale beats broken (see base.get_json).
"""
from sources.base import get_json

API = "https://comtradeapi.un.org/public/v1/preview/C/A/HS"

# Per-industry material map: label -> (HS code, dominant freight mode).
MATERIALS = {
    "semiconductor": {
        "Silicon": ("280461", "sea"),           # polysilicon >99.99%
        "Rare Earths": ("280530", "sea"),
        "Photoresist": ("370790", "air"),
        "Neon/Rare Gases": ("280429", "sea"),
    },
    "ai": {
        "Processors/GPUs": ("854231", "air"),
        "HBM/Memory": ("854232", "air"),
        "AI Servers": ("847150", "air"),
        "Storage Units": ("847170", "air"),
    },
    "battery": {
        "Lithium Carbonate": ("283691", "sea"),
        "Cobalt": ("810520", "sea"),
        "Graphite": ("250410", "sea"),
        "Nickel": ("750210", "sea"),
    },
}
# Reporter sets (max 8 for the preview API) — the plausible top exporters.
REPORTERS = {
    "semiconductor": "156,158,276,392,410,528,804,842",  # CN,TW,DE,JP,KR,NL,UA,US
    "ai": "156,158,392,410,458,528,704,842",             # CN,TW,JP,KR,MY,NL,VN,US
    "battery": "36,152,156,180,360,392,410,842",         # AU,CL,CN,DRC,ID,JP,KR,US
}
# Legacy freight lanes for the semiconductor table (chip trade, not materials).
CHIP_COMMODITY = {"8542": ("Integrated Circuits", "sea"), "8486": ("Semiconductor Machinery", "air")}
HIGH_RISK = {"China", "Taiwan"}

SHORT = {
    "Other Asia, nes": "Taiwan",
    "Rep. of Korea": "South Korea",
    "Dem. Rep. of the Congo": "DR Congo",
    "United States of America": "USA",
    "China, Hong Kong SAR": "Hong Kong",
    "Russian Federation": "Russia",
    "United Kingdom": "UK",
    "Netherlands (Kingdom of the)": "Netherlands",
    "Viet Nam": "Vietnam",
}


def _short(name: str) -> str:
    return SHORT.get(name, name)


def _rows(industry: str, code: str) -> list[dict]:
    data = get_json(
        API, f"comtrade_{industry}_{code}",
        params={"reporterCode": REPORTERS[industry], "period": "2024", "cmdCode": code,
                "flowCode": "X", "includeDesc": "true"},
        max_age_h=24, throttle_s=1.5,
    )
    return [r for r in data.get("data", [])
            if r.get("partnerDesc") not in (None, "World") and r.get("primaryValue")]


def _fmt_vol(val: float) -> str:
    return f"${val / 1e9:.1f}B/yr" if val >= 1e9 else f"${val / 1e6:.0f}M/yr"


def _lane(origin: str, dest: str, commodity: str, mode: str, val: float) -> dict:
    risky = origin in HIGH_RISK or dest in HIGH_RISK
    return {
        "lane": f"{origin} → {dest}", "origin": origin, "destination": dest,
        "mode": mode, "commodity": commodity, "volume": _fmt_vol(val),
        "tariff": "—", "risk": "high" if risky else "medium" if val >= 5e9 else "low",
    }


def run(industry: str = "semiconductor") -> dict:
    out: dict = {}

    # NOTE: the sourcing sankey is built in derive.py from the curated `materials`
    # dataset (Comtrade's broad HS categories misrepresent semiconductor specialty
    # inputs — e.g. HS 370790 shows German photographic-chemical re-exports, not
    # Japan-dominated photoresist). Comtrade here provides the real freight lanes.

    # Freight lanes. Semiconductor keeps the chip-trade lanes; ai/battery build
    # lanes from their material flows.
    lanes: list[dict] = []
    if industry == "semiconductor":
        for code, (name, mode) in CHIP_COMMODITY.items():
            rows = _rows(industry, code)
            rows.sort(key=lambda r: -r["primaryValue"])
            lanes += [_lane(_short(r["reporterDesc"]), _short(r["partnerDesc"]), name, mode, r["primaryValue"])
                      for r in rows[:6]]
    else:
        for mat, (code, mode) in MATERIALS[industry].items():
            rows = sorted(_rows(industry, code), key=lambda r: -r["primaryValue"])
            lanes += [_lane(_short(r["reporterDesc"]), _short(r["partnerDesc"]), mat, mode, r["primaryValue"])
                      for r in rows[:3]]
    if lanes:
        lanes.sort(key=lambda s: -float(s["volume"].strip("$").split("B")[0].split("M")[0])
                   * (1e9 if "B" in s["volume"] else 1e6))
        out["shipments"] = lanes[:10]

    return out
