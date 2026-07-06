# Company Intelligence & Risk Scoring — Design

**Date:** 2026-07-07
**Status:** Approved (design), pending spec review
**Phase:** 1 of the enterprise-blueprint build-out (Company Intelligence Core + Risk & Cyber, merged because the company composite scores are computed from the risk/cyber data).

## Goal

Turn per-company pages from a data display into a decision-support surface: every
tracked company gets transparent composite **risk scores**, a structured **risk
register**, a **cyber exposure** view, **categorized news/incidents**, and an
**executive summary** — all cross-linked so an analyst can pivot company →
supplier → material → facility → risk → news without dead ends.

Business questions answered:
- How risky is this company overall, and *why* (which sub-factors drive it)?
- What specific risks threaten it, how severe/likely, and what do we do?
- What is its cyber exposure right now?
- What just happened to it (categorized, impact-scored incidents)?

## Approach

ETL-centric, consistent with the existing `source → Postgres (industry_dataset
JSONB) → provider → server component` pipeline. New ETL stages compute and store
scores / risk-objects / cyber / enriched-news; server components render them; a
shared link resolver handles interlinking. Heavy and historical computation stays
out of request time, and risk **trends** can be stored and accreted over ingests.

Rejected alternative: computing scores on-the-fly in the provider — scatters
logic across request handlers and cannot store trend history.

## New / changed datasets

All keyed by `(industry, dataset)` in `industry_dataset`, same as today.

| dataset | producer | shape (per company id) |
|---|---|---|
| `scores` | `sources/scores.py` | `{ supplierDependency, customerDependency, esg, cyber, financial, geopolitical, overall, band, trend[], factors{} }` |
| `risks` | `sources/risks.py` | `[{ id, category, title, severity, probability, financialImpactUsd, timeToRecoveryDays, impactedSuppliers[], impactedFacilities[], recommendedActions[], confidence, source }]` |
| `cyber` | `sources/cyber.py` | `{ score, band, recentCves[], kevHits[], breaches[] }` |
| `news` (enriched) | `sources/news_enrich.py` | existing items + `{ category, impact, riskLevel, confidence, geo, relatedCompanies[] }` |
| `companySummary` | `etl/ai/summary.py` | `{ id: markdown-ish string }` |

Ordering in `flows.py`: existing sources first (they produce the inputs) →
`news_enrich` → `cyber` → `risks` → `scores` (reads risks+cyber+esg+geo) →
`summary` (reads everything) → `derive` (unchanged).

## Scoring methodology (transparent, 0–100, higher = more risk)

Every sub-score is a pure function of real signals and exposes its inputs in a
`factors` object so the UI can show "why". Weights live in one constant block.

- **supplierDependency** ← supplier-edge concentration: Herfindahl of tier-1
  spend share + sole-source count. Data: `supplierEdges`.
- **esg** ← emissions (scope1+2+3) + water risk + ethical sourcing. Data: `esg`.
  (Reuses the logic already prototyped in `derive._esg_score`.)
- **cyber** ← from the `cyber` dataset (CVE/KEV exposure + breach count).
- **financial** ← inverse of `companyMeta.healthScore`, nudged by revenue trend
  (from `financialHistory` where present).
- **geopolitical** ← HQ country tension (from `geo`) + `companyMeta.exposure`.
- **customerDependency** ← **LIMITED DATA.** No free customer-relationship feed;
  computed as a rough revenue-segment concentration proxy and flagged
  `estimated: true` in `factors`. UI shows a "limited data" marker.
- **overall** ← weighted blend of the six (weights in `SCORE_WEIGHTS`), mapped to
  a letter **band** A–F.
- **trend** ← stored monthly series. First ingest seeds a short estimated series
  (flagged); each subsequent ingest appends the real current `overall`, so real
  history accrues over time.

## Risk register (`risks.py`)

Each risk object derives from a real signal (traceable via `source`):

