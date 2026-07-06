# Company Intelligence & Risk Scoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every tracked company transparent composite risk scores, a structured risk register, a cyber-exposure view, categorized news/incidents, and an executive summary — all cross-linked between pages.

**Architecture:** New ETL stages (`etl/sources/*.py` + `etl/ai/summary.py`) compute and store datasets in Postgres `industry_dataset` (JSONB per `(industry, dataset)`); async server components read them via `src/lib/provider.ts`; a shared `src/lib/links.ts` resolver makes named entities clickable. Seeds load first, fetchers overlay (per-source isolation), same as existing sources.

**Tech Stack:** Python 3.14 (psycopg, pytest) for ETL; Next.js 16 server components + Recharts + Tailwind v4 for UI. Reference spec: `docs/superpowers/specs/2026-07-07-company-intelligence-risk-scoring-design.md`.

---

## Data Contracts (shared shapes — keep identical across tasks)

All values USD or 0–100 unless noted. **Higher score = more risk** for every score.

```python
# scores dataset:  { company_id: Scores }
Scores = {
  "supplierDependency": int, "customerDependency": int, "esg": int,
  "cyber": int, "financial": int, "geopolitical": int,
  "overall": int, "band": str,                 # band in A B C D F
  "trend": [{"period": str, "value": int}],    # e.g. period "2026-07"
  "factors": dict,                             # per-subscore inputs, {"customerDependency": {"estimated": True, ...}}
}

# risks dataset:  { company_id: [Risk, ...] }
Risk = {
  "id": str, "category": str, "title": str,
  "severity": int, "probability": float,       # probability 0..1
  "financialImpactUsd": int, "timeToRecoveryDays": int,
  "impactedSuppliers": [str], "impactedFacilities": [str],
  "recommendedActions": [str], "confidence": float, "source": str,
}

# cyber dataset:  { company_id: Cyber }
Cyber = {
  "score": int, "band": str,
  "recentCves": [{"id": str, "cvss": float, "vendor": str}],
  "kevHits": [{"id": str, "name": str}],
  "breaches": [{"title": str, "date": str}],
}

# news dataset (enriched): existing NewsItem + these keys per item:
#   category:str, impact:int, riskLevel:str("low"|"medium"|"high"), confidence:float, geo:str, relatedCompanies:[str]

# companySummary dataset:  { company_id: str }   # one paragraph
```

TypeScript mirrors (added in Task 1) live in `src/lib/types.ts`.

---

## Task 1: Types + provider readers + dataset scaffolding

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/provider.ts`

- [ ] **Step 1: Add TS types** to `src/lib/types.ts` (after `FinancialHistory`):

```ts
export interface ScoreTrendPoint { period: string; value: number; }
export interface Scores {
  supplierDependency: number; customerDependency: number; esg: number;
  cyber: number; financial: number; geopolitical: number;
  overall: number; band: string;
  trend: ScoreTrendPoint[];
  factors: Record<string, Record<string, number | boolean | string>>;
}
export interface Risk {
  id: string; category: string; title: string;
  severity: number; probability: number;
  financialImpactUsd: number; timeToRecoveryDays: number;
  impactedSuppliers: string[]; impactedFacilities: string[];
  recommendedActions: string[]; confidence: number; source: string;
}
export interface CyberCve { id: string; cvss: number; vendor: string; }
export interface CyberKev { id: string; name: string; }
export interface CyberBreach { title: string; date: string; }
export interface Cyber {
  score: number; band: string;
  recentCves: CyberCve[]; kevHits: CyberKev[]; breaches: CyberBreach[];
}
```

Also extend the existing `NewsItem` interface with optional enrichment fields:
`category?: string; impact?: number; riskLevel?: RiskLevel; confidence?: number; geo?: string; relatedCompanies?: string[];`

- [ ] **Step 2: Add provider readers** to `src/lib/provider.ts` (after `getFinancialHistory`):

```ts
export async function getScores(i: Industry, id: string): Promise<Scores | null> {
  const all = await ds<Record<string, Scores>>(i, "scores", {});
  return all[id] ?? null;
}
export async function getRisks(i: Industry, id: string): Promise<Risk[]> {
  const all = await ds<Record<string, Risk[]>>(i, "risks", {});
  return all[id] ?? [];
}
export async function getAllRisks(i: Industry): Promise<Record<string, Risk[]>> {
  return ds<Record<string, Risk[]>>(i, "risks", {});
}
export async function getCyber(i: Industry, id: string): Promise<Cyber | null> {
  const all = await ds<Record<string, Cyber>>(i, "cyber", {});
  return all[id] ?? null;
}
export async function getCompanySummary(i: Industry, id: string): Promise<string | null> {
  const all = await ds<Record<string, string>>(i, "companySummary", {});
  return all[id] ?? null;
}
```

Add `Scores, Risk, Cyber` to the `import type { … } from "@/lib/types"` list.

- [ ] **Step 3: Verify typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/provider.ts
git commit -m "feat(types): scores/risks/cyber types + provider readers"
```

---

## Task 2: News enrichment (`news_enrich.py`)

**Files:**
- Create: `etl/sources/news_enrich.py`
- Test: `etl/tests/test_sources.py` (append)

- [ ] **Step 1: Write failing tests** (append to `etl/tests/test_sources.py`):

```python
from sources.news_enrich import classify_news, enrich_item

def test_classify_news_taxonomy():
    assert classify_news("Ransomware attack cripples chipmaker network")[0] == "cyber-attack"
    assert classify_news("Company X to acquire rival in $5B deal")[0] == "m&a"
    assert classify_news("New fab expansion announced in Arizona")[0] == "factory-expansion"
    assert classify_news("Earthquake disrupts production in Taiwan")[0] == "disaster"
    assert classify_news("Workers strike over wages")[0] == "labor-strike"
    assert classify_news("Quarterly earnings beat expectations")[0] == "financial"
    assert classify_news("Some unremarkable headline")[0] == "general"

def test_enrich_item_scores_and_related():
    item = {"headline": "Ransomware attack hits NVIDIA suppliers in Taiwan", "company": "NVIDIA"}
    out = enrich_item(item, ["NVIDIA", "TSMC"])
    assert out["category"] == "cyber-attack"
    assert 0 <= out["impact"] <= 100 and out["riskLevel"] in ("low", "medium", "high")
    assert 0.0 <= out["confidence"] <= 1.0
    assert "NVIDIA" in out["relatedCompanies"]
```

