"""Yahoo/yfinance annual statements -> financialHistory backfill for companies
SEC EDGAR can't see. Foreign filers (Samsung, SK hynix, CATL, BYD, Panasonic,
LG Energy, Samsung SDI, Toshiba, GS Yuasa, Tokyo Electron, MediaTek, Infineon…)
don't file 10-K/20-F with the SEC, so sources/sec_facts.py has no data for them.
yfinance exposes their annual income statement + cash flow (Korea/Japan/China/
Singapore/EU listings), which we normalise to the SAME `financialHistory` shape
and FX-convert to USD billions.

Runs AFTER sec_facts (flows ordering): reads the existing financialHistory and
only fills companies not already covered, so real SEC series are never clobbered."""
import yfinance as yf
import entities
from real_loader import read_dataset

# Coarse FX to USD — matches sources/yahoo.py and sources/sec_facts.py.
FX_TO_USD = {"USD": 1.0, "KRW": 1 / 1400.0, "EUR": 1.08, "TWD": 1 / 32.5,
             "JPY": 1 / 150.0, "HKD": 1 / 7.8, "CNY": 1 / 7.1, "INR": 1 / 83.0,
             "GBP": 1.27, "SGD": 1 / 1.35}

# yfinance-normalised statement row labels per metric (first present wins).
INC_ROWS = {
    "revenue": ["Total Revenue", "Operating Revenue"],
    "rnd": ["Research And Development"],
    "netIncome": ["Net Income", "Net Income Common Stockholders"],
}
CF_ROWS = {
    "capex": ["Capital Expenditure", "Purchase Of PPE"],
    "acquisitions": ["Purchase Of Business", "Net Business Purchase And Sale"],
}


def _to_series(pairs: list[tuple[int, float]], fx: float, n: int = 6) -> list[dict]:
    """(year, raw_local_value) pairs -> [{year, val_usd_billions}] ascending, last n.
    Values arrive in the statement's functional currency; convert then scale."""
    by_year: dict[int, float] = {}
    for year, raw in pairs:
        if raw is None:
            continue
        by_year[year] = round(abs(float(raw)) / 1e9 * fx, 2)
    return [{"year": y, "val": by_year[y]} for y in sorted(by_year)][-n:]


def _row_pairs(df, names: list[str]) -> list[tuple[int, float]]:
    """First matching row of a yfinance statement DataFrame -> (year, value) pairs."""
    if df is None or getattr(df, "empty", True):
        return []
    for name in names:
        if name in df.index:
            series = df.loc[name].dropna()
            return [(col.year, float(val)) for col, val in series.items()]
    return []


def build_history(inc, cf, fx: float, n: int = 6) -> dict:
    """Extract all metric series from one company's annual statements."""
    out: dict[str, list] = {}
    for metric, rows in INC_ROWS.items():
        s = _to_series(_row_pairs(inc, rows), fx, n)
        if s:
            out[metric] = s
    for metric, rows in CF_ROWS.items():
        s = _to_series(_row_pairs(cf, rows), fx, n)
        if s:
            out[metric] = s
    return out


def _fetch_one(ticker: str) -> dict:
    t = yf.Ticker(ticker)
    try:
        cur = str(t.info.get("financialCurrency") or "USD")
    except Exception:
        cur = "USD"
    fx = FX_TO_USD.get(cur, 1.0)
    return build_history(t.income_stmt, t.cashflow, fx)


def run(industry: str = "semiconductor") -> dict:
    # Start from whatever sec_facts already loaded so we only backfill gaps.
    existing = read_dataset(industry, "financialHistory") or {}
    history = dict(existing)
    for e in entities.load(industry):
        if not e.get("ticker") or e["id"] in history:
            continue  # private/unlisted, or already covered by SEC facts
        try:
            hist = _fetch_one(e["ticker"])
        except Exception:
            continue  # per-source isolation — skip this company
        if hist:
            history[e["id"]] = {**hist, "source": "Yahoo Finance annual statements"}
    return {"financialHistory": history}