- **cyber** ← KEV/CVE hits for the company's products/vendors (`cyber` dataset).
- **regulatory / export-control** ← `policies` targeting the company.
- **geopolitical** ← `geo` tension for HQ / key-supply countries.
- **single-source / supplier** ← sole-source edges in `supplierEdges`.
- **financial** ← weak `healthScore` / negative net-income trend.
- **operational disruption** ← recent negative news events (from enriched `news`).

`severity` 0–100, `probability` 0–1, `financialImpactUsd` order-of-magnitude
estimate, `timeToRecoveryDays` heuristic by category, `recommendedActions` a
short templated playbook per category, `confidence` 0–1 by signal strength.
"AI-predicted" items are the same objects flagged `source: "projection"`.

## Cyber (`cyber.py`)

Per company: aggregate CVEs (NVD, already wired via `nvd.py`) + CISA KEV hits for
the company's vendor keywords into an exposure **score**/band, list recent CVEs
and KEV entries, and pull `category === "cyber"` items from enriched news as
`breaches`. No paid cyber-rating feed; the score is derived and labeled as such.

## News categorization (`news_enrich.py`)

Deterministic keyword classifier maps each news item to the taxonomy
(cyber-attack, M&A, factory-expansion, shutdown, exec-change, disaster, strike,
geopolitical, export-restriction, environmental, financial, shortage, lawsuit,
regulatory). Assigns `impact` (0–100), `riskLevel`, `confidence`, and `geo`.
Reads existing `news`, writes enriched `news`. Also emits company-linked
incidents consumed by the Overview and the risk register.

## AI summary interface (`etl/ai/summary.py`)

```
generate(company_context: dict) -> str      # deterministic template now
```
A single seam. Deterministic implementation composes a factual exec summary from
the structured data ("NVIDIA carries an elevated overall risk (band B), driven by
supplier concentration and geopolitical exposure to Taiwan…"). Swapping in an LLM
later = replacing this function body; no page or dataset changes. Output stored in
`companySummary`.

## Interlinking

Shared resolver `src/lib/links.ts`: `resolveEntity(name, kind)` → route or null,
using the loaded company/supplier/material/facility name maps. Extend the
existing `CompanyLink` pattern into `SupplierLink`, `MaterialLink`,
`FacilityLink`, `RiskLink`. Overview and other pages render these so every named
entity is a live link (company ↔ supplier ↔ material ↔ facility ↔ risk ↔ news ↔
filing). Unresolvable names render as plain text (graceful).

## Page changes

- **Companies → Overview (`CompanyProfile`)**: add a **scorecard** (six scores +
  overall band + factor tooltips), a **risk-trend** sparkline/area chart, a
  **recent incidents** list (enriched news), **major suppliers / customers**
  (linked), **technology portfolio**, and the **AI executive summary** at top.
- **Risk & Compliance → Risk Radar**: add a per-company **risk register** table
  (the `risks` objects) alongside the existing comparative radar; clicking a
  company filters to its risks.
- **Companies → News**: render categories, impact/risk/confidence badges, geo,
  and related-entity links.

## Provider additions

`getScores(i, id)`, `getRisks(i, id)`, `getCyber(i, id)`, `getCompanySummary(i,
id)`, and enriched `getNews`. Types added to `src/lib/types.ts`.

## Testing

Pure-function unit tests (pytest, existing style) for: each sub-score formula and
the overall blend/band; risk-object derivation per category; news classifier
keyword mapping; the deterministic summary generator. Frontend verified by
driving the live app (route 200s + rendered values), per project convention.

## Honest-data flags (shown in UI)

- **customerDependency** — proxy, "limited data" marker.
- **cyber** score — derived from CVE/KEV, not a commercial security rating.
- **risk trend** early points — estimated until real history accrues.

## Out of scope (later phases)

Supply-chain depth (raw-materials deep fields, facility enrichment, map layers,
AIS/customs trade), Data Sources governance page, Reports export engine, and the
future modules (Knowledge Graph, Alerts/Watchlists, AI Copilot, Scenario
Planning, Digital Footprint, Threat Intel). Paid feeds (AIS, customs, commercial
cyber ratings, satellite) are explicitly not attempted; fields needing them are
labeled or deferred.
