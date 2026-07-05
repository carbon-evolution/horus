# Phase Z — Plan 2: Server-Render Off Postgres Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Next.js app render from Postgres instead of in-memory fixtures — pages become async server components under `app/[industry]/…` that read an async, server-only provider and pass data to client widgets as props.

**Architecture:** The current sync fixture provider is renamed to `fixtures.ts` (kept only for the ETL dump). A new async, `server-only` `provider.ts` reads `industry_dataset` from Postgres through a Redis read-through cache. Routes move under `app/[industry]/`; a server `layout.tsx` supplies a thin client `IndustryProvider` (industry + company list) that the shell and cross-filter focus read from. Views are migrated section by section, each keeping the app green, then the transitional store-bridge is removed.

**Tech Stack:** Next 16 (server components, Promise-based `params`), `pg`, `ioredis`, `server-only`, existing Postgres/Redis from Plan 1.

**Migration safety:** Every task ends with the app building and rendering. Un-migrated views keep working because (a) they still import the sync `fixtures.ts`, and (b) `IndustryProvider` bridges the route industry into the Zustand store during migration. The bridge is removed in the final task.

**Refinement from the spec (flagged):** The design says "each page fetches its own data and passes props." That holds for page data. But the shell (Sidebar selector, TopBar) and the cross-filter `focus.ts` need `industry` + the company list **on the client**, which no single page owns. So a thin client `IndustryProvider` context (industry + companies only) is added at the `[industry]` layout. All actual widget data still flows page → props.

---

## File Structure

**New:**
- `src/lib/db.ts` — server-only pg Pool + ioredis client + `readDataset()` read-through helper
- `src/lib/fixtures.ts` — today's sync provider logic, moved here (dump-only)
- `src/lib/industry-context.tsx` — `IndustryProvider` + `useIndustry()` + `useCompanies()` client context
- `src/app/[industry]/layout.tsx` — server layout: validate industry, fetch companies, wrap in provider
- `src/app/[industry]/**` — all 22 routes moved here (see Task 5)
- `src/app/page.tsx` — redirect `/` → `/semiconductor` (replaces current dashboard page)

**Modified:**
- `src/lib/provider.ts` — rewritten: `server-only`, async, Postgres-backed, adds `getIndustryBundle()`
- `scripts/dump-fixtures.ts` — import from `fixtures.ts`; add `companyMeta` raw map
- `src/lib/focus.ts` — read industry + companies from context, not store/provider
- `src/lib/store.ts` — add transitional `setIndustry` bridge (removed in Task 11)
- `src/components/layout/Sidebar.tsx` — industry-prefixed hrefs; selector navigates
- All 21 view components + `Dashboard.tsx` — data via props, industry via `useIndustry()`
- `package.json` — add `pg`, `ioredis`, `server-only`, `@types/pg`

---

## Task 1: Move sync provider to `fixtures.ts` (app unchanged)

Pure mechanical rename so the ETL dump keeps a sync data source after `provider.ts` goes async.

**Files:**
- Create: `src/lib/fixtures.ts` (from current `src/lib/provider.ts`)
- Modify: all files importing `@/lib/provider`
- Modify: `scripts/dump-fixtures.ts`

- [ ] **Step 1: Copy provider to fixtures**

Run: `git mv src/lib/provider.ts src/lib/fixtures.ts`

- [ ] **Step 2: Add a raw companyMeta-map accessor to `fixtures.ts`**

Append to `src/lib/fixtures.ts` (after `getCompanyMeta`):

```typescript
// Raw explicit companyMeta map (may be undefined) — used only by the ETL dump so
// the async provider can serve explicit overrides and derive the rest.
export function getCompanyMetaMap(industry: Industry): Record<string, CompanyMeta> {
  return getIndustryData(industry).companyMeta ?? {};
}
```

- [ ] **Step 3: Repoint every app import from `@/lib/provider` to `@/lib/fixtures`**

Run: `grep -rl '@/lib/provider' src scripts`
For each file, replace `@/lib/provider` with `@/lib/fixtures`.

- [ ] **Step 4: Add `companyMeta` to the dump payload**

In `scripts/dump-fixtures.ts`, import `getCompanyMetaMap` and add one line inside `perIndustry`'s returned object (next to `patents`):

```typescript
    companyMeta: getCompanyMetaMap(industry),
```

- [ ] **Step 5: Verify app + dump unchanged**

Run: `npx tsc --noEmit`
Expected: exit 0.