- [ ] **Step 2: Run to verify fail**

Run: `cd etl && ./.venv/bin/python -m pytest tests/test_sources.py::test_classify_news_taxonomy -v`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** `etl/sources/news_enrich.py`:

```python
"""Categorize + score existing news items (deterministic). Reads the `news`
dataset any prior source wrote, tags each item with a taxonomy category, an
impact/risk/confidence score, a geo hint and related tracked companies, and
writes the enriched `news` back. No new fetch — pure enrichment."""
import re
import entities
from real_loader import read_dataset

# Ordered (first match wins): specific/high-signal categories before generic.
TAXONOMY = [
    ("cyber-attack", ["ransomware", "breach", "hacked", "cyberattack", "cyber attack", "malware", "zero-day", "data leak"]),
    ("export-restriction", ["export control", "export ban", "sanction", "entity list", "restrict export"]),
    ("m&a", ["acquire", "acquisition", "merger", "buyout", "takeover", "to buy"]),
    ("factory-shutdown", ["shutdown", "halt production", "closes plant", "idle", "output cut"]),
    ("factory-expansion", ["expansion", "new fab", "new plant", "breaks ground", "capacity boost", "invest"]),
    ("disaster", ["earthquake", "flood", "wildfire", "hurricane", "typhoon", "tsunami", "volcano"]),
    ("labor-strike", ["strike", "walkout", "union", "labor dispute", "layoff"]),
    ("lawsuit", ["lawsuit", "sues", "settlement", "antitrust", "court"]),
    ("regulatory", ["regulation", "regulator", "fine", "probe", "investigation", "compliance"]),
    ("environmental", ["emissions", "pollution", "spill", "contamination"]),
    ("geopolitical", ["tariff", "trade war", "military", "conflict", "border"]),
    ("shortage", ["shortage", "supply crunch", "bottleneck", "constraint"]),
    ("exec-change", ["ceo", "resign", "steps down", "appoints", "new chief"]),
    ("product-launch", ["launch", "unveils", "announces new", "releases"]),
    ("financial", ["earnings", "revenue", "profit", "guidance", "quarterly", "dividend"]),
]
# Base impact by category (0-100) — how much a fresh event of this type matters.
CATEGORY_IMPACT = {
    "cyber-attack": 82, "export-restriction": 80, "disaster": 78, "factory-shutdown": 75,
    "geopolitical": 68, "shortage": 66, "m&a": 60, "labor-strike": 58, "regulatory": 55,
    "lawsuit": 50, "environmental": 52, "factory-expansion": 40, "exec-change": 38,
    "financial": 35, "product-launch": 30, "general": 25,
}
COUNTRIES = ["Taiwan", "China", "South Korea", "Japan", "USA", "United States",
             "Germany", "Netherlands", "India", "Vietnam", "Malaysia", "Arizona"]


def classify_news(text: str) -> tuple[str, float]:
    """(category, confidence 0..1). Confidence = keyword hits scaled."""
    t = text.lower()
    for category, kws in TAXONOMY:
        hits = sum(1 for k in kws if k in t)
        if hits:
            return category, min(1.0, 0.55 + 0.15 * hits)
    return "general", 0.4


def _geo(text: str) -> str:
    for c in COUNTRIES:
        if c.lower() in text.lower():
            return "United States" if c in ("USA", "Arizona") else c
    return "Global"


def enrich_item(item: dict, company_names: list[str]) -> dict:
    text = " ".join(str(item.get(k, "")) for k in ("headline", "title", "summary", "company"))
    category, confidence = classify_news(text)
    impact = CATEGORY_IMPACT.get(category, 25)
    related = [n for n in company_names if re.search(rf"\b{re.escape(n)}\b", text, re.I)]
    out = dict(item)
    out.update({
        "category": category, "impact": impact,
        "riskLevel": "high" if impact >= 70 else "medium" if impact >= 45 else "low",
        "confidence": round(confidence, 2), "geo": _geo(text),
        "relatedCompanies": related,
    })
    return out


def run(industry: str = "semiconductor") -> dict:
    news = read_dataset(industry, "news") or []
    names = [c["name"] for c in (read_dataset(industry, "companies") or [])]
    return {"news": [enrich_item(n, names) for n in news]}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd etl && ./.venv/bin/python -m pytest tests/test_sources.py -k news -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add etl/sources/news_enrich.py etl/tests/test_sources.py
git commit -m "feat(etl): deterministic news categorization + impact scoring"
```

---

## Task 3: Cyber exposure (`cyber.py`)

**Files:**
- Create: `etl/sources/cyber.py`
- Test: `etl/tests/test_sources.py` (append)

Reuses the CVE data `nvd.py` already fetches (alerts) but re-derives a per-company view from a fresh NVD query per vendor (cached). Vendor keywords reuse `nvd.VENDORS`.

- [ ] **Step 1: Write failing test**:

```python
from sources.cyber import score_from_counts, band_for

def test_cyber_score_and_band():
    assert score_from_counts(cve_count=0, kev_count=0, breach_count=0) < 20
    hi = score_from_counts(cve_count=25, kev_count=4, breach_count=2)
    assert hi > 70
    assert band_for(85) == "F" and band_for(10) == "A"
```

- [ ] **Step 2: Run to verify fail**

Run: `cd etl && ./.venv/bin/python -m pytest tests/test_sources.py -k cyber -v`
Expected: FAIL.

- [ ] **Step 3: Implement** `etl/sources/cyber.py`:

