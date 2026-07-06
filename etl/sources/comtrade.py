"""UN Comtrade public preview API -> shipments (top export lanes for chip trade).
Uses the keyless preview endpoint (rate-limited but sufficient for 2 commodities)."""
from sources.base import get_json

API = "https://comtradeapi.un.org/public/v1/preview/C/A/HS"
COMMODITY = {"8542": ("Integrated Circuits", "sea"), "8486": ("Semiconductor Machinery", "air")}
HIGH_RISK = {"China", "Taiwan", "Other Asia, nes"}  # chokepoint-adjacent lanes
_REPORTERS = "158,410,528,842,392,156,276"  # TW, KR, NL, US, JP, CN, DE


def _vol_num(volume: str) -> float:
    """'$8.4B/yr' -> 8.4e9 (for sorting)."""
    n = float(volume.strip("$").split("B")[0].split("M")[0])
    return n * (1e9 if "B" in volume else 1e6)


def normalize_shipment(row: dict) -> dict:
    name, mode = COMMODITY.get(str(row["cmdCode"]), ("Components", "sea"))
    origin = row["reporterDesc"].replace("Other Asia, nes", "Taiwan")
    dest = row["partnerDesc"].replace("Other Asia, nes", "Taiwan")
    val = row["primaryValue"]
    risky = origin in HIGH_RISK or dest in HIGH_RISK or "Taiwan" in (origin, dest)
    return {
        "lane": f"{origin} → {dest}",
        "origin": origin,
        "destination": dest,
        "mode": mode,
        "commodity": name,
        "volume": f"${val / 1e9:.1f}B/yr" if val >= 1e9 else f"${val / 1e6:.0f}M/yr",
        "tariff": "—",
        "risk": "high" if risky else "medium" if val >= 5e9 else "low",
    }


def run(industry: str = "semiconductor") -> dict:
    lanes: list[dict] = []
    for code in COMMODITY:
        data = get_json(
            API, f"comtrade_{code}",
            params={"reporterCode": _REPORTERS, "period": "2024", "cmdCode": code,
                    "flowCode": "X", "includeDesc": "true"},
        )
        rows = [r for r in data.get("data", [])
                if r.get("partnerDesc") not in (None, "World") and r.get("primaryValue")]
        rows.sort(key=lambda r: -r["primaryValue"])
        lanes += [normalize_shipment(r) for r in rows[:6]]
    lanes.sort(key=lambda s: -_vol_num(s["volume"]))
    return {"shipments": lanes[:10]}