Run: `npm run dump:fixtures`
Expected: `wrote semiconductor.json (21 datasets)` (now 21 — companyMeta added), etc.

- [ ] **Step 6: Re-ingest so Postgres has companyMeta**

Run: `make ingest`
Expected: Prefect flow `Completed`.

Run: `docker compose exec -T postgres psql -U scr -d scr_radar -c "select 1 from industry_dataset where industry='semiconductor' and dataset='companyMeta';"`
Expected: one row (`1`).

- [ ] **Step 7: Commit**

```bash
git add src/lib/fixtures.ts scripts/dump-fixtures.ts $(grep -rl '@/lib/fixtures' src)
git commit -m "refactor: move sync provider to fixtures.ts (dump source)"
```

---

## Task 2: DB client + read-through helper

**Files:**
- Modify: `package.json`
- Create: `src/lib/db.ts`

- [ ] **Step 1: Install deps**

Run: `npm i pg ioredis server-only && npm i -D @types/pg`
Expected: installs succeed.

- [ ] **Step 2: Write `src/lib/db.ts`**

```typescript
import "server-only";
import { Pool } from "pg";
import Redis from "ioredis";

// Singletons survive Next dev HMR by hanging off globalThis.
const g = globalThis as unknown as { _pgPool?: Pool; _redis?: Redis };

export const pool =
  g._pgPool ?? (g._pgPool = new Pool({ connectionString: process.env.DATABASE_URL }));

export const redis =
  g._redis ?? (g._redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6380"));

const CACHE_TTL = Number(process.env.CACHE_TTL ?? "86400");

/**
 * Read one dataset payload as its parsed JSON. Redis read-through: hit Redis
 * first (key `scr:{industry}:{dataset}`), fall back to Postgres and re-warm.
 * Returns `fallback` when the row is absent.
 */
export async function readDataset<T>(industry: string, dataset: string, fallback: T): Promise<T> {
  const key = `scr:${industry}:${dataset}`;
  const cached = await redis.get(key);
  if (cached !== null) return JSON.parse(cached) as T;

  const res = await pool.query<{ payload: T }>(
    "select payload from industry_dataset where industry=$1 and dataset=$2",
    [industry, dataset],
  );
  if (res.rowCount === 0) return fallback;

  const payload = res.rows[0].payload;
  await redis.set(key, JSON.stringify(payload), "EX", CACHE_TTL);
  return payload;
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/lib/db.ts
git commit -m "feat: server-only pg+redis client with read-through helper"
```

---

## Task 3: Async, Postgres-backed provider

Rewrites `provider.ts` with the SAME getter names/return types as `fixtures.ts`, but async and DB-sourced. Derivations (`getCompanyMeta` default, `getFinancialsTTM`, `getSupplyGraph`) are preserved. Nothing imports this yet, so the app is unaffected.

**Files:**
- Create: `src/lib/provider.ts`
- Create: `scripts/check-provider.ts` (temporary verification, deleted in Step 5)

- [ ] **Step 1: Write `src/lib/provider.ts`**

