"""Yahoo/yfinance -> companies (quotes), financials (TTM $B), research (R&D)."""
import yfinance as yf
import entities
from real_loader import read_dataset
from sources.base import fmt_cap

CUR_SYMBOL = {"USD": "$", "KRW": "₩", "EUR": "€", "TWD": "NT$", "JPY": "¥", "HKD": "HK$"}
# Coarse FX to USD so $B/$T magnitudes are comparable across listings.
FX_TO_USD = {"USD": 1.0, "KRW": 1 / 1400.0, "EUR": 1.08, "TWD": 1 / 32.5,
             "JPY": 1 / 150.0, "HKD": 1 / 7.8}


def normalize_company(raw: dict) -> dict:
    sym = CUR_SYMBOL.get(raw.get("currency", "USD"), "$")
    return {
        "id": raw["id"], "name": raw["name"], "ticker": raw["ticker"],
        "marketCap": fmt_cap(raw["market_cap"]),
        "price": f"{sym}{raw['price']:,.2f}",
        "change24h": round(raw["change24h"], 2),
        "changeYtd": round(raw["changeYtd"], 2),
    }


def normalize_financial(raw: dict) -> dict:
    return {
        "company": raw["name"],
        "revenue": round(raw["revenue"] / 1e9, 1),
        "profit": round(raw["profit"] / 1e9, 1),
        "rnd": round(raw["rnd"] / 1e9, 2),
        "capex": round(abs(raw["capex"]) / 1e9, 1),
    }


def _ttm(df, row_name: str) -> float:
    """Sum the most recent 4 quarterly values for a statement row, 0.0 if absent."""
    try:
        series = df.loc[row_name].dropna()
        return float(series.iloc[:4].sum())
    except Exception:
        return 0.0


def _fetch_one(ent: dict) -> tuple[dict, dict]:
    t = yf.Ticker(ent["ticker"])
    info = t.fast_info
    hist = t.history(period="ytd")
    prev = t.history(period="5d")["Close"]
    price = float(info["lastPrice"])
    change24h = (price / float(prev.iloc[-2]) - 1) * 100 if len(prev) >= 2 else 0.0
    change_ytd = (price / float(hist["Close"].iloc[0]) - 1) * 100 if len(hist) else 0.0
    inc = t.quarterly_income_stmt
    cf = t.quarterly_cashflow
    cur = str(info.get("currency") or "USD")  # price / market-cap currency
    # Income statement / cash flow can be reported in a DIFFERENT currency than
    # the quote — foreign ADRs (TSM priced in USD but reporting TWD; ASML USD/EUR)
    # would otherwise be left unconverted. Use the statement's own currency for
    # the financial figures, falling back to the price currency.
    try:
        fin_cur = str(t.info.get("financialCurrency") or cur)
    except Exception:
        fin_cur = cur
    fx = FX_TO_USD.get(cur, 1.0)
    fx_fin = FX_TO_USD.get(fin_cur, 1.0)
    company_raw = {
        "id": ent["id"], "name": ent["name"], "ticker": ent["ticker"], "currency": cur,
        "price": price, "market_cap": float(info["marketCap"]) * fx,
        "change24h": change24h, "changeYtd": change_ytd,
    }
    fin_raw = {
        "name": ent["name"],
        "revenue": _ttm(inc, "Total Revenue") * fx_fin,
        "profit": _ttm(inc, "Net Income") * fx_fin,
        "rnd": _ttm(inc, "Research And Development") * fx_fin,
        "capex": _ttm(cf, "Capital Expenditure") * fx_fin,
    }
    return company_raw, fin_raw


def run(industry: str = "semiconductor") -> dict:
    raws = [_fetch_one(ent) for ent in entities.load(industry)]
    # Market Snapshot shows the first 10 — order by market cap, not entity-map order.
    raws.sort(key=lambda pair: -pair[0]["market_cap"])
    companies = [normalize_company(c) for c, _ in raws]
    financials = [normalize_financial(f) for _, f in raws]
    # research: R&D spend + % of revenue from the same numbers; patents count
    # comes from the patents dataset if already loaded (else em-dash).
    patents = {p["company"]: p["total"] for p in (read_dataset(industry, "patents") or [])}
    research = [
        {
            "company": f["company"],
            "rndExpense": f"${f['rnd']:.1f}B",
            "rndPctRevenue": f"{(f['rnd'] / f['revenue'] * 100):.1f}%" if f["revenue"] else "—",
            "patents": f"{patents[f['company']]:,}" if f["company"] in patents else "—",
        }
        for f in financials
    ]
    return {"companies": companies, "financials": financials, "research": research}
