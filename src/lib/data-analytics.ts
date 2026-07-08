import type { Industry, MarketIntel, SourceInfo, AlertItem } from "@/lib/types";

// Analytics + Monitoring fixtures. Live later: derived macros (World Bank/OECD),
// pipeline sync metadata (real), GDELT-driven alerting.

const MARKET: Record<Industry, MarketIntel> = {
  semiconductor: {
    inventoryRatio: [
      { period: "Q3'23", value: 96 }, { period: "Q4'23", value: 88 }, { period: "Q1'24", value: 81 },
      { period: "Q2'24", value: 76 }, { period: "Q3'24", value: 72 }, { period: "Q4'24", value: 69 },
    ],
    leadTimes: [
      { component: "Advanced Logic (≤5nm)", weeks: 26, delta: 2 },
      { component: "HBM Memory", weeks: 40, delta: 8 },
      { component: "Mature Nodes (≥28nm)", weeks: 12, delta: -3 },
      { component: "EUV Systems", weeks: 78, delta: 0 },
      { component: "Substrates (ABF)", weeks: 18, delta: -2 },
    ],
    utilization: [
      { segment: "Leading-edge foundry", pct: 98 },
      { segment: "Mature-node foundry", pct: 79 },
      { segment: "Memory fabs", pct: 91 },
      { segment: "OSAT / packaging", pct: 87 },
    ],
  },
  ai: {
    inventoryRatio: [
      { period: "Q3'23", value: 12 }, { period: "Q4'23", value: 10 }, { period: "Q1'24", value: 9 },
      { period: "Q2'24", value: 8 }, { period: "Q3'24", value: 8 }, { period: "Q4'24", value: 7 },
    ],
    leadTimes: [
      { component: "H100/B200-class GPUs", weeks: 36, delta: -6 },
      { component: "HBM3e", weeks: 44, delta: 10 },
      { component: "CoWoS capacity", weeks: 52, delta: 4 },
      { component: "800G optics", weeks: 22, delta: -4 },
      { component: "Grid interconnect", weeks: 156, delta: 20 },
    ],
    utilization: [
      { segment: "Hyperscale AI clusters", pct: 96 },
      { segment: "GPU cloud (neocloud)", pct: 88 },
      { segment: "CoWoS packaging", pct: 99 },
      { segment: "HBM production", pct: 97 },
    ],
  },
  battery: {
    inventoryRatio: [
      { period: "Q3'23", value: 58 }, { period: "Q4'23", value: 66 }, { period: "Q1'24", value: 74 },
      { period: "Q2'24", value: 71 }, { period: "Q3'24", value: 65 }, { period: "Q4'24", value: 61 },
    ],
    leadTimes: [
      { component: "LFP Cells", weeks: 8, delta: -4 },
      { component: "High-Ni NMC Cells", weeks: 14, delta: -2 },
      { component: "Battery-grade lithium", weeks: 10, delta: -6 },
      { component: "Anode graphite (ex-China)", weeks: 30, delta: 6 },
      { component: "Cathode (CAM)", weeks: 16, delta: -1 },
    ],
    utilization: [
      { segment: "China gigafactories", pct: 62 },
      { segment: "Korea cell plants", pct: 74 },
      { segment: "US gigafactories", pct: 58 },
      { segment: "EU gigafactories", pct: 51 },
    ],
  },
};