```typescript
import "server-only";
import { readDataset } from "@/lib/db";
import type {
  Industry, Company, CompanyMeta, FinancialTTMPoint, FinancialSeriesPoint,
  PatentRow, Facility, NewsItem, Deal, Supplier, ResearchRow, RadarAxis,
  SankeyData, Kpi, SupplierEdge, RawMaterial, TradeShipment, GraphData,
  GraphNode, GraphLink, Policy, EsgProfile, GeoRisk, Chokepoint, MarketIntel,
  SourceInfo, AlertItem, IndustryData,
} from "@/lib/types";

const ds = <T>(industry: string, name: string, fallback: T) => readDataset<T>(industry, name, fallback);

// --- Base datasets ---
export const getKpis = (i: Industry) => ds<Kpi[]>(i, "kpis", []);
export const getCompanies = (i: Industry) => ds<Company[]>(i, "companies", []);
export const getFacilities = (i: Industry) => ds<Facility[]>(i, "facilities", []);
export const getNews = (i: Industry) => ds<NewsItem[]>(i, "news", []);
export const getDeals = (i: Industry) => ds<Deal[]>(i, "deals", []);
export const getSuppliers = (i: Industry) => ds<Supplier[]>(i, "suppliers", []);
export const getResearch = (i: Industry) => ds<ResearchRow[]>(i, "research", []);
export const getRadar = (i: Industry) => ds<RadarAxis[]>(i, "radar", []);
export const getSankey = (i: Industry) => ds<SankeyData>(i, "sankey", { nodes: [], links: [] });
export const getFinancialsSnapshot = (i: Industry) => ds<FinancialSeriesPoint[]>(i, "financials", []);
export const getSupplierEdges = (i: Industry) => ds<SupplierEdge[]>(i, "supplierEdges", []);
export const getMaterials = (i: Industry) => ds<RawMaterial[]>(i, "materials", []);
export const getShipments = (i: Industry) => ds<TradeShipment[]>(i, "shipments", []);
export const getPolicies = (i: Industry) => ds<Policy[]>(i, "policies", []);
export const getEsgProfiles = (i: Industry) => ds<EsgProfile[]>(i, "esg", []);
export const getGeoRisks = (i: Industry) => ds<GeoRisk[]>(i, "geo", []);
export const getCompareRadar = (i: Industry) => ds<unknown>(i, "compareRadar", null);
export const getMarketIntel = (i: Industry) =>
  ds<MarketIntel>(i, "marketIntel", { inventoryRatio: [], leadTimes: [], utilization: [] });
export const getAlerts = (i: Industry) => ds<AlertItem[]>(i, "alerts", []);
export const getPatents = (i: Industry) => ds<PatentRow[]>(i, "patents", []);

// --- Global (industry-independent) ---
export const getDataSources = () => ds<SourceInfo[]>("_global", "sources", []);
export const getChokepoints = () => ds<Chokepoint[]>("_global", "chokepoints", []);

export async function getCompany(i: Industry, id: string): Promise<Company | undefined> {
  return (await getCompanies(i)).find((c) => c.id === id);
}

// --- Dashboard bundle (Dashboard reads the whole IndustryData shape) ---
export async function getIndustryBundle(i: Industry): Promise<Pick<IndustryData,
  "kpis" | "companies" | "facilities" | "news" | "radar" | "sankey" | "financials" | "deals" | "suppliers" | "research">> {
  const [kpis, companies, facilities, news, radar, sankey, financials, deals, suppliers, research] =
    await Promise.all([
      getKpis(i), getCompanies(i), getFacilities(i), getNews(i), getRadar(i),
      getSankey(i), getFinancialsSnapshot(i), getDeals(i), getSuppliers(i), getResearch(i),
    ]);
  return { kpis, companies, facilities, news, radar, sankey, financials, deals, suppliers, research };
}

// --- Derivations (identical logic to fixtures.ts, async inputs) ---
function hash(s: string): number {
  let h = 0;
  for (let idx = 0; idx < s.length; idx++) h = (h * 31 + s.charCodeAt(idx)) | 0;
  return Math.abs(h);
}
const DEFAULT_EXPOSURE = ["low", "medium", "high"] as const;

export async function getCompanyMeta(i: Industry, id: string): Promise<CompanyMeta> {
  const map = await ds<Record<string, CompanyMeta>>(i, "companyMeta", {});
  if (map[id]) return map[id];
  const c = await getCompany(i, id);
  const name = c?.name ?? id;
  const h = hash(id);
  return {
    ceo: "—", hq: "—", employees: `${20 + (h % 200)}k`, founded: `${1970 + (h % 45)}`,
    description: `${name} is a tracked ${i} company.`,
    healthScore: 50 + ((c?.changeYtd ?? 0) > 0 ? 20 : 5) + (h % 20),
    exposure: DEFAULT_EXPOSURE[h % 3],
    segments: [
      { name: "Core", share: 60 }, { name: "Adjacent", share: 25 }, { name: "Other", share: 15 },
    ],
  };
}

const PERIODS = ["Q3'23", "Q4'23", "Q1'24", "Q2'24", "Q3'24", "Q4'24"];
export async function getFinancialsTTM(i: Industry, companyId: string): Promise<FinancialTTMPoint[]> {
  const [snapshots, company] = await Promise.all([getFinancialsSnapshot(i), getCompany(i, companyId)]);
  const snap = snapshots.find(
    (f) => f.company.toLowerCase() === (company?.name ?? companyId).toLowerCase(),
  );
  if (!snap) return [];
  const factor = (idx: number) => 0.82 + idx * 0.036;
  return PERIODS.map((period, idx) => ({
    period,
    revenue: +(snap.revenue * factor(idx)).toFixed(1),
    profit: +(snap.profit * factor(idx)).toFixed(1),
    rnd: +(snap.rnd * factor(idx)).toFixed(2),
    capex: +(snap.capex * factor(idx)).toFixed(1),
  }));
}

function spendNum(s: string): number {
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 1;
}
export async function getSupplyGraph(i: Industry): Promise<GraphData> {
  const [edges, companies] = await Promise.all([getSupplierEdges(i), getCompanies(i)]);
  const companyNames = new Set(companies.map((c) => c.name.toLowerCase()));
  const nodeMap = new Map<string, GraphNode>();
  const ensure = (name: string) => {
    if (!nodeMap.has(name)) {
      nodeMap.set(name, { id: name, name, group: companyNames.has(name.toLowerCase()) ? "company" : "supplier", val: 1 });
    }
    return nodeMap.get(name)!;
  };
  const links: GraphLink[] = edges.map((e) => {
    const v = spendNum(e.spend);
    ensure(e.buyer).val += v;
    ensure(e.supplier).val += v;
    return { source: e.supplier, target: e.buyer, value: v };
  });
  return { nodes: [...nodeMap.values()], links };
}
```