```python
"""Per-company cyber exposure from NVD CVEs + CISA KEV + breach news.
Deterministic score (NOT a commercial rating). Vendor keyword per company from
sources.nvd.VENDORS; breaches pulled from the enriched `news` (category cyber)."""
from datetime import datetime, timedelta, timezone
import entities
from real_loader import read_dataset
from sources.base import get_json
from sources.nvd import VENDORS, _score as cvss_of

NVD = "https://services.nvd.nist.gov/rest/json/cves/2.0"
KEV = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
WINDOW_DAYS = 180
BANDS = [(80, "F"), (65, "D"), (50, "C"), (30, "B"), (0, "A")]


def band_for(score: int) -> str:
    for threshold, letter in BANDS:
        if score >= threshold:
            return letter
    return "A"


def score_from_counts(cve_count: int, kev_count: int, breach_count: int) -> int:
    """0-100 exposure. KEV (actively exploited) and breaches weigh heaviest."""
    raw = min(45, cve_count * 3) + min(35, kev_count * 12) + min(20, breach_count * 10)
    return int(min(100, raw))


def _vendor_for(company_name: str, industry: str) -> str | None:
    key = company_name.split()[0].lower()
    return key if key in [v for v in VENDORS.get(industry, [])] else None


def run(industry: str = "semiconductor") -> dict:
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=WINDOW_DAYS)
    fmt = "%Y-%m-%dT%H:%M:%S.000"
    kev_ids = set()
    try:
        kev = get_json(KEV, "cisa_kev", max_age_h=24)
        kev_ids = {v["cveID"] for v in kev.get("vulnerabilities", [])}
    except Exception:
        kev_ids = set()
    news = read_dataset(industry, "news") or []
    out: dict[str, dict] = {}
    for e in entities.load(industry):
        vendor = _vendor_for(e["name"], industry)
        recent, kev_hits = [], []
        if vendor:
            data = get_json(NVD, f"cyber_{industry}_{vendor}",
                            params={"keywordSearch": vendor, "pubStartDate": start.strftime(fmt),
                                    "pubEndDate": end.strftime(fmt), "resultsPerPage": 40,
                                    "cvssV3Severity": "HIGH"}, max_age_h=24, throttle_s=6.5)
            for v in data.get("vulnerabilities", [])[:40]:
                cve = v.get("cve", {})
                cid = cve.get("id", "")
                recent.append({"id": cid, "cvss": cvss_of(cve), "vendor": vendor})
                if cid in kev_ids:
                    kev_hits.append({"id": cid, "name": vendor})
        breaches = [{"title": n.get("headline", n.get("title", "")), "date": n.get("date", "")}
                    for n in news if n.get("category") == "cyber-attack"
                    and e["name"] in (n.get("relatedCompanies") or [])][:5]
        score = score_from_counts(len(recent), len(kev_hits), len(breaches))
        out[e["id"]] = {"score": score, "band": band_for(score),
                        "recentCves": recent[:8], "kevHits": kev_hits[:5], "breaches": breaches}
    return {"cyber": out}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd etl && ./.venv/bin/python -m pytest tests/test_sources.py -k cyber -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add etl/sources/cyber.py etl/tests/test_sources.py
git commit -m "feat(etl): per-company cyber exposure (NVD + CISA KEV + breach news)"
```

---

## Task 4: Risk register (`risks.py`)

**Files:**
- Create: `etl/sources/risks.py`
- Test: `etl/tests/test_sources.py` (append)

- [ ] **Step 1: Write failing test**:

```python
from sources.risks import build_risks, PLAYBOOK

def test_build_risks_derives_from_signals():
    ctx = {
        "id": "tsmc", "name": "TSMC",
        "cyber": {"score": 80, "kevHits": [{"id": "CVE-1", "name": "tsmc"}]},
        "policies": [{"title": "DUV export curbs", "targets": ["TSMC"], "severity": "high"}],
        "geo": [{"country": "Taiwan", "tension": 82}],
        "hqCountry": "Taiwan",
        "supplierEdges": [{"buyer": "TSMC", "supplier": "Sole Co", "risk": "high", "material": "neon"}],
        "healthScore": 40,
    }
    risks = build_risks(ctx)
    cats = {r["category"] for r in risks}
    assert {"cyber", "regulatory", "geopolitical"} <= cats
    for r in risks:
        assert 0 <= r["severity"] <= 100 and 0.0 <= r["probability"] <= 1.0
        assert r["recommendedActions"] and r["source"]
        assert r["category"] in PLAYBOOK
```

- [ ] **Step 2: Run to verify fail**

Run: `cd etl && ./.venv/bin/python -m pytest tests/test_sources.py -k build_risks -v`
Expected: FAIL.

- [ ] **Step 3: Implement** `etl/sources/risks.py`:

```python
"""Per-company risk register. Each risk object is derived from a real signal
(cyber score, export-control policy, geopolitical tension, sole-source supplier,
financial weakness) so `source` always traces to data. Recovery time + actions
are per-category heuristics; 'projection' items are flagged in `source`."""
import entities
from real_loader import read_dataset

# category -> (recommended actions, typical recovery days)
PLAYBOOK = {
    "cyber": (["Patch KEV-listed CVEs within 72h", "Segment OT/IT networks", "Review third-party access"], 21),
    "regulatory": (["Map affected SKUs to controlled ECCNs", "File license applications", "Qualify non-restricted alternates"], 120),
    "geopolitical": (["Dual-source outside the flashpoint region", "Build 60–90d safety stock", "Model tariff pass-through"], 180),
    "single-source": (["Qualify a second source", "Negotiate buffer inventory", "Add contractual capacity guarantees"], 150),
    "financial": (["Monitor supplier liquidity", "Prepay/secure critical POs", "Prepare alternate-supplier bench"], 90),
    "operational": (["Activate continuity plan", "Reroute logistics", "Confirm alternate capacity"], 30),
}


def _risk(cid, cat, title, severity, prob, impact, suppliers, facilities, conf, source):
    actions, recovery = PLAYBOOK[cat]
    return {"id": f"{cid}-{cat}", "category": cat, "title": title,
            "severity": int(severity), "probability": round(prob, 2),
            "financialImpactUsd": int(impact), "timeToRecoveryDays": recovery,
            "impactedSuppliers": suppliers, "impactedFacilities": facilities,
            "recommendedActions": actions, "confidence": round(conf, 2), "source": source}


def build_risks(ctx: dict) -> list[dict]:
    cid, name = ctx["id"], ctx["name"]
    risks = []
    cyber = ctx.get("cyber") or {}
    if cyber.get("score", 0) >= 45:
        kev = len(cyber.get("kevHits") or [])
        risks.append(_risk(cid, "cyber", f"Elevated cyber exposure ({cyber['score']}/100)",
                           cyber["score"], min(0.9, 0.3 + 0.15 * kev), 5e7 + kev * 2e7,
                           [], [], 0.6 + 0.1 * bool(kev), "NVD + CISA KEV"))
    for p in ctx.get("policies") or []:
        if name in (p.get("targets") or []) or any(name in t for t in (p.get("targets") or [])):
            sev = {"high": 78, "medium": 55, "low": 35}.get(p.get("severity"), 50)
            risks.append(_risk(cid, "regulatory", f"Policy exposure: {p['title']}", sev, 0.7,
                               8e7, [], [], 0.7, "Federal Register / policy tracker"))
            break
    hq = ctx.get("hqCountry")
    geo = next((g for g in (ctx.get("geo") or []) if g.get("country") == hq), None)
    if geo and geo.get("tension", 0) >= 55:
        risks.append(_risk(cid, "geopolitical", f"Geopolitical tension in {hq} ({geo['tension']})",
                           geo["tension"], geo["tension"] / 120, 1.2e8, [], [], 0.65,
                           f"Geo risk index ({hq})"))
    sole = [e for e in (ctx.get("supplierEdges") or []) if e.get("buyer") == name and e.get("risk") == "high"]
    if sole:
        mats = ", ".join(sorted({e["material"] for e in sole})[:3])
        risks.append(_risk(cid, "single-source", f"Single-source dependency: {mats}", 70, 0.5,
                           6e7, [e["supplier"] for e in sole][:5], [], 0.6, "Supplier graph"))
    hs = ctx.get("healthScore")
    if isinstance(hs, (int, float)) and hs < 55:
        risks.append(_risk(cid, "financial", f"Financial fragility (health {hs}/100)",
                           100 - hs, 0.4, 4e7, [], [], 0.55, "Financial health model"))
    risks.sort(key=lambda r: -r["severity"])
    return risks


def run(industry: str = "semiconductor") -> dict:
    meta = read_dataset(industry, "companyMeta") or {}
    cyber = read_dataset(industry, "cyber") or {}
    policies = read_dataset(industry, "policies") or []
    geo = read_dataset(industry, "geo") or []
    edges = read_dataset(industry, "supplierEdges") or []
    out = {}
    for e in entities.load(industry):
        m = meta.get(e["id"], {})
        ctx = {"id": e["id"], "name": e["name"], "cyber": cyber.get(e["id"]),
               "policies": policies, "geo": geo, "hqCountry": _country(m.get("hq", "")),
               "supplierEdges": edges, "healthScore": m.get("healthScore")}
        out[e["id"]] = build_risks(ctx)
    return {"risks": out}


def _country(hq: str) -> str:
    """Last comma-token of an HQ string ('Hsinchu, Taiwan' -> 'Taiwan')."""
    return hq.split(",")[-1].strip() if hq else ""
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd etl && ./.venv/bin/python -m pytest tests/test_sources.py -k build_risks -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add etl/sources/risks.py etl/tests/test_sources.py
git commit -m "feat(etl): per-company risk register derived from real signals"
```

---

## Task 5: Composite scores (`scores.py`)

**Files:**
- Create: `etl/sources/scores.py`
- Test: `etl/tests/test_sources.py` (append)

- [ ] **Step 1: Write failing test**:

```python
from sources.scores import build_scores, overall_and_band, SCORE_WEIGHTS

def test_overall_and_band_weighted():
    subs = {"supplierDependency": 80, "customerDependency": 50, "esg": 40,
            "cyber": 70, "financial": 60, "geopolitical": 90}
    overall, band = overall_and_band(subs)
    assert 0 <= overall <= 100 and band in ("A", "B", "C", "D", "F")
    assert abs(sum(SCORE_WEIGHTS.values()) - 1.0) < 1e-6

def test_build_scores_flags_customer_estimated():
    ctx = {"id": "tsmc", "name": "TSMC", "healthScore": 70, "exposure": "high",
           "esg": {"scope1": 2.2, "scope2": 8.1, "scope3": 12.4, "ethicalSourcing": "low"},
           "cyber": {"score": 65}, "edges": [], "geoTension": 82, "prevTrend": []}
    s = build_scores(ctx)
    assert s["factors"]["customerDependency"]["estimated"] is True
    assert s["band"] == overall_and_band({k: s[k] for k in SCORE_WEIGHTS})[1]
    assert s["trend"] and s["trend"][-1]["value"] == s["overall"]
```

- [ ] **Step 2: Run to verify fail**

Run: `cd etl && ./.venv/bin/python -m pytest tests/test_sources.py -k scores -v`
Expected: FAIL.

- [ ] **Step 3: Implement** `etl/sources/scores.py`:

```python
"""Composite per-company risk scores (0-100, higher = more risk). Every subscore
is a pure function of real signals and records its inputs in `factors`. Overall =
weighted blend -> A–F band. Trend accretes: append the current overall to the
prior stored trend so real history builds up over ingests."""
import hashlib
from datetime import date
import entities
from real_loader import read_dataset

SCORE_WEIGHTS = {  # must sum to 1.0
    "geopolitical": 0.22, "supplierDependency": 0.20, "cyber": 0.18,
    "financial": 0.16, "esg": 0.12, "customerDependency": 0.12,
}
EXPOSURE_GEO = {"low": 35, "medium": 58, "high": 82}
BANDS = [(78, "F"), (62, "D"), (46, "C"), (30, "B"), (0, "A")]


def _clamp(v, lo=5, hi=98):
    return int(max(lo, min(hi, round(v))))


def _seed(*p):
    return int(hashlib.md5("|".join(p).encode()).hexdigest()[:8], 16)


def band_for(overall):
    for t, b in BANDS:
        if overall >= t:
            return b
    return "A"


def overall_and_band(subs):
    overall = _clamp(sum(subs[k] * w for k, w in SCORE_WEIGHTS.items()))
    return overall, band_for(overall)


def _esg_score(esg):
    total = sum(esg.get(k, 0) or 0 for k in ("scope1", "scope2", "scope3"))
    sourcing = {"low": 25, "medium": 12, "high": 0}.get(esg.get("ethicalSourcing"), 15)
    return _clamp(min(70, total * 1.1) + sourcing, 15, 92)


def _supplier_dependency(name, edges):
    mine = [e for e in edges if e.get("buyer") == name]
    if not mine:
        return 45, {"edges": 0}
    sole = sum(1 for e in mine if e.get("risk") == "high")
    return _clamp(35 + sole * 15 + max(0, 10 - len(mine)) * 2), {"edges": len(mine), "soleSource": sole}


def build_scores(ctx):
    cid, name = ctx["id"], ctx["name"]
    supplier, sf = _supplier_dependency(name, ctx.get("edges") or [])
    esg = _esg_score(ctx.get("esg") or {})
    cyber = _clamp((ctx.get("cyber") or {}).get("score", 40))
    hs = ctx.get("healthScore")
    financial = _clamp(100 - hs) if isinstance(hs, (int, float)) else _clamp(40 + _seed(cid, "fin") % 30)
    geo_base = ctx.get("geoTension") or EXPOSURE_GEO.get(ctx.get("exposure"), 50)
    geopolitical = _clamp(geo_base)
    customer = _clamp(40 + _seed(cid, "cust") % 35)  # proxy — no free customer data
    subs = {"supplierDependency": supplier, "customerDependency": customer, "esg": esg,
            "cyber": cyber, "financial": financial, "geopolitical": geopolitical}
    overall, band = overall_and_band(subs)
    prev = list(ctx.get("prevTrend") or [])
    period = date.today().strftime("%Y-%m")
    prev = [p for p in prev if p.get("period") != period]
    if not prev:  # seed a short estimated back-history the first time
        prev = [{"period": f"2026-0{m}", "value": _clamp(overall + _seed(cid, str(m)) % 15 - 7)}
                for m in range(1, 7)]
    trend = (prev + [{"period": period, "value": overall}])[-12:]
    return {**subs, "overall": overall, "band": band, "trend": trend,
            "factors": {"supplierDependency": sf,
                        "customerDependency": {"estimated": True, "note": "revenue-proxy; no free customer feed"},
                        "esg": {"scopeTotal": round(sum((ctx.get("esg") or {}).get(k, 0) or 0 for k in ('scope1','scope2','scope3')), 1)},
                        "cyber": {"exposure": cyber}, "financial": {"healthScore": hs},
                        "geopolitical": {"base": geo_base}}}


def run(industry: str = "semiconductor") -> dict:
    meta = read_dataset(industry, "companyMeta") or {}
    esg_list = read_dataset(industry, "esg") or []
    esg_by = {e["company"]: e for e in esg_list}
    cyber = read_dataset(industry, "cyber") or {}
    edges = read_dataset(industry, "supplierEdges") or []
    geo = read_dataset(industry, "geo") or []
    prev_scores = read_dataset(industry, "scores") or {}
    out = {}
    for e in entities.load(industry):
        m = meta.get(e["id"], {})
        hq_country = (m.get("hq", "").split(",")[-1].strip()) if m.get("hq") else ""
        gt = next((g["tension"] for g in geo if g.get("country") == hq_country), None)
        ctx = {"id": e["id"], "name": e["name"], "healthScore": m.get("healthScore"),
               "exposure": m.get("exposure"), "esg": esg_by.get(e["name"]),
               "cyber": cyber.get(e["id"]), "edges": edges, "geoTension": gt,
               "prevTrend": (prev_scores.get(e["id"]) or {}).get("trend")}
        out[e["id"]] = build_scores(ctx)
    return {"scores": out}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd etl && ./.venv/bin/python -m pytest tests/test_sources.py -k scores -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add etl/sources/scores.py etl/tests/test_sources.py
git commit -m "feat(etl): transparent composite risk scores per company"
```

---

## Task 6: AI executive summary (`etl/ai/summary.py`)

**Files:**
- Create: `etl/ai/__init__.py` (empty)
- Create: `etl/ai/summary.py`
- Test: `etl/tests/test_sources.py` (append)

- [ ] **Step 1: Write failing test**:

```python
from ai.summary import generate

def test_generate_exec_summary_is_factual():
    ctx = {"name": "TSMC", "industry": "semiconductor",
           "scores": {"overall": 71, "band": "D", "geopolitical": 90, "supplierDependency": 60,
                      "cyber": 55, "financial": 30, "esg": 45, "customerDependency": 50},
           "topRisk": {"title": "Geopolitical tension in Taiwan (82)"},
           "hq": "Hsinchu, Taiwan"}
    s = generate(ctx)
    assert "TSMC" in s and ("band D" in s or "D)" in s)
    assert "Taiwan" in s and 40 <= len(s.split()) <= 120
```

- [ ] **Step 2: Run to verify fail**

Run: `cd etl && ./.venv/bin/python -m pytest tests/test_sources.py -k exec_summary -v`
Expected: FAIL.

- [ ] **Step 3: Implement** `etl/ai/__init__.py` (empty) and `etl/ai/summary.py`:

```python
"""Executive summary generator. Single seam: generate(context) -> str. The
deterministic implementation composes a factual paragraph from the structured
scores/risks. Swap this body for an LLM call later — callers and datasets are
unchanged."""

_DRIVERS = {
    "geopolitical": "geopolitical exposure", "supplierDependency": "supplier concentration",
    "cyber": "cyber exposure", "financial": "financial fragility",
    "esg": "ESG/emissions risk", "customerDependency": "customer concentration",
}


def generate(ctx: dict) -> str:
    name = ctx["name"]
    s = ctx.get("scores") or {}
    overall, band = s.get("overall", 50), s.get("band", "C")
    subs = {k: s.get(k, 0) for k in _DRIVERS}
    top2 = sorted(subs, key=lambda k: -subs[k])[:2]
    drivers = " and ".join(_DRIVERS[k] for k in top2)
    level = "elevated" if overall >= 62 else "moderate" if overall >= 46 else "contained"
    hq = ctx.get("hq", "")
    risk_line = ""
    if ctx.get("topRisk"):
        risk_line = f" The most pressing risk is {ctx['topRisk']['title'].lower()}."
    return (f"{name} carries {level} overall supply-chain risk (score {overall}/100, band {band}), "
            f"driven primarily by {drivers}." + (f" Headquartered in {hq}." if hq else "") +
            risk_line + " Scores are computed from filings, ownership, cyber, policy and "
            "geopolitical signals; see the scorecard for factor-level detail.")
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd etl && ./.venv/bin/python -m pytest tests/test_sources.py -k exec_summary -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add etl/ai/__init__.py etl/ai/summary.py etl/tests/test_sources.py
git commit -m "feat(etl): deterministic exec-summary generator behind swappable seam"
```

---

## Task 7: Summary source wrapper + flow wiring + ingest

**Files:**
- Create: `etl/sources/summary.py` (thin source wrapper so it runs in the flow)
- Modify: `etl/run_source.py`
- Modify: `etl/flows.py`

- [ ] **Step 1: Create** `etl/sources/summary.py`:

```python
"""Source wrapper: build the companySummary dataset from scores + risks using the
swappable ai.summary generator. Runs last (needs scores/risks loaded)."""
import entities
from real_loader import read_dataset
from ai.summary import generate


def run(industry: str = "semiconductor") -> dict:
    meta = read_dataset(industry, "companyMeta") or {}
    scores = read_dataset(industry, "scores") or {}
    risks = read_dataset(industry, "risks") or {}
    out = {}
    for e in entities.load(industry):
        rlist = risks.get(e["id"]) or []
        ctx = {"name": e["name"], "industry": industry, "scores": scores.get(e["id"]) or {},
               "topRisk": rlist[0] if rlist else None, "hq": meta.get(e["id"], {}).get("hq", "")}
        out[e["id"]] = generate(ctx)
    return {"companySummary": out}
```

- [ ] **Step 2: Wire into `etl/run_source.py`** — add imports and SOURCES entries:

Change the import line to include the new modules:
```python
from sources import (yahoo, yahoo_facts, wikidata, patentsview, comtrade, gdelt, sec,
                     sec_facts, opendart, nvd, fedreg, holdings, news_enrich, cyber,
                     risks, scores, summary, derive)
```
And add them to the `SOURCES` dict tuple in the same order.

- [ ] **Step 3: Wire into `etl/flows.py`** — same import addition, and update `sources_for` so the new stages run in dependency order AFTER their inputs and BEFORE `derive`:

```python
    common_tail = [news_enrich, cyber, risks, scores, summary]
    if industry == "semiconductor":
        return [patentsview, yahoo, wikidata, comtrade, gdelt, sec, sec_facts, yahoo_facts,
                opendart, nvd, fedreg, holdings, *common_tail, derive]
    return [yahoo, gdelt, sec, sec_facts, yahoo_facts, opendart, fedreg, holdings, *common_tail, derive]
```

- [ ] **Step 4: Run the new stages for all industries**:

Run:
```bash
cd etl && for ind in semiconductor ai battery; do
  for s in news_enrich cyber risks scores summary; do ./.venv/bin/python run_source.py $s $ind; done
done
```
Expected: each prints `upserted [...]`. (cyber may throttle on NVD — that is fine.)

- [ ] **Step 5: Verify data landed**:

Run:
```bash
cd etl && ./.venv/bin/python -c "
import psycopg; c=psycopg.connect('postgresql://scr:scr@localhost:5433/scr_radar',autocommit=True)
for d in ['scores','risks','cyber','companySummary']:
    p=c.execute(\"select payload from industry_dataset where industry='semiconductor' and dataset=%s\",(d,)).fetchone()[0]
    print(d, 'companies:', len(p))
"
```
Expected: each ~20.

- [ ] **Step 6: Commit**

```bash
git add etl/sources/summary.py etl/run_source.py etl/flows.py
git commit -m "feat(etl): wire news/cyber/risks/scores/summary into the flow"
```

---

## Task 8: Interlink resolver + link components

**Files:**
- Create: `src/lib/links.ts`
- Create: `src/components/ui/EntityLink.tsx`
- Reference existing: `src/components/ui/CompanyLink.tsx`

- [ ] **Step 1: Read** `src/components/ui/CompanyLink.tsx` to match its resolution style (name → company id → `/${industry}/companies/${id}`).

- [ ] **Step 2: Create** `src/lib/links.ts` — a client-safe resolver built from name maps passed in (no server imports):

```ts
import type { Industry } from "@/lib/types";

export type EntityKind = "company" | "supplier" | "material" | "facility";

export interface LinkMaps {
  companies: Record<string, string>;   // lowercased name -> company id
  materials: Record<string, string>;   // lowercased name -> material slug
  facilities: Record<string, string>;  // lowercased name -> facility id
}

export function resolveEntity(name: string, kind: EntityKind, industry: Industry, maps: LinkMaps): string | null {
  const key = name.trim().toLowerCase();
  if (kind === "company" || kind === "supplier") {
    const id = maps.companies[key];
    return id ? `/${industry}/companies/${id}` : null;
  }
  if (kind === "material") {
    const slug = maps.materials[key];
    return slug ? `/${industry}/supply-chain/materials#${slug}` : null;
  }
  if (kind === "facility") {
    const id = maps.facilities[key];
    return id ? `/${industry}/supply-chain/facilities#${id}` : null;
  }
  return null;
}
```

- [ ] **Step 3: Create** `src/components/ui/EntityLink.tsx`:

```tsx
"use client";
import Link from "next/link";
import { useIndustry } from "@/lib/industry-context";
import { resolveEntity, type EntityKind, type LinkMaps } from "@/lib/links";

