"""U.S. SEC EDGAR XBRL company-facts -> financialHistory: the structured line
items companies report *inside* their 10-K / 20-F filings, as multi-year annual
series. Keyless. Delivers the "historical spending", "R&D details" and
"acquisitions (M&A spend)" data straight from the filings themselves rather than
a single TTM snapshot.

Each metric maps to a priority list of us-gaap tags because filers tag the same
economic figure differently (and switch tags between years) — the first tag that
carries a fiscal year wins, later tags backfill missing years. Foreign private
issuers report in their functional currency, so values are converted to USD via
a coarse FX table (same rates as the yahoo source)."""
from datetime import date
import entities
from sources.base import get_json

FACTS = "https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"

# Coarse FX to USD — matches sources/yahoo.py so magnitudes are comparable.
FX_TO_USD = {"USD": 1.0, "KRW": 1 / 1400.0, "EUR": 1.08, "TWD": 1 / 32.5,
             "JPY": 1 / 150.0, "HKD": 1 / 7.8, "CNY": 1 / 7.1, "INR": 1 / 83.0,
             "GBP": 1.27, "SGD": 1 / 1.35}

# Annual figures come from these forms only (10-K for US filers, 20-F for
# foreign private issuers). Full-year duration is enforced separately.
ANNUAL_FORMS = {"10-K", "20-F"}

# Per-metric us-gaap tag priority. Order matters: earlier tags are preferred and
# later tags only backfill fiscal years the earlier ones don't cover.
METRIC_TAGS = {
    "rnd": [
        "ResearchAndDevelopmentExpense",
        "ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCost",
    ],
    "capex": [
        "PaymentsToAcquirePropertyPlantAndEquipment",
        "PaymentsToAcquireProductiveAssets",
        "PaymentsForCapitalImprovements",
    ],
    "acquisitions": [
        "PaymentsToAcquireBusinessesNetOfCashAcquired",
        "PaymentsToAcquireBusinessesGross",
    ],
    "revenue": [
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "Revenues",
        "SalesRevenueNet",
    ],
    "netIncome": ["NetIncomeLoss"],
}


def _pick_unit(node: dict) -> tuple[str, list]:
    """Choose the currency unit with the most data points (filers report in a
    single functional currency). Returns (currency, points)."""
    units = node.get("units", {})
    if not units:
        return "USD", []
    cur = max(units, key=lambda u: len(units[u]))
    return cur, units[cur]


def _annual_from_tag(node: dict) -> dict[int, tuple[str, float]]:
    """Full-year annual values for one tag, keyed by fiscal year.
    Later filings (restatements) overwrite earlier ones for the same year."""
    cur, pts = _pick_unit(node)
    fx = FX_TO_USD.get(cur, 1.0)
    by_fy: dict[int, tuple[str, float]] = {}
    for p in pts:
        if p.get("form") not in ANNUAL_FORMS or p.get("fp") != "FY":
            continue
        end, start = p.get("end"), p.get("start")
        if not end:
            continue
        if start:  # flow item: require a ~full-year duration
            days = (date.fromisoformat(end) - date.fromisoformat(start)).days
            if days < 350 or days > 380:
                continue
        fy = p.get("fy")
        if fy is None:
            continue
        by_fy[fy] = (end, p["val"] * fx)
    return by_fy


def _series(facts_usgaap: dict, tags: list[str], n: int) -> list[dict]:
    """Merge a metric's tag priority list into one annual series (last n years).
    Earlier tags win; later tags backfill only the years still missing."""
    merged: dict[int, tuple[str, float]] = {}
    for tag in tags:
        node = facts_usgaap.get(tag)
        if not node:
            continue
        for fy, val in _annual_from_tag(node).items():
            merged.setdefault(fy, val)
    rows = [{"year": int(end[:4]), "val": round(v / 1e9, 2)}
            for _fy, (end, v) in sorted(merged.items())]
    # de-dupe by calendar year (fiscal-year boundaries can collide), keep latest
    by_year = {r["year"]: r for r in rows}
    return [by_year[y] for y in sorted(by_year)][-n:]


def build_history(facts_json: dict, n: int = 6) -> dict:
    """Extract all metric series from one company's companyfacts JSON."""
    g = facts_json.get("facts", {}).get("us-gaap", {})
    out = {metric: _series(g, tags, n) for metric, tags in METRIC_TAGS.items()}
    return {k: v for k, v in out.items() if v}


def run(industry: str = "semiconductor") -> dict:
    ents = [e for e in entities.load(industry) if e.get("cik")]
    history: dict[str, dict] = {}
    for e in ents:
        cik = str(e["cik"]).zfill(10)
        try:
            data = get_json(FACTS.format(cik=cik), f"secfacts_{cik}",
                            throttle_s=0.2, max_age_h=24)
        except Exception:
            continue  # per-source isolation — skip this company, keep the rest
        hist = build_history(data)
        if hist:
            history[e["id"]] = {**hist, "source": "SEC EDGAR XBRL (10-K / 20-F)"}
    return {"financialHistory": history}