- [ ] **Step 2: Write temporary verification `scripts/check-provider.ts`**

```typescript
import { getCompanies, getIndustryBundle, getCompanyMeta, getSupplyGraph } from "../src/lib/provider";

async function main() {
  const cos = await getCompanies("semiconductor");
  const bundle = await getIndustryBundle("semiconductor");
  const graph = await getSupplyGraph("semiconductor");
  const meta = cos[0] ? await getCompanyMeta("semiconductor", cos[0].id) : null;
  console.log("companies:", cos.length, "| bundle.kpis:", bundle.kpis.length,
    "| graph.nodes:", graph.nodes.length, "| meta.ceo:", meta?.ceo);
  process.exit(0);
}
main();
```

- [ ] **Step 3: Run it against the live DB**

Run: `npx tsx scripts/check-provider.ts`
Expected: a line like `companies: 10 | bundle.kpis: 4 | graph.nodes: 20 | meta.ceo: ...` (non-zero counts).

- [ ] **Step 4: Verify tsc**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Delete the temporary script and commit**

```bash
rm scripts/check-provider.ts
git add src/lib/provider.ts
git commit -m "feat: async postgres-backed provider (server-only)"
```

---

## Task 4: Industry context (client bridge)

**Files:**
- Create: `src/lib/industry-context.tsx`
- Modify: `src/lib/store.ts`

- [ ] **Step 1: Add a transitional setter bridge to `src/lib/store.ts`**

The store already has `focusCompany`/`watchlist`. Ensure `industry` + `setIndustry` remain (they do today). No change needed if present — confirm `setIndustry` exists. (It is removed in Task 11.)

- [ ] **Step 2: Write `src/lib/industry-context.tsx`**

```typescript
"use client";
import { createContext, useContext, useEffect } from "react";
import type { Company, Industry } from "@/lib/types";
import { useApp } from "@/lib/store";

interface IndustryCtx {
  industry: Industry;
  companies: Company[];
}
const Ctx = createContext<IndustryCtx | null>(null);

export function IndustryProvider({
  industry, companies, children,
}: IndustryCtx & { children: React.ReactNode }) {
  const setIndustry = useApp((s) => s.setIndustry);
  // Bridge: keep the Zustand store's industry in sync with the route so
  // not-yet-migrated views (which read useApp(s=>s.industry)) still work.
  useEffect(() => { setIndustry(industry); }, [industry, setIndustry]);
  return <Ctx.Provider value={{ industry, companies }}>{children}</Ctx.Provider>;
}

export function useIndustry(): Industry {
  const c = useContext(Ctx);
  if (!c) throw new Error("useIndustry must be used within IndustryProvider");
  return c.industry;
}
export function useCompanies(): Company[] {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCompanies must be used within IndustryProvider");
  return c.companies;
}
```