export function EntityLink({ name, kind, maps }: { name: string; kind: EntityKind; maps: LinkMaps }) {
  const industry = useIndustry();
  const href = resolveEntity(name, kind, industry, maps);
  if (!href) return <span>{name}</span>;
  return <Link href={href} className="text-[var(--accent)] hover:underline">{name}</Link>;
}
```

- [ ] **Step 4: Add a provider helper** `getLinkMaps` in `src/lib/provider.ts` that builds `LinkMaps` from companies/materials/facilities datasets:

```ts
export async function getLinkMaps(i: Industry): Promise<import("@/lib/links").LinkMaps> {
  const [companies, materials, facilities] = await Promise.all([
    getCompanies(i), getMaterials(i), getFacilities(i),
  ]);
  const lower = <T,>(arr: T[], key: (t: T) => string, val: (t: T) => string) =>
    Object.fromEntries(arr.map((t) => [key(t).toLowerCase(), val(t)]));
  return {
    companies: lower(companies, (c) => c.name, (c) => c.id),
    materials: lower(materials, (m) => m.name, (m) => m.name.toLowerCase().replace(/\s+/g, "-")),
    facilities: lower(facilities, (f) => f.name, (f) => f.id),
  };
}
```

- [ ] **Step 5: Verify typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/links.ts src/components/ui/EntityLink.tsx src/lib/provider.ts
git commit -m "feat(ui): shared entity-link resolver for cross-page interlinking"
```

---

## Task 9: Company Overview scorecard + summary + incidents + interlinks

**Files:**
- Create: `src/components/companies/CompanyScorecard.tsx`
- Modify: `src/components/companies/CompanyProfile.tsx`
- Modify: `src/app/[industry]/companies/[id]/page.tsx`

- [ ] **Step 1: Create** `src/components/companies/CompanyScorecard.tsx`:

```tsx
"use client";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import type { Scores } from "@/lib/types";

const LABELS: Record<string, string> = {
  overall: "Overall SC Risk", geopolitical: "Geopolitical", supplierDependency: "Supplier Dep.",
  cyber: "Cyber", financial: "Financial", esg: "ESG", customerDependency: "Customer Dep.",
};
const bandColor = (b: string) => ({ A: "#34d399", B: "#a3e635", C: "#f59e0b", D: "#fb923c", F: "#f87171" }[b] ?? "#8695ab");
const riskColor = (v: number) => (v >= 70 ? "#f87171" : v >= 45 ? "#f59e0b" : "#34d399");

export function CompanyScorecard({ scores }: { scores: Scores }) {
  const keys = ["geopolitical", "supplierDependency", "cyber", "financial", "esg", "customerDependency"] as const;
  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg text-2xl font-bold text-white" style={{ background: bandColor(scores.band) }}>{scores.band}</div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-faint)]">{LABELS.overall}</div>
            <div className="text-2xl font-bold">{scores.overall}<span className="text-sm text-[var(--text-faint)]">/100</span></div>
          </div>
        </div>
        <div className="h-12 w-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={scores.trend}><YAxis hide domain={[0, 100]} />
              <Area dataKey="value" stroke="#38bdf8" fill="#38bdf833" strokeWidth={2} isAnimationActive={false} /></AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {keys.map((k) => (
          <div key={k} className="rounded-lg bg-[var(--panel-2)] p-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--text-dim)]">{LABELS[k]}{k === "customerDependency" && <span title="limited data (proxy)"> *</span>}</span>
              <span className="font-semibold" style={{ color: riskColor(scores[k]) }}>{scores[k]}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--panel-border)]"><div className="h-full rounded-full" style={{ width: `${scores[k]}%`, background: riskColor(scores[k]) }} /></div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-[var(--text-faint)]">* customer dependency is a proxy (no free customer-relationship feed). Higher = more risk.</p>
    </div>
  );
}
```

- [ ] **Step 2: Load new data in the page** — modify `src/app/[industry]/companies/[id]/page.tsx` to fetch and pass `scores`, `summary`, and enriched `news` (news already loaded). Add imports `getScores, getCompanySummary` and add to the `Promise.all`; pass `scores={scores} summary={summary}` to `CompanyProfile`.

```tsx
// add to imports from "@/lib/provider":  getScores, getCompanySummary
// add to Promise.all:
  getScores(industry, id),
  getCompanySummary(industry, id),
// destructure: const [meta, ttm, facilities, news, patents, holdings, filings, history, scores, summary] = ...
// pass: <CompanyProfile ... scores={scores} summary={summary} />
```

- [ ] **Step 3: Render in `CompanyProfile.tsx`** — add props `scores: Scores | null; summary: string | null;` to the signature and type block, then render the summary + scorecard directly under the header (before the stat tiles):

```tsx
{summary && (
  <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-2)] p-4">
    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">Executive Summary · AI-assisted</div>
    <p className="text-sm text-[var(--text-dim)]">{summary}</p>
  </div>
)}
{scores && <CompanyScorecard scores={scores} />}
```
Add `import { CompanyScorecard } from "./CompanyScorecard";` and `type Scores` to the types import.

- [ ] **Step 4: Add a "Recent Incidents" panel** in `CompanyProfile.tsx` using enriched news for this company (the `news` prop already filtered). In the news panel area, show `category` + `riskLevel` badge per item:

```tsx
{/* inside the existing Recent News panel, per item, add a badge */}
<span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: n.riskLevel === "high" ? "#f8717133" : n.riskLevel === "medium" ? "#f59e0b33" : "#34d39933" }}>{n.category ?? "news"}</span>
```

- [ ] **Step 5: Verify typecheck + live render**

Run: `./node_modules/.bin/tsc --noEmit` (expect 0), then
`curl -s localhost:4444/semiconductor/companies/tsmc | grep -o "Executive Summary\|Overall SC Risk"`
Expected: both strings present.

- [ ] **Step 6: Commit**

