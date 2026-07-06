import { getIndustryData } from "@/lib/data";
import { SUPPLY_DATA } from "@/lib/data-supply";
import { RISK_DATA, CHOKEPOINTS } from "@/lib/data-risk";
import { getMarketIntelData, getAlertsData, SOURCES } from "@/lib/data-analytics";
import type {
  Industry,
  Company,
  CompanyMeta,
  FinancialTTMPoint,
  FinancialSeriesPoint,
  PatentRow,
  Facility,
  NewsItem,
  Deal,
  Supplier,
  ResearchRow,
  RadarAxis,
  SankeyData,
  Kpi,
  SupplierEdge,
  RawMaterial,
  TradeShipment,
  GraphData,
  GraphNode,
  GraphLink,
  Policy,
  EsgProfile,
  GeoRisk,
  Chokepoint,
  MarketIntel,
  SourceInfo,
  AlertItem,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Provider seam. Components import getters from HERE, never from data.ts.
// Today these read the in-memory mock. In the real-data phase, swap the bodies
// to `fetch('/api/…')` against the cached Postgres/Redis layer — no component
// changes required.
// ---------------------------------------------------------------------------

export function getKpis(industry: Industry): Kpi[] {
  return getIndustryData(industry).kpis;
}
export function getCompanies(industry: Industry): Company[] {
  return getIndustryData(industry).companies;
}
export function getCompany(industry: Industry, id: string): Company | undefined {
  return getIndustryData(industry).companies.find((c) => c.id === id);
}
export function getFacilities(industry: Industry): Facility[] {
  return getIndustryData(industry).facilities;
}
export function getNews(industry: Industry): NewsItem[] {
  return getIndustryData(industry).news;
}
export function getDeals(industry: Industry): Deal[] {
  return getIndustryData(industry).deals;
}
export function getSuppliers(industry: Industry): Supplier[] {
  return getIndustryData(industry).suppliers;
}
export function getResearch(industry: Industry): ResearchRow[] {
  return getIndustryData(industry).research;
}
// Dashboard axis labels (fuller wording than the compact compare-chart labels),
// same order/semantics as data-risk.ts AXES.
const DASHBOARD_RADAR_LABELS = [
  "Geopolitical Risk", "Supplier Concentration", "Financial Stability", "Operational Risk",
  "Regulatory Risk", "ESG & Environmental Risk", "Raw Material Risk", "Logistics Risk",
];
export function getRadar(industry: Industry): RadarAxis[] {
  // Single source of truth: the dashboard composite IS the Risk page's "Sector
  // Avg", just relabeled — so the two radars can never disagree.
  const sectorAvg = getCompareRadar(industry).find((s) => s.entity === "Sector Avg");
  const axes = sectorAvg?.axes ?? [];
  return DASHBOARD_RADAR_LABELS.map((axis, i) => ({ axis, value: axes[i]?.value ?? 0 }));
}
export function getSankey(industry: Industry): SankeyData {
  return getIndustryData(industry).sankey;
}
export function getFinancialsSnapshot(industry: Industry): FinancialSeriesPoint[] {
  return getIndustryData(industry).financials;
}

// Deterministic hash so derived defaults are stable across renders.
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const DEFAULT_EXPOSURE = ["low", "medium", "high"] as const;

export function getCompanyMeta(industry: Industry, id: string): CompanyMeta {
  const explicit = getIndustryData(industry).companyMeta?.[id];
  if (explicit) return explicit;
  const c = getCompany(industry, id);
  const name = c?.name ?? id;
  const h = hash(id);
  return {
    ceo: "—",
    hq: "—",
    employees: `${20 + (h % 200)}k`,
    founded: `${1970 + (h % 45)}`,
    description: `${name} is a tracked ${industry} company.`,
    healthScore: 50 + ((c?.changeYtd ?? 0) > 0 ? 20 : 5) + (h % 20),
    exposure: DEFAULT_EXPOSURE[h % 3],
    segments: [
      { name: "Core", share: 60 },
      { name: "Adjacent", share: 25 },
      { name: "Other", share: 15 },
    ],
  };
}

// Raw explicit companyMeta map (may be undefined) — used only by the ETL dump so
// the async provider can serve explicit overrides and derive the rest.
export function getCompanyMetaMap(industry: Industry): Record<string, CompanyMeta> {
  return getIndustryData(industry).companyMeta ?? {};
}

// TTM series derived deterministically from the single snapshot value so the
// Financials page has a trend to plot. 6 periods ending at the latest snapshot.
const PERIODS = ["Q3'23", "Q4'23", "Q1'24", "Q2'24", "Q3'24", "Q4'24"];
export function getFinancialsTTM(industry: Industry, companyId: string): FinancialTTMPoint[] {
  const snap = getFinancialsSnapshot(industry).find(
    (f) => f.company.toLowerCase() === (getCompany(industry, companyId)?.name ?? companyId).toLowerCase(),
  );
  if (!snap) return [];
  const factor = (i: number) => 0.82 + i * 0.036; // gentle ramp to 1.0 at latest
  return PERIODS.map((period, i) => ({
    period,
    revenue: +(snap.revenue * factor(i)).toFixed(1),
    profit: +(snap.profit * factor(i)).toFixed(1),
    rnd: +(snap.rnd * factor(i)).toFixed(2),
    capex: +(snap.capex * factor(i)).toFixed(1),
  }));
}

// --- Supply Chain ---
export function getSupplierEdges(industry: Industry): SupplierEdge[] {
  return getIndustryData(industry).supplierEdges ?? SUPPLY_DATA[industry].supplierEdges;
}
export function getMaterials(industry: Industry): RawMaterial[] {
  return getIndustryData(industry).materials ?? SUPPLY_DATA[industry].materials;
}
export function getShipments(industry: Industry): TradeShipment[] {
  return getIndustryData(industry).shipments ?? SUPPLY_DATA[industry].shipments;
}

function spendNum(s: string): number {
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 1;
}

// Derive the force-graph from supplier edges: nodes are buyers/suppliers,
// grouped "company" when the name matches a tracked company, else "supplier".
export function getSupplyGraph(industry: Industry): GraphData {
  const edges = getSupplierEdges(industry);
  const companyNames = new Set(getCompanies(industry).map((c) => c.name.toLowerCase()));
  const nodeMap = new Map<string, GraphNode>();
  const ensure = (name: string) => {
    if (!nodeMap.has(name)) {
      nodeMap.set(name, {
        id: name,
        name,
        group: companyNames.has(name.toLowerCase()) ? "company" : "supplier",
        val: 1,
      });
    }
    return nodeMap.get(name)!;
  };
  const links: GraphLink[] = edges.map((e) => {
    const v = spendNum(e.spend);
    ensure(e.buyer).val += v;
    ensure(e.supplier).val += v;
    return { source: e.supplier, target: e.buyer, value: v }; // vendor → client
  });
  return { nodes: [...nodeMap.values()], links };
}

// --- Risk & Compliance ---
export function getPolicies(industry: Industry): Policy[] {
  return RISK_DATA[industry].policies;
}
export function getEsgProfiles(industry: Industry): EsgProfile[] {
  return RISK_DATA[industry].esg;
}
export function getGeoRisks(industry: Industry): GeoRisk[] {
  return RISK_DATA[industry].geo;
}
export function getChokepoints(): Chokepoint[] {
  return CHOKEPOINTS;
}
export function getCompareRadar(industry: Industry) {
  return RISK_DATA[industry].compareRadar;
}

// --- Data & Analytics + Monitoring ---
export function getMarketIntel(industry: Industry): MarketIntel {
  return getMarketIntelData(industry);
}
export function getDataSources(): SourceInfo[] {
  return SOURCES;
}
export function getAlerts(industry: Industry): AlertItem[] {
  return getAlertsData(industry);
}

export function getPatents(industry: Industry): PatentRow[] {
  const explicit = getIndustryData(industry).patents;
  if (explicit) return explicit;
  // Derive from the research fixture when explicit patent data is absent.
  return getResearch(industry).map((r) => {
    const total = parseInt(r.patents.replace(/[^0-9]/g, ""), 10) || 0;
    return {
      company: r.company,
      total,
      pending: Math.round(total * 0.18),
      categories: [
        { name: "Core Tech", count: Math.round(total * 0.5) },
        { name: "Materials", count: Math.round(total * 0.3) },
        { name: "Packaging", count: Math.round(total * 0.2) },
      ],
    };
  });
}