// Every feed here is actually wired in etl/sources/*. Keep in sync with
// DATA_SOURCES in nav.ts. Do not list feeds that aren't connected.
export const SOURCES: SourceInfo[] = [
  { name: "Yahoo Finance", provides: "Quotes, market caps, TTM financials, R&D", cadence: "Daily", lastSync: "2h ago", status: "healthy", free: true },
  { name: "SEC EDGAR", provides: "US filings — 8-K/10-K/10-Q material events → alerts", cadence: "Daily", lastSync: "2h ago", status: "healthy", free: true },
  { name: "UN Comtrade (WITS)", provides: "Bilateral trade flows → shipments + material sourcing shares (per-material HS codes, import-mirror)", cadence: "Monthly", lastSync: "1d ago", status: "healthy", free: true },
  { name: "GDELT 2.0", provides: "Global news events, tone, conflict signals → news", cadence: "Daily", lastSync: "3h ago", status: "healthy", free: true },
  { name: "NIST NVD", provides: "CVEs for sector vendors (CVSS ≥7) → cyber alerts", cadence: "Daily", lastSync: "2h ago", status: "healthy", free: true },
  { name: "US Federal Register", provides: "Export-control / Entity-List / CHIPS rules → policies", cadence: "Daily", lastSync: "2h ago", status: "healthy", free: true },
  { name: "Wikidata", provides: "Company metadata — CEO, HQ, founded, headcount", cadence: "Weekly", lastSync: "2h ago", status: "healthy", free: true },
  { name: "PatentsView", provides: "US patent filings + assignments → patents", cadence: "Weekly", lastSync: "3d ago", status: "degraded", free: true },
  { name: "Korea DART", provides: "Korean regulatory filings (Samsung, SK hynix, LG Energy) → filings", cadence: "Daily", lastSync: "1d ago", status: "healthy", free: true },
  { name: "USGS", provides: "Mineral production estimates — curated shares where trade codes are ambiguous", cadence: "Annual", lastSync: "static", status: "healthy", free: true },
  { name: "Statista", provides: "Industry estimates — specialty inputs (photoresist, HBM, CoWoS, ABF substrate)", cadence: "Annual", lastSync: "static", status: "healthy", free: false },
];

const ALERTS: Record<Industry, AlertItem[]> = {
  semiconductor: [
    { id: "s1", severity: "high", title: "New BIS export-control package expected this week", entity: "US → China policy", href: "/risk/policies", ago: "35m ago" },
    { id: "s2", severity: "high", title: "Taiwan Strait naval activity elevated", entity: "Taiwan", href: "/risk/geopolitical", ago: "2h ago" },
    { id: "s3", severity: "medium", title: "HBM lead times extended to 40 weeks", entity: "SK hynix / Micron", href: "/analytics/market", ago: "5h ago" },
    { id: "s4", severity: "medium", title: "Neon spot price up 18% w/w", entity: "Neon Gas", href: "/supply-chain/materials", ago: "9h ago" },
    { id: "s5", severity: "low", title: "TSMC Arizona fab hits qualification milestone", entity: "TSMC", href: "/companies/tsmc", ago: "1d ago" },
    { id: "s6", severity: "high", title: "Gallium export permit approvals slowing", entity: "China MOFCOM", href: "/supply-chain/materials", ago: "1d ago" },
  ],
  ai: [
    { id: "a1", severity: "high", title: "CoWoS capacity fully booked through 2025", entity: "TSMC packaging", href: "/analytics/market", ago: "1h ago" },
    { id: "a2", severity: "high", title: "Datacenter interconnect queue exceeds 3 years", entity: "US grid", href: "/analytics/market", ago: "4h ago" },
    { id: "a3", severity: "medium", title: "EU AI Act GPAI enforcement guidance published", entity: "EU policy", href: "/risk/policies", ago: "8h ago" },
    { id: "a4", severity: "medium", title: "HBM3e supply allocated to top-3 buyers", entity: "NVIDIA / MSFT / Meta", href: "/supply-chain/suppliers", ago: "1d ago" },
    { id: "a5", severity: "low", title: "CoreWeave adds 2 new NJ datacenters", entity: "CoreWeave", href: "/companies/coreweave", ago: "2d ago" },
  ],
  battery: [
    { id: "b1", severity: "high", title: "DRC cobalt logistics disruption at Kolwezi", entity: "DR Congo", href: "/risk/geopolitical", ago: "50m ago" },
    { id: "b2", severity: "high", title: "Graphite export permits delayed for 3 anode makers", entity: "China MOFCOM", href: "/supply-chain/materials", ago: "3h ago" },
    { id: "b3", severity: "medium", title: "Lithium spot rebounds 6% off cycle low", entity: "Lithium", href: "/supply-chain/materials", ago: "7h ago" },
    { id: "b4", severity: "medium", title: "FEOC guidance update affects 2 JV structures", entity: "US IRA policy", href: "/risk/policies", ago: "1d ago" },
    { id: "b5", severity: "low", title: "CATL sodium-ion enters mass production", entity: "CATL", href: "/companies/catl", ago: "2d ago" },
  ],
};

export function getMarketIntelData(industry: Industry): MarketIntel {
  return MARKET[industry];
}
export function getAlertsData(industry: Industry): AlertItem[] {
  return ALERTS[industry];
}