- [ ] **Step 3: Verify tsc**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/industry-context.tsx src/lib/store.ts
git commit -m "feat: client IndustryProvider context (industry + companies)"
```

---

## Task 5: Move routes under `app/[industry]/` + redirect + layout

After this task the whole app lives under `/semiconductor` (default). Un-migrated views still render via `fixtures.ts` + the store bridge.

**Files:**
- Move: every folder/file under `src/app/` except `layout.tsx`, `globals.css`, `favicon.*` → `src/app/[industry]/`
- Create: `src/app/page.tsx` (redirect)
- Create: `src/app/[industry]/layout.tsx`
- Modify: `src/app/layout.tsx` (remove `AppShell` — it moves into the `[industry]` layout)
- Modify: `src/components/layout/Sidebar.tsx`

**Why AppShell moves:** `AppShell` renders the Sidebar + TopBar, which call `useIndustry()` / `useFocus()`→`useCompanies()`. Those hooks require `IndustryProvider` as an ancestor. So the shell must live INSIDE the provider, i.e. in `[industry]/layout.tsx`, not the root layout. The root layout keeps only `<html>/<body>`.

- [ ] **Step 1: Create the `[industry]` segment and move routes**

Run:
```bash
mkdir -p "src/app/[industry]"
git mv src/app/page.tsx "src/app/[industry]/page.tsx"
git mv src/app/companies src/app/supply-chain src/app/risk src/app/analytics src/app/monitoring "src/app/[industry]/"
```
Expected: `src/app/[industry]/` now holds `page.tsx`, `companies/`, `supply-chain/`, `risk/`, `analytics/`, `monitoring/`. `src/app/layout.tsx` and `globals.css` stay at the root.

- [ ] **Step 2: Create the root redirect `src/app/page.tsx`**

```typescript
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/semiconductor");
}
```

- [ ] **Step 2b: Strip `AppShell` out of the root `src/app/layout.tsx`**

The root layout must NOT render `AppShell` anymore (the shell moves into the `[industry]` layout so it sits inside `IndustryProvider`). Remove the `AppShell` import and wrapper; the body renders `{children}` directly:

```typescript
      <body className="min-h-full">
        {children}
      </body>
```

(Keep everything else in root `layout.tsx` — fonts, metadata, `<html>`.)

- [ ] **Step 3: Write `src/app/[industry]/layout.tsx`**

```typescript
import { notFound } from "next/navigation";
import { INDUSTRIES, type Industry } from "@/lib/types";
import { getCompanies } from "@/lib/provider";
import { IndustryProvider } from "@/lib/industry-context";
import { AppShell } from "@/components/layout/AppShell";

// No generateStaticParams: these routes read the live DB, so they render
// dynamically on demand. notFound() below rejects unknown industries.

export default async function IndustryLayout({
  children, params,
}: {
  children: React.ReactNode;
  params: Promise<{ industry: string }>;
}) {
  const { industry } = await params;
  if (!INDUSTRIES.includes(industry as Industry)) notFound();
  const companies = await getCompanies(industry as Industry);
  return (
    <IndustryProvider industry={industry as Industry} companies={companies}>
      <AppShell>{children}</AppShell>
    </IndustryProvider>
  );
}
```

- [ ] **Step 4: Make the Sidebar industry-aware**

In `src/components/layout/Sidebar.tsx`:
- Import `useIndustry`: `import { useIndustry } from "@/lib/industry-context";` and `import { useRouter, usePathname } from "next/navigation";`
- Replace the `IndustrySelector` body's `useApp()` usage: get `const industry = useIndustry();` and a `const router = useRouter();`. The selector buttons navigate instead of `setIndustry`:

```typescript
function IndustrySelector() {
  const industry = useIndustry();
  const router = useRouter();
  const pathname = usePathname();
  const switchTo = (i: string) => {
    const rest = pathname.replace(/^\/[^/]+/, ""); // strip current industry segment
    router.push(`/${i}${rest}`);
  };
  return (
    /* same markup, but: onClick={() => switchTo(i)} and compare `industry === i` */
  );
}
```

- In `NavGroupItem`, prefix every `href` with the industry and fix active checks. Add `const industry = useIndustry();` and build `const prefixed = (h: string) => \`/${industry}${h === "/" ? "" : h}\`;`. Use `prefixed(group.href)` / `prefixed(c.href)` for `Link href` and compare `pathname === prefixed(...)` for active state.

- [ ] **Step 5: Verify build and routes**

Run: `npx tsc --noEmit`
Expected: exit 0.