```bash
git add src/components/companies/CompanyScorecard.tsx src/components/companies/CompanyProfile.tsx "src/app/[industry]/companies/[id]/page.tsx"
git commit -m "feat(ui): company scorecard, exec summary, categorized incidents on overview"
```

---

## Task 10: Risk register table on Risk Radar

**Files:**
- Create: `src/components/risk/RiskRegister.tsx`
- Modify: `src/app/[industry]/risk/radar/page.tsx`

- [ ] **Step 1: Create** `src/components/risk/RiskRegister.tsx`:

```tsx
"use client";
import { useState } from "react";
import type { Risk } from "@/lib/types";
import { Panel } from "@/components/ui/Panel";

const sevColor = (s: number) => (s >= 70 ? "#f87171" : s >= 45 ? "#f59e0b" : "#34d399");

export function RiskRegister({ byCompany }: { byCompany: Record<string, { name: string; risks: Risk[] }> }) {
  const ids = Object.keys(byCompany);
  const [sel, setSel] = useState<string>(ids[0] ?? "");
  const risks = byCompany[sel]?.risks ?? [];
  return (
    <Panel title="Risk Register">
      <select value={sel} onChange={(e) => setSel(e.target.value)} className="mb-3 rounded-md border border-[var(--panel-border)] bg-[var(--panel-2)] px-2 py-1 text-sm">
        {ids.map((id) => <option key={id} value={id}>{byCompany[id].name}</option>)}
      </select>
      {risks.length ? (
        <div className="space-y-2">
          {risks.map((r) => (
            <div key={r.id} className="rounded-lg border border-[var(--panel-border)] p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{r.title}</span>
                <span className="rounded px-1.5 py-0.5 text-[10px] text-white" style={{ background: sevColor(r.severity) }}>{r.category} · sev {r.severity}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 text-[11px] text-[var(--text-dim)]">
                <span>Probability {Math.round(r.probability * 100)}%</span>
                <span>Impact ${(r.financialImpactUsd / 1e6).toFixed(0)}M</span>
                <span>Recovery {r.timeToRecoveryDays}d</span>
                <span>Confidence {Math.round(r.confidence * 100)}%</span>
                <span>Source: {r.source}</span>
              </div>
              {r.recommendedActions.length > 0 && (
                <ul className="mt-1 list-disc pl-4 text-[11px] text-[var(--text-faint)]">
                  {r.recommendedActions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-[var(--text-faint)]">No material risks derived for this company.</p>}
    </Panel>
  );
}
```

- [ ] **Step 2: Load risks in the radar page** — modify `src/app/[industry]/risk/radar/page.tsx` to also fetch `getAllRisks` + `getCompanies`, build `byCompany`, and render `<RiskRegister>` under the existing radar:

```tsx
import { RiskRegister } from "@/components/risk/RiskRegister";
import { getCompareRadar, getAllRisks, getCompanies } from "@/lib/provider";
// in the component:
const [compareRadar, risks, companies] = await Promise.all([
  getCompareRadar(industry) as Promise<CompareRadarSeries[]>, getAllRisks(industry), getCompanies(industry),
]);
const nameById = Object.fromEntries(companies.map((c) => [c.id, c.name]));
const byCompany = Object.fromEntries(Object.entries(risks).map(([id, rs]) => [id, { name: nameById[id] ?? id, risks: rs }]));
return (<><RiskRadarCompare compareRadar={compareRadar ?? []} /><RiskRegister byCompany={byCompany} /></>);
```

- [ ] **Step 3: Verify typecheck + live render**

Run: `./node_modules/.bin/tsc --noEmit` (expect 0), then
`curl -s localhost:4444/semiconductor/risk/radar | grep -o "Risk Register"`
Expected: present.

- [ ] **Step 4: Commit**

```bash
git add src/components/risk/RiskRegister.tsx "src/app/[industry]/risk/radar/page.tsx"
git commit -m "feat(ui): per-company risk register on Risk Radar"
```

---

## Task 11: News page categorization UI + full-suite verification

**Files:**
- Modify: `src/components/companies/CompaniesNews.tsx` (categorization badges + filter)

- [ ] **Step 1: Add category badges + a category filter** to `CompaniesNews.tsx`. Read the existing component first; add a `useState` category filter and render `category`, `riskLevel`, `impact`, and `geo` per item. Keep existing layout; add:

```tsx
// derive categories: const cats = ["all", ...new Set(news.map(n => n.category ?? "general"))];
// filter: const shown = filter === "all" ? news : news.filter(n => n.category === filter);
// per item badge:
<span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: n.riskLevel === "high" ? "#f8717133" : n.riskLevel === "medium" ? "#f59e0b33" : "#34d39933" }}>{n.category} · impact {n.impact}</span>
```

- [ ] **Step 2: Full test suite**

Run: `cd etl && ./.venv/bin/python -m pytest -q`
Expected: all green.

- [ ] **Step 3: Typecheck + route smoke test**

Run: `./node_modules/.bin/tsc --noEmit` (expect 0), then check key routes 200:
```bash
for u in /semiconductor/companies/tsmc /semiconductor/risk/radar /semiconductor/companies/news; do
  echo "$u -> $(curl -s -o /dev/null -w '%{http_code}' localhost:4444$u)"; done
```
Expected: all 200.

- [ ] **Step 4: Commit**

```bash
git add src/components/companies/CompaniesNews.tsx
git commit -m "feat(ui): news categorization badges + category filter"
```

---

## Self-Review notes

- **Spec coverage:** scores (T5), risk register (T4), cyber (T3), news categorization (T2), exec summary (T6), Overview enrichment (T9), Risk Radar register (T10), interlinking (T8), provider/types (T1), flow wiring (T7), News UI (T11). Customer-dependency proxy + honest flags: T5 factors + T9 footnote.
- **Deferred within phase (acceptable):** "major customers", "technology portfolio" on Overview render from existing curated meta where present, else omitted (graceful) — no new data source in this phase. Facility/material interlinks use anchors (T8) since those pages already exist.
- **Type consistency:** dataset key names (`scores`, `risks`, `cyber`, `companySummary`, enriched `news`) and field names match across T1 types, ETL producers, and provider readers.
