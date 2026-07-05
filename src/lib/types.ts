export const INDUSTRIES = ["semiconductor", "ai", "battery"] as const;
export type Industry = (typeof INDUSTRIES)[number];

export const INDUSTRY_LABEL: Record<Industry, string> = {
  semiconductor: "Semiconductor",
  ai: "AI Industry",
  battery: "Battery Industry",
};

export type RiskLevel = "low" | "medium" | "high";

export interface Kpi {
  label: string;
  value: string;
  icon: string; // lucide icon name
  accent: string; // hex
}

export interface Company {
  id: string;
  name: string;
  ticker: string;
  marketCap: string;
  price: string;
  change24h: number;
  changeYtd: number;
}

export type FacilityType = "fab" | "backend" | "rnd" | "hq" | "refinery";
export type FacilityStatus = "operating" | "planned" | "construction" | "risk";
export interface Facility {
  id: string;
  companyId: string;
  name: string;
  lat: number;
  lng: number;
  type: FacilityType;
  status: FacilityStatus;
}

export interface NewsItem {
  id: string;
  company: string;
  headline: string;
  impact: RiskLevel;
  impactLabel: string;
  ago: string;
  sentiment?: "positive" | "neutral" | "negative";
}

export interface RadarAxis {
  axis: string;
  value: number; // 0-100 risk
}

export interface SankeyNode {
  name: string;
}
export interface SankeyLink {
  source: number;
  target: number;
  value: number;
}
export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export interface FinancialSeriesPoint {
  company: string;
  revenue: number;
  profit: number;
  rnd: number;
  capex: number;
}

export interface Deal {
  date: string;
  parties: string;
  type: string;
  value: string;
  description: string;
}

export interface Supplier {
  name: string;
  category: string;
  spend: string;
  risk: RiskLevel;
}

export interface ResearchRow {
  company: string;
  rndExpense: string;
  rndPctRevenue: string;
  patents: string;
}

// --- Companies section ---
export interface CompanySegment {
  name: string;
  share: number; // % of revenue
}
export interface CompanyMeta {
  ceo: string;
  hq: string;
  employees: string;
  founded: string;
  description: string;
  healthScore: number; // 0-100 operational health
  exposure: RiskLevel; // supply-chain exposure
  segments: CompanySegment[];
}
export interface FinancialTTMPoint {
  period: string; // e.g. "Q1'24"
  revenue: number;
  profit: number;
  rnd: number;
  capex: number;
}
export interface PatentCategory {
  name: string;
  count: number;
}
export interface PatentRow {
  company: string;
  total: number;
  pending: number;
  categories: PatentCategory[];
}

export interface IndustryData {
  kpis: Kpi[];
  companies: Company[];
  facilities: Facility[];
  news: NewsItem[];
  radar: RadarAxis[];
  sankey: SankeyData;
  financials: FinancialSeriesPoint[];
  deals: Deal[];
  suppliers: Supplier[];
  research: ResearchRow[];
  // Optional richer fixtures (Companies section); provider fills defaults when absent.
  companyMeta?: Record<string, CompanyMeta>;
  patents?: PatentRow[];
}
