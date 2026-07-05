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
}
