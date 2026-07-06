"""Yahoo/yfinance -> companies (quotes), financials (TTM $B), research (R&D)."""
import yfinance as yf
import entities
from real_loader import read_dataset
from sources.base import fmt_cap

CUR_SYMBOL = {"USD": "$", "KRW": "₩", "EUR": "€", "TWD": "NT$", "JPY": "¥",
              "HKD": "HK$", "CNY": "CN¥", "INR": "₹", "GBP": "£", "SGD": "S$"}
# Coarse FX to USD so $B/$T magnitudes are comparable across listings.
FX_TO_USD = {"USD": 1.0, "KRW": 1 / 1400.0, "EUR": 1.08, "TWD": 1 / 32.5,
             "JPY": 1 / 150.0, "HKD": 1 / 7.8, "CNY": 1 / 7.1, "INR": 1 / 83.0,
             "GBP": 1.27, "SGD": 1 / 1.35}


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


def _cap_to_num(s: str) -> float:
    """'$1.20T' -> 1.2e12, '$300B' -> 3e11 — for sorting mixed real/curated caps."""
    try:
        s = s.strip().lstrip("$")
        mult = 1e12 if s.endswith("T") else 1e9 if s.endswith("B") else 1e6 if s.endswith("M") else 1.0
        return float(s.rstrip("TBMK")) * mult
    except Exception:
        return 0.0


def run(industry: str = "semiconductor") -> dict:
    """Overlay live data onto the curated base: public tickers are fetched and
    replace their curated entries; private/unlisted companies (no ticker) and any
    that fail to fetch keep their curated fixture data. Every tracked company is
    preserved. For an all-public universe (semiconductor) this is all-real."""
    ents = entities.load(industry)
    base_c = {c["id"]: c for c in (read_dataset(industry, "companies") or [])}
    base_f = {f["company"]: f for f in (read_dataset(industry, "financials") or [])}

    real_c: dict[str, dict] = {}
    real_f: dict[str, dict] = {}
    for ent in ents:
        if not ent.get("ticker"):
            continue  # private / unlisted — keep curated
        try:
            c_raw, f_raw = _fetch_one(ent)
        except Exception:
            continue  # transient / delisted — keep curated
        real_c[ent["id"]] = normalize_company(c_raw)
        real_f[ent["name"]] = normalize_financial(f_raw)

    # Market Snapshot shows the first 10 — order by market cap, not entity order.
    companies = [real_c.get(e["id"]) or base_c.get(e["id"]) for e in ents]
    companies = [c for c in companies if c]
    companies.sort(key=lambda c: -_cap_to_num(c.get("marketCap", "0")))

    # Prefer live financials only when they actually carry revenue — yfinance
    # omits the income statement for some foreign tickers, and an empty $0 row
    # should not clobber the curated figure.
    financials = []
    for e in ents:
        rf, bf = real_f.get(e["name"]), base_f.get(e["name"])
        financials.append(rf if (rf and rf.get("revenue")) else bf)
    financials = [f for f in financials if f]

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