Start dev (`npm run dev`) in the background, then:
Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4444/` and `.../semiconductor` and `.../semiconductor/companies` and `.../ai/risk/esg`
Expected: `/` → 307 (redirect); the three industry routes → 200. `/badindustry` → 404.

- [ ] **Step 6: Commit**

```bash
git add -A src/app src/components/layout/Sidebar.tsx
git commit -m "feat: move routes under [industry] segment + redirect + layout"
```

---

## Tasks 6–10: Migrate views section by section

**Pattern (identical for every view — worked fully for Monitoring in Task 6):**
1. The **page** (`page.tsx`) becomes an `async` server component: read `const { industry } = await params` (`params: Promise<{ industry: Industry }>`), `await` the provider getters that view needs, pass results as props to the view.
2. The **view** drops `"use client"`? No — views stay `"use client"` (they have interactivity). The view: remove `import { useApp }`/`from "@/lib/fixtures"` and the `getX(industry)` calls; add the data props to its signature; get `industry` from `useIndustry()` (import from `@/lib/industry-context`) where it's used for labels; keep all `useFocus()`/`useState` interactivity unchanged.
3. For per-company metadata, the page pre-resolves a `metas: Record<string, CompanyMeta>` map and passes it; the view looks up `metas[c.id]` instead of calling `getCompanyMeta`.

Cast params industry via `as Industry`. Import `Industry` and any prop types from `@/lib/types`.

### Task 6: Monitoring (fully worked example)

**Files:** `src/app/[industry]/monitoring/alerts/page.tsx`, `src/components/monitoring/AlertsView.tsx`, `src/app/[industry]/monitoring/watchlist/page.tsx`, `src/components/monitoring/WatchlistView.tsx`

- [ ] **Step 1: Alerts page → server component**

`src/app/[industry]/monitoring/alerts/page.tsx`:

```typescript
import { AlertsView } from "@/components/monitoring/AlertsView";
import { getAlerts } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const alerts = await getAlerts(industry);
  return <AlertsView alerts={alerts} />;
}
```

- [ ] **Step 2: AlertsView takes props**

In `src/components/monitoring/AlertsView.tsx`:
- Remove `import { useApp } from "@/lib/store";` and `import { getAlerts } from "@/lib/fixtures";`.
- Add `import { useIndustry } from "@/lib/industry-context";` and `import type { AlertItem } from "@/lib/types";` (extend existing type import).
- Change signature to `export function AlertsView({ alerts: allAlerts }: { alerts: AlertItem[] })`.
- Replace `const industry = useApp((s) => s.industry);` with `const industry = useIndustry();`.
- Replace `const alerts = getAlerts(industry)...` filtering with the same filter applied to `allAlerts` (rename the source array only).

- [ ] **Step 3: Watchlist page → server component**

`src/app/[industry]/monitoring/watchlist/page.tsx`:

```typescript
import { WatchlistView } from "@/components/monitoring/WatchlistView";
import { getCompanies, getCompanyMeta } from "@/lib/provider";
import type { Industry, CompanyMeta } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const companies = await getCompanies(industry);
  const metas: Record<string, CompanyMeta> = Object.fromEntries(
    await Promise.all(companies.map(async (c) => [c.id, await getCompanyMeta(industry, c.id)])),
  );
  return <WatchlistView companies={companies} metas={metas} />;
}
```

- [ ] **Step 4: WatchlistView takes props**

In `src/components/monitoring/WatchlistView.tsx`:
- Remove `getCompanies`/`getCompanyMeta` imports from `@/lib/fixtures` and `const industry = useApp((s) => s.industry)` (keep `useApp` for `watchlist`/`toggleWatch`).
- Add `import { useIndustry } from "@/lib/industry-context";`, use `const industry = useIndustry();`.
- Signature: `export function WatchlistView({ companies, metas }: { companies: Company[]; metas: Record<string, CompanyMeta> })`.
- Replace `const companies = getCompanies(industry);` (use the prop) and every `getCompanyMeta(industry, c.id)` with `metas[c.id]`.

- [ ] **Step 5: Verify + commit**

Run: `npx tsc --noEmit` → exit 0. Curl `/semiconductor/monitoring/alerts` and `/monitoring/watchlist` → 200.

```bash
git add "src/app/[industry]/monitoring" src/components/monitoring
git commit -m "refactor: monitoring views render from postgres via props"
```

### Task 7: Companies section

Apply the pattern to each. Page getters → props (view drops `useApp`/fixtures, uses `useIndustry()` + props):

| Route / page | Provider calls in page | Props to view |
|---|---|---|
| `companies/page.tsx` → CompaniesOverview | `getCompanies`, per-company `getCompanyMeta` | `companies`, `metas` |
| `companies/explorer` → CompanyExplorer | `getCompanies`, per-company `getCompanyMeta` | `companies`, `metas` |
| `companies/financials` → CompaniesFinancials | `getCompanies`, `getFinancialsSnapshot`, per-company `getFinancialsTTM` | `companies`, `financials`, `ttm: Record<string, FinancialTTMPoint[]>` |
| `companies/news` → CompaniesNews | `getNews` | `news` |
| `companies/deals` → CompaniesDeals | `getDeals` | `deals` |
| `companies/patents` → CompaniesPatents | `getPatents` | `patents` |
| `companies/[id]` → CompanyProfile | `getCompany`, `getCompanyMeta`, `getFacilities`, `getFinancialsTTM`, `getNews`, `getPatents` (all for `id`) | `company`, `meta`, `facilities`, `ttm`, `news`, `patents`, plus existing `id` |

`[id]` page: `params: Promise<{ industry: Industry; id: string }>`; `await` both. If `company` is undefined, call `notFound()`.

- [ ] **Step 1:** Convert `companies/page.tsx` + `CompaniesOverview.tsx` (companies + metas).
- [ ] **Step 2:** Convert `explorer` + `CompanyExplorer.tsx`.
- [ ] **Step 3:** Convert `financials` + `CompaniesFinancials.tsx` (build `ttm` map like the watchlist `metas` map).
- [ ] **Step 4:** Convert `news` + `CompaniesNews.tsx`.
- [ ] **Step 5:** Convert `deals` + `CompaniesDeals.tsx`.
- [ ] **Step 6:** Convert `patents` + `CompaniesPatents.tsx`.
- [ ] **Step 7:** Convert `[id]` + `CompanyProfile.tsx` (pre-resolve all six getters for `id`; `notFound()` if no company).
- [ ] **Step 8:** `npx tsc --noEmit` → 0; curl each companies route (incl. `/semiconductor/companies/<a real id>`) → 200. Commit `refactor: companies views render from postgres via props`.

### Task 8: Supply Chain section

| Route / page | Provider calls | Props |
|---|---|---|
| `supply-chain/suppliers` → SuppliersView | `getSupplierEdges` | `edges` |
| `supply-chain/materials` → MaterialsView | `getMaterials` | `materials` |
| `supply-chain/facilities` → FacilitiesView | `getCompanies`, `getFacilities` | `companies`, `facilities` |
| `supply-chain/map` → SupplyChainMap | `getSupplyGraph` | `graph` |
| `supply-chain/trade` → TradeView | `getSankey`, `getShipments` | `sankey`, `shipments` |

`SupplyChainMap` is `next/dynamic` `ssr:false`; keep the dynamic import wrapper, just feed it the `graph` prop from the server page.

- [ ] **Step 1–5:** Convert each route+view per the table.
- [ ] **Step 6:** `npx tsc --noEmit` → 0; curl each supply-chain route → 200 (open `/supply-chain/map` in the browser to confirm the 3D graph still renders). Commit `refactor: supply-chain views render from postgres via props`.

### Task 9: Risk section

| Route / page | Provider calls | Props |
|---|---|---|
| `risk/radar` → RiskRadarCompare | `getCompareRadar` | `compareRadar` |
| `risk/policies` → PoliciesView | `getPolicies` | `policies` |
| `risk/esg` → EsgView | `getEsgProfiles` | `esg` |
| `risk/geopolitical` → GeoRiskView | `getGeoRisks`, `getChokepoints` | `geo`, `chokepoints` |

`getCompareRadar` return type is `unknown` in the provider — in the page cast it to the type `RiskRadarCompare` already consumes (check the component's existing usage and reuse that type).

- [ ] **Step 1–4:** Convert each.
- [ ] **Step 5:** `npx tsc --noEmit` → 0; curl each risk route → 200. Commit `refactor: risk views render from postgres via props`.

### Task 10: Analytics section

| Route / page | Provider calls | Props |
|---|---|---|
| `analytics/market` → MarketIntelView | `getMarketIntel` | `marketIntel` |
| `analytics/reports` → ReportsView | `getAlerts`, `getCompanies`, `getMaterials`, `getPolicies` | `alerts`, `companies`, `materials`, `policies` |
| `analytics/sources` → SourcesView | `getDataSources` | `sources` |

- [ ] **Step 1–3:** Convert each.
- [ ] **Step 4:** `npx tsc --noEmit` → 0; curl each analytics route → 200. Commit `refactor: analytics views render from postgres via props`.

---

## Task 11: Migrate the Dashboard + retire the bridge

**Files:** `src/app/[industry]/page.tsx`, `src/components/dashboard/Dashboard.tsx`, `src/lib/focus.ts`, `src/lib/store.ts`

- [ ] **Step 1: Dashboard page → server component**

`src/app/[industry]/page.tsx`:

```typescript
import { Dashboard } from "@/components/dashboard/Dashboard";
import { getIndustryBundle } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const data = await getIndustryBundle(industry);
  return <Dashboard data={data} />;
}
```

- [ ] **Step 2: Dashboard takes the bundle**

In `src/components/dashboard/Dashboard.tsx`: remove `import { useApp }` and the `getIndustryData` import. Do NOT import a type from `@/lib/provider` (it is `server-only` — importing it into this client component breaks the build). Instead type the prop from `@/lib/types`:

```typescript
import type { IndustryData } from "@/lib/types";
type DashboardData = Pick<IndustryData,
  "kpis" | "companies" | "facilities" | "news" | "radar" | "sankey" | "financials" | "deals" | "suppliers" | "research">;

