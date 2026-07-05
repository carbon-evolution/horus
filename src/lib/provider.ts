import { getIndustryData } from "@/lib/data";
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
export function getRadar(industry: Industry): RadarAxis[] {
  return getIndustryData(industry).radar;
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
