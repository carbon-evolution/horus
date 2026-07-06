# Phase Z — Plan 3: Real Fetchers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the semiconductor industry's fixture-seeded datasets in Postgres with real data fetched from free public sources (Yahoo/yfinance, Wikidata, PatentsView, UN Comtrade, GDELT, World Bank), one isolated source at a time.

**Architecture:** Each source is one module in `etl/sources/` exposing `run() -> dict[dataset_name, payload]` where payloads match the `src/lib/types.ts` shapes exactly. A shared `real_loader.upsert_datasets()` writes them into `industry_dataset` for `semiconductor` only, overwriting the fixture-seeded rows. The Prefect flow runs seeds first (so every dataset always exists), then fetchers (each in a try/except — a failing source only leaves its seeded fixture in place), then warms Redis. The app is untouched: it already reads Postgres via the Plan 2 provider.

**Tech Stack:** Python 3.14 (existing `etl/.venv`), `yfinance`, `requests`, `pyyaml`, existing `psycopg`/`redis`/`prefect`. No API keys required except PatentsView (optional, key-gated).

**Refinements from the spec (flagged, consistent with Plan 1's approved JSONB deviation):**
- **No DuckDB staging.** Raw API responses are cached as JSON in `etl/cache/` (gitignored); normalizers are pure functions over those raws. Same "reuse last good fetch" property, far less machinery.
- **yfinance is the primary financials source, not SEC EDGAR.** Half the universe (Samsung, SK hynix, Infineon; TSMC/ASML via ADR quirks) are not clean EDGAR filers; yfinance covers all ten uniformly. EDGAR enrichment can be a later additive source.
- **Stays seeded (curated), per spec §3 plus these additions:** `materials` prices (no free structured commodity-price API), `marketIntel` (no free source for inventory/lead-time/utilization), plus the spec's curated list (supplierEdges, esg, deals, policies, facilities, radar, compareRadar, sankey, suppliers, alerts).
- **Read-modify-write for `geo` and `kpis`:** fetchers patch real values (tension, KPI numbers) into the existing seeded payload rather than regenerating curated fields (role, localization, icons).

---

## File Structure

**New:**
- `etl/seeds/semiconductor.yaml` — entity map: id ↔ name ↔ ticker ↔ CIK ↔ Wikidata QID
- `etl/entities.py` — loads the YAML, updates the `company` table (cik, wikidata_qid)
- `etl/real_loader.py` — `upsert_datasets(industry, {dataset: payload})` + `read_dataset()`
- `etl/sources/__init__.py`
- `etl/sources/base.py` — cached HTTP GET helper + shared formatters (`fmt_cap`, `ago`)
- `etl/sources/yahoo.py` — `companies`, `financials`, `research` datasets
- `etl/sources/wikidata.py` — `companyMeta` dataset
- `etl/sources/patentsview.py` — `patents` dataset (key-gated)
- `etl/sources/comtrade.py` — `shipments` dataset
- `etl/sources/gdelt.py` — `news` dataset
- `etl/sources/worldbank.py` — patches `geo` tension
- `etl/sources/derive.py` — patches `kpis` from loaded real data
- `etl/tests/test_sources.py` — normalizer tests (canned raw samples, no network)
- `etl/cache/` — gitignored raw-response cache

**Modified:**
- `etl/flows.py` — add per-source tasks between seed load and warm
- `etl/config.py` — add `CACHE_DIR`, `SEEDS_DIR`, `PATENTSVIEW_API_KEY`
- `etl/requirements.txt` — add `yfinance`, `pyyaml`
- `.env.example` — add optional `PATENTSVIEW_API_KEY`
- `.gitignore` — add `etl/cache/`

**Company universe (from the fixture; drives the entity map):**
nvidia/NVDA, tsmc/TSM, samsung/005930.KS, asml/ASML, intel/INTC, skhynix/000660.KS, qualcomm/QCOM, micron/MU, ti/TXN, infineon/IFX.DE.

---

## Task 1: Entity map + scaffold (config, loader, cache, deps)

**Files:**
- Create: `etl/seeds/semiconductor.yaml`, `etl/entities.py`, `etl/real_loader.py`, `etl/sources/__init__.py`, `etl/sources/base.py`
- Modify: `etl/config.py`, `etl/requirements.txt`, `.gitignore`, `.env.example`
- Test: `etl/tests/test_sources.py`

- [ ] **Step 1: Write `etl/seeds/semiconductor.yaml`**

```yaml
# Entity map — source of truth linking internal ids to external identifiers.
# CIKs are zero-padded SEC ids (US filers + foreign private issuers with ADRs).
industry: semiconductor
companies:
  - { id: nvidia,   name: NVIDIA,            ticker: NVDA,      cik: "0001045810", qid: Q182477 }
  - { id: tsmc,     name: TSMC,              ticker: TSM,       cik: "0001046179", qid: Q713418 }
  - { id: samsung,  name: Samsung,           ticker: 005930.KS, cik: null,         qid: Q20718 }
  - { id: asml,     name: ASML,              ticker: ASML,      cik: "0000937966", qid: Q807880 }
  - { id: intel,    name: Intel,             ticker: INTC,      cik: "0000050863", qid: Q248 }
  - { id: skhynix,  name: SK hynix,          ticker: 000660.KS, cik: null,         qid: Q622316 }
  - { id: qualcomm, name: Qualcomm,          ticker: QCOM,      cik: "0000804328", qid: Q544847 }
  - { id: micron,   name: Micron,            ticker: MU,        cik: "0000723125", qid: Q673992 }
  - { id: ti,       name: Texas Instruments, ticker: TXN,       cik: "0000097476", qid: Q595718 }
  - { id: infineon, name: Infineon,          ticker: IFX.DE,    cik: null,         qid: Q663650 }
```

- [ ] **Step 2: Extend `etl/config.py`** — append:

```python
CACHE_DIR = ROOT / "etl" / "cache"
SEEDS_DIR = ROOT / "etl" / "seeds"
PATENTSVIEW_API_KEY = os.environ.get("PATENTSVIEW_API_KEY")  # optional
```

- [ ] **Step 3: Write `etl/entities.py`**

```python
"""Entity map: etl/seeds/semiconductor.yaml -> list of dicts + company table sync."""
import yaml
from config import pg, SEEDS_DIR


def load(industry: str = "semiconductor") -> list[dict]:
    doc = yaml.safe_load((SEEDS_DIR / f"{industry}.yaml").read_text())
    return doc["companies"]


def sync_company_table(industry: str = "semiconductor") -> int:
    rows = load(industry)
    with pg() as conn:
        for c in rows:
            conn.execute(
                """insert into company (id, industry, name, ticker, cik, wikidata_qid)
                   values (%s, %s, %s, %s, %s, %s)
                   on conflict (id) do update set industry = excluded.industry,
                     name = excluded.name, ticker = excluded.ticker,
                     cik = excluded.cik, wikidata_qid = excluded.wikidata_qid""",
                (c["id"], industry, c["name"], c["ticker"], c.get("cik"), c.get("qid")),
            )
    return len(rows)
```

- [ ] **Step 4: Write `etl/real_loader.py`**

```python
"""Write fetched dataset payloads into industry_dataset (same upsert as seeds)."""
from psycopg.types.json import Jsonb
from config import pg

UPSERT = """
insert into industry_dataset (industry, dataset, payload)
values (%s, %s, %s)
on conflict (industry, dataset)
do update set payload = excluded.payload, updated_at = now()
"""


def upsert_datasets(industry: str, datasets: dict) -> list[str]:
    with pg() as conn:
        for name, payload in datasets.items():
            conn.execute(UPSERT, (industry, name, Jsonb(payload)))
    return sorted(datasets.keys())


def read_dataset(industry: str, dataset: str):
    """Current payload (seeded or previously fetched) — for read-modify-write patches."""
    with pg() as conn:
        row = conn.execute(
            "select payload from industry_dataset where industry=%s and dataset=%s",
            (industry, dataset),
        ).fetchone()
    return row[0] if row else None
```

- [ ] **Step 5: Write `etl/sources/__init__.py`** (empty file) **and `etl/sources/base.py`**

```python
"""Shared helpers for source modules: cached HTTP + display formatters."""
import json
import time
import requests
from config import CACHE_DIR

UA = {"User-Agent": "scr-radar-etl/1.0 (research dashboard; contact: local)"}


def get_json(url: str, cache_key: str, params: dict | None = None,
             headers: dict | None = None, max_age_h: float = 12.0):
    """GET JSON with an on-disk cache. On any fetch error, fall back to the
    last cached copy regardless of age (source isolation: stale beats broken)."""
    CACHE_DIR.mkdir(exist_ok=True)
    path = CACHE_DIR / f"{cache_key}.json"
    if path.exists() and (time.time() - path.stat().st_mtime) < max_age_h * 3600:
        return json.loads(path.read_text())
    try:
        resp = requests.get(url, params=params, headers={**UA, **(headers or {})}, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        path.write_text(json.dumps(data))
        return data
    except Exception:
        if path.exists():
            return json.loads(path.read_text())
        raise


def fmt_cap(usd: float) -> str:
    """1_234e9 -> '$1.23T'; 45.6e9 -> '$45.6B'."""
    if usd >= 1e12:
        return f"${usd / 1e12:.2f}T"
    if usd >= 1e9:
        return f"${usd / 1e9:.1f}B"
    return f"${usd / 1e6:.0f}M"


def ago(epoch: float, now: float | None = None) -> str:
    """Epoch seconds -> '2h ago' / '3d ago' (matches fixture style)."""
    delta = max(0, (now if now is not None else time.time()) - epoch)
    if delta < 3600:
        return f"{max(1, int(delta // 60))}m ago"
    if delta < 86400:
        return f"{int(delta // 3600)}h ago"
    return f"{int(delta // 86400)}d ago"
```

- [ ] **Step 6: Write the failing tests** — create `etl/tests/test_sources.py`:

```python
from sources.base import fmt_cap, ago


def test_fmt_cap():
    assert fmt_cap(3.42e12) == "$3.42T"
    assert fmt_cap(87.3e9) == "$87.3B"
    assert fmt_cap(512e6) == "$512M"


def test_ago():
    now = 1_000_000_000
    assert ago(now - 120, now) == "2m ago"
    assert ago(now - 7200, now) == "2h ago"
    assert ago(now - 3 * 86400, now) == "3d ago"
```

Run: `cd etl && ./.venv/bin/python -m pytest tests/test_sources.py -v`
Expected: FAIL (import error) until Step 5 files exist — if you wrote Step 5 first, expected PASS. Order the run so you see it fail on a fresh checkout, then pass.

- [ ] **Step 7: Install deps + verify**

```bash
cd etl && ./.venv/bin/pip install yfinance pyyaml
printf 'yfinance\npyyaml\n' >> requirements.txt
echo 'etl/cache/' >> ../.gitignore
```

Append to `.env.example`: `PATENTSVIEW_API_KEY=` (comment: optional, for patents dataset).

Run: `cd etl && ./.venv/bin/python -c "import entities; print(entities.sync_company_table())"`
Expected: `10`.

Run: `docker compose exec -T postgres psql -U scr -d scr_radar -c "select id, cik, wikidata_qid from company where industry='semiconductor' order by id limit 3;"`
Expected: rows with cik/qid populated (asml, infineon, intel…).

Run: `cd etl && ./.venv/bin/python -m pytest tests/ -v` → all PASS.

- [ ] **Step 8: Commit**

```bash
git add etl/seeds/semiconductor.yaml etl/entities.py etl/real_loader.py etl/sources etl/config.py etl/requirements.txt etl/tests/test_sources.py .gitignore .env.example
git commit -m "feat(etl): entity map, real-loader upsert, source scaffold"
```

---

## Task 2: Yahoo (yfinance) → `companies`, `financials`, `research`

**Files:**
- Create: `etl/sources/yahoo.py`
- Test: `etl/tests/test_sources.py` (append)

- [ ] **Step 1: Write the failing normalizer test** — append to `etl/tests/test_sources.py`:

```python
from sources.yahoo import normalize_company, normalize_financial


def test_normalize_company():
    raw = {"id": "nvidia", "name": "NVIDIA", "ticker": "NVDA", "currency": "USD",
           "price": 135.2, "market_cap": 3.42e12, "change24h": 1.8, "changeYtd": 24.5}
    c = normalize_company(raw)
    assert c == {"id": "nvidia", "name": "NVIDIA", "ticker": "NVDA",
                 "marketCap": "$3.42T", "price": "$135.20",
                 "change24h": 1.8, "changeYtd": 24.5}


def test_normalize_financial():
    raw = {"name": "NVIDIA", "revenue": 235.1e9, "profit": 120.4e9,
           "rnd": 8.67e9, "capex": 3.2e9}
    f = normalize_financial(raw)
    assert f == {"company": "NVIDIA", "revenue": 235.1, "profit": 120.4,
                 "rnd": 8.67, "capex": 3.2}
```

Run: `cd etl && ./.venv/bin/python -m pytest tests/test_sources.py -v`
Expected: FAIL — `No module named 'sources.yahoo'`.

- [ ] **Step 2: Write `etl/sources/yahoo.py`**

```python
"""Yahoo/yfinance -> companies (quotes), financials (TTM $B), research (R&D)."""
import datetime as dt
import yfinance as yf
import entities
from real_loader import read_dataset
from sources.base import fmt_cap

CUR_SYMBOL = {"USD": "$", "KRW": "₩", "EUR": "€", "TWD": "NT$"}


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
    fx = 1.0
    cur = str(info.get("currency") or "USD")
    if cur == "KRW":
        fx = 1 / 1400.0   # coarse KRW->USD so $B magnitudes are comparable
    elif cur == "EUR":
        fx = 1.08
    company_raw = {
        "id": ent["id"], "name": ent["name"], "ticker": ent["ticker"], "currency": cur,
        "price": price, "market_cap": float(info["marketCap"]) * fx,
        "change24h": change24h, "changeYtd": change_ytd,
    }
    fin_raw = {
        "name": ent["name"],
        "revenue": _ttm(inc, "Total Revenue") * fx,
        "profit": _ttm(inc, "Net Income") * fx,
        "rnd": _ttm(inc, "Research And Development") * fx,
        "capex": _ttm(cf, "Capital Expenditure") * fx,
    }
    return company_raw, fin_raw


def run(industry: str = "semiconductor") -> dict:
    companies, financials = [], []
    for ent in entities.load(industry):
        c_raw, f_raw = _fetch_one(ent)
        companies.append(normalize_company(c_raw))
        financials.append(normalize_financial(f_raw))
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
```

- [ ] **Step 3: Run tests** — `cd etl && ./.venv/bin/python -m pytest tests/test_sources.py -v` → PASS.

- [ ] **Step 4: Live run against Yahoo + load + verify in the app**

```bash
cd etl && ./.venv/bin/python -c "
import sources.yahoo as y, real_loader
d = y.run()
print({k: len(v) for k, v in d.items()})
print(d['companies'][0])
real_loader.upsert_datasets('semiconductor', d)
" && ./.venv/bin/python warm.py
```

Expected: `{'companies': 10, 'financials': 10, 'research': 10}` and a real NVIDIA quote.

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4444/semiconductor/companies` → 200. Open it: real market caps/prices should show.

- [ ] **Step 5: Commit**

```bash
git add etl/sources/yahoo.py etl/tests/test_sources.py
git commit -m "feat(etl): yahoo fetcher -> real companies/financials/research"
```

---

## Task 3: Wikidata → `companyMeta`

**Files:**
- Create: `etl/sources/wikidata.py`
- Test: `etl/tests/test_sources.py` (append)

- [ ] **Step 1: Write the failing test** — append:

```python
from sources.wikidata import build_meta


def test_build_meta_merges_facts_and_derived():
    facts = {"ceo": "Jensen Huang", "hq": "Santa Clara", "founded": "1993", "employees": "29,600"}
    company = {"id": "nvidia", "name": "NVIDIA", "changeYtd": 24.5}
    m = build_meta(facts, company, "semiconductor")
    assert m["ceo"] == "Jensen Huang" and m["founded"] == "1993"
    assert 0 <= m["healthScore"] <= 100
    assert m["exposure"] in ("low", "medium", "high")
    assert sum(s["share"] for s in m["segments"]) == 100


def test_build_meta_handles_missing_facts():
    m = build_meta({}, {"id": "x", "name": "X", "changeYtd": -2}, "semiconductor")
    assert m["ceo"] == "—" and m["hq"] == "—"
```

Run: `cd etl && ./.venv/bin/python -m pytest tests/test_sources.py -v` → FAIL (no module).

- [ ] **Step 2: Write `etl/sources/wikidata.py`**

```python
"""Wikidata SPARQL -> companyMeta (CEO, HQ, founded, employees) merged with
derived healthScore/exposure/segments (same hash derivation as the provider)."""
import entities
from real_loader import read_dataset
from sources.base import get_json

SPARQL = "https://query.wikidata.org/sparql"
EXPOSURE = ["low", "medium", "high"]


def _hash(s: str) -> int:
    h = 0
    for ch in s:
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
        if h >= 0x80000000:
            h -= 0x100000000
    return abs(h)


def build_meta(facts: dict, company: dict, industry: str) -> dict:
    h = _hash(company["id"])
    return {
        "ceo": facts.get("ceo", "—"),
        "hq": facts.get("hq", "—"),
        "employees": facts.get("employees", f"{20 + h % 200}k"),
        "founded": facts.get("founded", str(1970 + h % 45)),
        "description": facts.get(
            "description", f"{company['name']} is a tracked {industry} company."),
        "healthScore": 50 + (20 if company.get("changeYtd", 0) > 0 else 5) + h % 20,
        "exposure": EXPOSURE[h % 3],
        "segments": [
            {"name": "Core", "share": 60},
            {"name": "Adjacent", "share": 25},
            {"name": "Other", "share": 15},
        ],
    }


def _fetch_facts(qids: list[str]) -> dict[str, dict]:
    values = " ".join(f"wd:{q}" for q in qids)
    query = f"""
    SELECT ?item ?ceoLabel ?hqLabel ?founded ?employees ?desc WHERE {{
      VALUES ?item {{ {values} }}
      OPTIONAL {{ ?item wdt:P169 ?ceo. }}
      OPTIONAL {{ ?item wdt:P159 ?hq. }}
      OPTIONAL {{ ?item wdt:P571 ?founded. }}
      OPTIONAL {{ ?item wdt:P1128 ?employees. }}
      OPTIONAL {{ ?item schema:description ?desc. FILTER(LANG(?desc)="en") }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }}"""
    data = get_json(SPARQL, "wikidata_meta", params={"query": query, "format": "json"})
    out: dict[str, dict] = {}
    for b in data["results"]["bindings"]:
        qid = b["item"]["value"].rsplit("/", 1)[-1]
        f = out.setdefault(qid, {})
        if "ceoLabel" in b:
            f["ceo"] = b["ceoLabel"]["value"]
        if "hqLabel" in b:
            f["hq"] = b["hqLabel"]["value"]
        if "founded" in b:
            f["founded"] = b["founded"]["value"][:4]
        if "employees" in b:
            f["employees"] = f"{int(float(b['employees']['value'])):,}"
        if "desc" in b:
            f["description"] = b["desc"]["value"].capitalize()
    return out


def run(industry: str = "semiconductor") -> dict:
    ents = entities.load(industry)
    facts_by_qid = _fetch_facts([e["qid"] for e in ents if e.get("qid")])
    companies = {c["id"]: c for c in (read_dataset(industry, "companies") or [])}
    meta = {}
    for e in ents:
        company = companies.get(e["id"], {"id": e["id"], "name": e["name"], "changeYtd": 0})
        meta[e["id"]] = build_meta(facts_by_qid.get(e.get("qid"), {}), company, industry)
    return {"companyMeta": meta}
```

- [ ] **Step 3: Run tests** → PASS. Then live run + load + warm (same pattern as Task 2 Step 4, module `sources.wikidata`). Expected: dict with 10 metas, real CEOs (e.g. TSMC → C.C. Wei).

Verify: `curl -s http://localhost:4444/semiconductor/companies/nvidia | grep -o "Jensen Huang" | head -1` → `Jensen Huang`.

- [ ] **Step 4: Commit** — `git add etl/sources/wikidata.py etl/tests/test_sources.py && git commit -m "feat(etl): wikidata fetcher -> real companyMeta"`

---

## Task 4: PatentsView → `patents` (key-gated)

**Files:**
- Create: `etl/sources/patentsview.py`
- Test: `etl/tests/test_sources.py` (append)

- [ ] **Step 1: Write the failing test** — append:

```python
from sources.patentsview import normalize_patents


def test_normalize_patents():
    rows = normalize_patents("NVIDIA", total=1867,
                             cpc_counts={"G06": 934, "H01": 560, "G11": 373, "B60": 12})
    assert rows["company"] == "NVIDIA"
    assert rows["total"] == 1867
    assert rows["pending"] > 0
    assert len(rows["categories"]) == 3
    assert rows["categories"][0]["count"] >= rows["categories"][1]["count"]
```

Run → FAIL (no module).

- [ ] **Step 2: Write `etl/sources/patentsview.py`**

```python
"""USPTO PatentsView search API -> patents dataset. Requires PATENTSVIEW_API_KEY
(free, https://patentsview.org). Without a key, run() raises and the flow keeps
the seeded fixture — source isolation by design."""
import json
import entities
from config import PATENTSVIEW_API_KEY
from sources.base import get_json

API = "https://search.patentsview.org/api/v1/patent/"
CPC_LABEL = {  # coarse CPC class -> dashboard category label
    "G06": "Core Tech", "H01": "Materials", "H03": "Core Tech", "G11": "Packaging",
    "H04": "Core Tech", "G03": "Materials", "B81": "Packaging", "G02": "Materials",
}


def normalize_patents(company: str, total: int, cpc_counts: dict[str, int]) -> dict:
    by_label: dict[str, int] = {}
    for cpc, n in cpc_counts.items():
        by_label[CPC_LABEL.get(cpc, "Other")] = by_label.get(CPC_LABEL.get(cpc, "Other"), 0) + n
    top3 = sorted(by_label.items(), key=lambda kv: -kv[1])[:3]
    return {
        "company": company,
        "total": total,
        "pending": max(1, round(total * 0.18)),  # applications endpoint is a later add
        "categories": [{"name": name, "count": n} for name, n in top3],
    }


def _fetch_one(name: str) -> dict:
    q = {"_and": [{"_gte": {"patent_date": "2020-01-01"}},
                  {"_contains": {"assignees.assignee_organization": name}}]}
    fields = ["patent_id", "cpc_current.cpc_class"]
    data = get_json(
        API, f"patentsview_{name.lower().replace(' ', '_')}",
        params={"q": json.dumps(q), "f": json.dumps(fields), "o": json.dumps({"size": 1000})},
        headers={"X-Api-Key": PATENTSVIEW_API_KEY},
    )
    total = data.get("total_hits", 0)
    cpc_counts: dict[str, int] = {}
    for p in data.get("patents", []) or []:
        for c in p.get("cpc_current", []) or []:
            cls = (c.get("cpc_class") or "")[:3]
            if cls:
                cpc_counts[cls] = cpc_counts.get(cls, 0) + 1
    return normalize_patents(name, total, cpc_counts or {"G06": 1})


def run(industry: str = "semiconductor") -> dict:
    if not PATENTSVIEW_API_KEY:
        raise RuntimeError("PATENTSVIEW_API_KEY not set — keeping seeded patents fixture")
    return {"patents": [_fetch_one(e["name"]) for e in entities.load(industry)]}
```

- [ ] **Step 3: Run tests** → PASS. If a key is configured in `.env`, live-run + load + warm and curl `/semiconductor/companies/patents` → 200 with real totals. If no key, run `./.venv/bin/python -c "import sources.patentsview as p; p.run()"` and confirm the clean RuntimeError message.

- [ ] **Step 4: Commit** — `git add etl/sources/patentsview.py etl/tests/test_sources.py && git commit -m "feat(etl): patentsview fetcher -> patents (key-gated)"`

---

## Task 5: UN Comtrade → `shipments`

**Files:**
- Create: `etl/sources/comtrade.py`
- Test: `etl/tests/test_sources.py` (append)

- [ ] **Step 1: Write the failing test** — append:

```python
from sources.comtrade import normalize_shipment


def test_normalize_shipment():
    s = normalize_shipment({"reporterDesc": "Netherlands", "partnerDesc": "Taiwan",
                            "cmdCode": "8486", "primaryValue": 8.4e9})
    assert s["lane"] == "Netherlands → Taiwan"
    assert s["origin"] == "Netherlands" and s["destination"] == "Taiwan"
    assert s["mode"] == "air" and s["commodity"] == "Semiconductor Machinery"
    assert s["volume"] == "$8.4B/yr"
    assert s["risk"] in ("low", "medium", "high")
```

Run → FAIL.

- [ ] **Step 2: Write `etl/sources/comtrade.py`**

```python
"""UN Comtrade public preview API -> shipments (top export lanes for chip trade).
Uses the keyless preview endpoint (rate-limited but sufficient for 2 commodities)."""
from sources.base import get_json

API = "https://comtradeapi.un.org/public/v1/preview/C/A/HS"
COMMODITY = {"8542": ("Integrated Circuits", "sea"), "8486": ("Semiconductor Machinery", "air")}
HIGH_RISK = {"China", "Taiwan", "Other Asia, nes"}  # chokepoint-adjacent lanes
_REPORTERS = "158,410,528,842,392,156,276"  # TW, KR, NL, US, JP, CN, DE


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
                    "flowCode": "X", "partnerCode": None, "includeDesc": "true"},
        )
        rows = [r for r in data.get("data", [])
                if r.get("partnerDesc") not in (None, "World") and r.get("primaryValue")]
        rows.sort(key=lambda r: -r["primaryValue"])
        lanes += [normalize_shipment(r) for r in rows[:6]]
    lanes.sort(key=lambda s: -float(s["volume"].strip("$").split("B")[0].split("M")[0]))
    return {"shipments": lanes[:10]}
```

- [ ] **Step 3: Run tests** → PASS. Live run + load + warm; curl `/semiconductor/supply-chain/trade` → 200 and the Freight Lanes table shows real Comtrade lanes. If the preview endpoint rejects the multi-reporter call, fetch per-reporter in a loop (same params, one `reporterCode` each) — note whichever worked in the commit message.

- [ ] **Step 4: Commit** — `git add etl/sources/comtrade.py etl/tests/test_sources.py && git commit -m "feat(etl): comtrade fetcher -> real trade shipments"`

---

## Task 6: GDELT → `news`

**Files:**
- Create: `etl/sources/gdelt.py`
- Test: `etl/tests/test_sources.py` (append)

- [ ] **Step 1: Write the failing test** — append:

```python
from sources.gdelt import normalize_article


def test_normalize_article():
    n = normalize_article(
        {"title": "TSMC to expand Arizona fab amid export control tension",
         "seendate": "20260706T010000Z"},
        company="TSMC", idx=3, now_epoch=1_782_000_000)
    assert n["id"] == "n3" and n["company"] == "TSMC"
    assert n["impact"] == "high"          # matches 'export control' keyword
    assert n["headline"].startswith("TSMC to expand")
    assert n["ago"].endswith(" ago")
```

Run → FAIL.

- [ ] **Step 2: Write `etl/sources/gdelt.py`**

```python
"""GDELT 2.0 DOC API -> news dataset (latest English articles per company)."""
import calendar
import re
import time
import entities
from sources.base import get_json, ago

API = "https://api.gdeltproject.org/api/v2/doc/doc"
HIGH = re.compile(r"restrict|export control|ban|sanction|tension|halt|shortage|lawsuit", re.I)
MED = re.compile(r"delay|concern|probe|tariff|risk|cut|drop", re.I)


def _epoch(seendate: str) -> float:
    return calendar.timegm(time.strptime(seendate, "%Y%m%dT%H%M%SZ"))


def normalize_article(art: dict, company: str, idx: int, now_epoch: float | None = None) -> dict:
    title = art["title"].strip()
    impact = "high" if HIGH.search(title) else "medium" if MED.search(title) else "low"
    return {
        "id": f"n{idx}",
        "company": company,
        "headline": title[:140],
        "impact": impact,
        "impactLabel": f"Market Impact: {impact.capitalize()}",
        "ago": ago(_epoch(art["seendate"]), now_epoch),
    }


def run(industry: str = "semiconductor") -> dict:
    items, idx = [], 1
    for e in entities.load(industry):
        data = get_json(
            API, f"gdelt_{e['id']}",
            params={"query": f'"{e["name"]}" sourcelang:english', "mode": "ArtList",
                    "format": "json", "maxrecords": 4, "timespan": "3d", "sort": "DateDesc"},
            max_age_h=3,
        )
        seen: set[str] = set()
        for art in data.get("articles", []) or []:
            key = art["title"].strip().lower()
            if key in seen or not art.get("seendate"):
                continue
            seen.add(key)
            items.append(normalize_article(art, e["name"], idx))
            idx += 1
    return {"news": items[:30]}
```

- [ ] **Step 3: Run tests** → PASS. Live run + load + warm; curl `/semiconductor/companies/news` → 200 with real headlines and sensible sentiment split (the view derives sentiment from headline regexes).

- [ ] **Step 4: Commit** — `git add etl/sources/gdelt.py etl/tests/test_sources.py && git commit -m "feat(etl): gdelt fetcher -> real news"`

---

## Task 7: World Bank → patch `geo` tension

**Files:**
- Create: `etl/sources/worldbank.py`
- Test: `etl/tests/test_sources.py` (append)

- [ ] **Step 1: Write the failing test** — append:

```python
from sources.worldbank import patch_geo


def test_patch_geo_updates_tension_keeps_curated_fields():
    seeded = [{"country": "South Korea", "flag": "🇰🇷", "tension": 40,
               "role": "Memory", "localization": 70, "chokepoints": []},
              {"country": "Taiwan", "flag": "🇹🇼", "tension": 82,
               "role": "Logic", "localization": 88, "chokepoints": ["Taiwan Strait"]}]
    patched = patch_geo(seeded, {"South Korea": 55.2})
    by = {g["country"]: g for g in patched}
    assert by["South Korea"]["tension"] == 45          # 100 - 55.2 rounded
    assert by["South Korea"]["role"] == "Memory"       # curated fields preserved
    assert by["Taiwan"]["tension"] == 82               # no WB data for Taiwan -> untouched
```

Run → FAIL.

- [ ] **Step 2: Write `etl/sources/worldbank.py`**

```python
"""World Bank Political Stability percentile rank (PV.PER.RNK) -> geo.tension.
tension = 100 - percentile (less stable = more tension). Taiwan is absent from
World Bank data, so its curated tension is preserved (read-modify-write)."""
from real_loader import read_dataset
from sources.base import get_json

API = "https://api.worldbank.org/v2/country/{codes}/indicator/PV.PER.RNK"
COUNTRY = {"KOR": "South Korea", "USA": "United States", "NLD": "Netherlands",
           "JPN": "Japan", "CHN": "China", "DEU": "Germany"}


def patch_geo(seeded: list[dict], tension_by_country: dict[str, float]) -> list[dict]:
    out = []
    for g in seeded:
        g = dict(g)
        if g["country"] in tension_by_country:
            g["tension"] = round(100 - tension_by_country[g["country"]])
        out.append(g)
    return out


def run(industry: str = "semiconductor") -> dict:
    seeded = read_dataset(industry, "geo") or []
    data = get_json(API.format(codes=";".join(COUNTRY)), "worldbank_pv",
                    params={"format": "json", "mrnev": 1, "per_page": 60})
    ranks: dict[str, float] = {}
    for row in (data[1] if len(data) > 1 and data[1] else []):
        iso = row.get("countryiso3code")
        if iso in COUNTRY and row.get("value") is not None:
            ranks[COUNTRY[iso]] = float(row["value"])
    return {"geo": patch_geo(seeded, ranks)}
```

- [ ] **Step 3: Run tests** → PASS. Live run + load + warm; curl `/semiconductor/risk/geopolitical` → 200; tension values for WB-covered countries change from the fixture, Taiwan stays 82.

- [ ] **Step 4: Commit** — `git add etl/sources/worldbank.py etl/tests/test_sources.py && git commit -m "feat(etl): world bank fetcher -> real geo tension"`

---

## Task 8: Derived `kpis` + flow wiring (source isolation)

**Files:**
- Create: `etl/sources/derive.py`
- Modify: `etl/flows.py`
- Test: `etl/tests/test_sources.py` (append)

- [ ] **Step 1: Write the failing test** — append:

```python
from sources.derive import build_kpis


def test_build_kpis_patches_values_keeps_style():
    seeded = [{"label": "Companies Tracked", "value": "10", "icon": "Building2", "accent": "#3b82f6"},
              {"label": "Combined Market Cap", "value": "$9.9T", "icon": "DollarSign", "accent": "#a78bfa"}]
    companies = [{"marketCap": "$3.00T", "changeYtd": 10}, {"marketCap": "$500.0B", "changeYtd": -2}]
    kpis = build_kpis(seeded, companies, news_count=12)
    by = {k["label"]: k for k in kpis}
    assert by["Companies Tracked"]["value"] == "2"
    assert by["Combined Market Cap"]["value"] == "$3.5T"
    assert by["Companies Tracked"]["icon"] == "Building2"   # style preserved
```

Run → FAIL.

- [ ] **Step 2: Write `etl/sources/derive.py`**

```python
"""Derived KPIs: recompute numeric values from loaded real datasets, preserving
the seeded card styling (labels, icons, accents). Unknown labels pass through."""
from real_loader import read_dataset


def _cap_usd(cap: str) -> float:
    mult = {"T": 1e12, "B": 1e9, "M": 1e6}[cap[-1]]
    return float(cap.strip("$").rstrip("TBM").replace(",", "")) * mult


def _fmt_short(usd: float) -> str:
    """KPI-card style: one decimal for T, none for B ('$3.5T', '$870B')."""
    return f"${usd / 1e12:.1f}T" if usd >= 1e12 else f"${usd / 1e9:.0f}B"


def build_kpis(seeded: list[dict], companies: list[dict], news_count: int) -> list[dict]:
    total_cap = sum(_cap_usd(c["marketCap"]) for c in companies) if companies else 0
    computed = {
        "Companies Tracked": str(len(companies)),
        "Combined Market Cap": _fmt_short(total_cap) if total_cap else None,
        "News Items (7d)": str(news_count),
    }
    out = []
    for k in seeded:
        k = dict(k)
        if computed.get(k["label"]):
            k["value"] = computed[k["label"]]
        out.append(k)
    return out


def run(industry: str = "semiconductor") -> dict:
    seeded = read_dataset(industry, "kpis") or []
    companies = read_dataset(industry, "companies") or []
    news = read_dataset(industry, "news") or []
    return {"kpis": build_kpis(seeded, companies, len(news))}
```

Note: if the seeded semiconductor `kpis` labels differ from `Combined Market Cap` (check the fixture with `python3 -c "import json; print([k['label'] for k in json.load(open('etl/seeds/fixtures/semiconductor.json'))['kpis']])"` and use those exact strings), adjust the `computed` keys — value-patching only works on exact label match, and a mismatch harmlessly leaves the seeded value.

- [ ] **Step 3: Run tests** → PASS.

- [ ] **Step 4: Wire everything into `etl/flows.py`** — replace the file:

```python
"""Prefect flow: dump fixtures -> migrate -> seed load -> entity sync ->
real fetchers (each isolated) -> derived KPIs -> warm redis.

Run locally with: `python flows.py`  (or `make ingest`).
Seeds always load first, so a failing fetcher leaves the fixture row in place.
"""
import subprocess
from pathlib import Path
from prefect import flow, task, get_run_logger

import migrate
import seed_loader
import warm
import entities
import real_loader
from sources import yahoo, wikidata, patentsview, comtrade, gdelt, worldbank, derive

ROOT = Path(__file__).resolve().parent.parent
# Order matters: wikidata/derive read companies (yahoo), yahoo reads patents.
SOURCES = [patentsview, yahoo, wikidata, comtrade, gdelt, worldbank, derive]


@task(retries=1, retry_delay_seconds=2)
def dump_fixtures():
    subprocess.run(["npm", "run", "dump:fixtures"], cwd=ROOT, check=True)


@task(retries=2, retry_delay_seconds=2)
def apply_migrations():
    return migrate.run()


@task(retries=2, retry_delay_seconds=2)
def load_seeds():
    return seed_loader.run()


@task(retries=1, retry_delay_seconds=2)
def sync_entities():
    return entities.sync_company_table()


@task
def fetch_all(industry: str = "semiconductor") -> dict:
    """Run every source; a failure only skips that source's datasets."""
    log = get_run_logger()
    status = {}
    for mod in SOURCES:
        name = mod.__name__.rsplit(".", 1)[-1]
        try:
            loaded = real_loader.upsert_datasets(industry, mod.run(industry))
            status[name] = loaded
            log.info("source %s -> %s", name, loaded)
        except Exception as exc:  # noqa: BLE001 — isolation is the point
            status[name] = f"SKIPPED: {exc}"
            log.warning("source %s skipped: %s", name, exc)
    return status


@task(retries=2, retry_delay_seconds=2)
def warm_cache():
    return warm.run()


@flow(name="scr-ingest")
def ingest():
    dump_fixtures()
    apply_migrations()
    load_seeds()
    sync_entities()
    fetch_all()
    warm_cache()


if __name__ == "__main__":
    ingest()
```

- [ ] **Step 5: Full end-to-end run**

Run: `make ingest`
Expected: flow `Completed`; log shows each source either `-> [datasets]` or a clean `skipped:` line (patentsview skips without a key). Then:

```bash
docker compose exec -T postgres psql -U scr -d scr_radar -c \
  "select dataset, updated_at > now() - interval '10 minutes' as fresh from industry_dataset where industry='semiconductor' order by dataset;"
```

Expected: `companies`, `financials`, `research`, `companyMeta`, `shipments`, `news`, `geo`, `kpis` all `fresh = t`.

Run: `cd etl && ./.venv/bin/python -m pytest tests/ -v` → all PASS.
Curl sweep: `/semiconductor`, `/semiconductor/companies`, `/companies/news`, `/supply-chain/trade`, `/risk/geopolitical` → all 200. `/ai` and `/battery` → 200 (still seeded, untouched).

- [ ] **Step 6: Commit**

```bash
git add etl/sources/derive.py etl/flows.py etl/tests/test_sources.py
git commit -m "feat(etl): derived kpis + flow wiring with per-source isolation"
```

---

## Task 9: Docs

- [ ] **Step 1:** `docs/ROADMAP.md` Phase Z line: mark Plan 3 DONE (semiconductor live from Yahoo/Wikidata/Comtrade/GDELT/World Bank; PatentsView key-gated), Plan 4 (scheduling) next.
- [ ] **Step 2:** `etl/README.md`: document `etl/sources/` (one module per source, `run() -> {dataset: payload}`), the seeds-first/overwrite-second ordering, `etl/cache/` raw cache, and the optional `PATENTSVIEW_API_KEY`.
- [ ] **Step 3:** Commit `docs: plan 3 complete (semiconductor datasets fetched from real sources)`.

---

## Definition of Done (Plan 3)

- `make ingest` runs seeds → entity sync → all fetchers → warm, end-to-end, with per-source isolation (a dead API never blanks a page — the seeded fixture stays).
- Semiconductor `companies`, `financials`, `research`, `companyMeta`, `news`, `shipments` hold real fetched data; `geo` tension and `kpis` values are real-patched; `patents` is real when a PatentsView key is configured.
- AI/battery industries still render from seeded data through the identical path (no industry branching anywhere).
- `etl` pytest suite green; `npx tsc --noEmit` clean (no app changes expected); all routes 200.
- Curated datasets (materials prices, marketIntel, esg, deals, policies, supplierEdges, facilities, radar, sankey, suppliers, alerts) unchanged and documented as such.