export function Dashboard({ data }: { data: DashboardData }) {
```

Replace every `d.` with `data.`. If `industry` is used for labels, get it from `useIndustry()`.

- [ ] **Step 3: Rewrite `src/lib/focus.ts` to use context, not store/fixtures**

```typescript
"use client";
import { useApp } from "@/lib/store";
import { useCompanies } from "@/lib/industry-context";

export function useFocus() {
  const companies = useCompanies();
  const focusId = useApp((s) => s.focusCompany);
  const setFocusCompany = useApp((s) => s.setFocusCompany);
  const focusName = focusId ? (companies.find((c) => c.id === focusId)?.name ?? null) : null;
  const active = !!focusName;
  const toggleFocus = (id: string) => setFocusCompany(focusId === id ? null : id);
  const clearFocus = () => setFocusCompany(null);
  const matchesText = (text: string) => {
    if (!focusName) return false;
    const a = text.toLowerCase(); const b = focusName.toLowerCase();
    return a.includes(b) || b.includes(a);
  };
  const nameToId = (name: string) =>
    companies.find((c) => c.name.toLowerCase() === name.toLowerCase())?.id ?? null;
  return { focusId, focusName, active, toggleFocus, clearFocus, matchesText, nameToId, setFocusCompany };
}

export function focusDim(active: boolean, matched: boolean): string {
  return active && !matched ? "opacity-35" : "";
}
```

- [ ] **Step 4: Remove the store bridge**

In `src/lib/store.ts`: remove `industry` and `setIndustry` from the interface, the initial state, and `partialize`. In `src/lib/industry-context.tsx`: remove the `useEffect` bridge and the `useApp`/`setIndustry` import (industry now lives only in the route). Confirm no file still calls `useApp((s) => s.industry)` or `setIndustry`:

Run: `grep -rn "s.industry\|setIndustry\|getIndustryData" src/components src/lib` → expect no matches (except `getIndustryData` inside `fixtures.ts`, which is fine).

- [ ] **Step 5: Full verification**

Run: `npx tsc --noEmit` → exit 0.
Run: `npm run lint` → no errors.
With dev running, curl all 22 routes under `/semiconductor/...`, plus `/ai/...` and `/battery/...` spot checks → all 200; `/` → 307.
Manually confirm in the browser: industry selector switches data, cross-filter focus chip + dimming still work, 3D map renders.

- [ ] **Step 6: Commit**

```bash
git add -A src/app src/components src/lib
git commit -m "refactor: dashboard from postgres; retire industry store bridge"
```

---

## Task 12: Docs

- [ ] **Step 1:** Update `docs/ROADMAP.md` Phase Z line: mark Plan 2 DONE, Plan 3 (real fetchers) next.
- [ ] **Step 2:** Update `etl/README.md` note: the app now reads Postgres; `fixtures.ts` is dump-only.
- [ ] **Step 3:** Commit `docs: plan 2 complete (app renders from postgres)`.

---

## Definition of Done (Plan 2)

- All routes live under `app/[industry]/`; `/` redirects to `/semiconductor`; bad industry → 404.
- Pages are async server components reading the `server-only` Postgres provider; widgets receive data as props; `industry` comes from the route via `useIndustry()`.
- No component imports `@/lib/fixtures` or calls `getIndustryData` (only the ETL dump uses `fixtures.ts`); the Zustand store no longer holds `industry`.
- Cross-filter focus, industry switching, and the 3D map all still work.
- `npx tsc --noEmit` clean, `npm run lint` clean, all routes 200.
