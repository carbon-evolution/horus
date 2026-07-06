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
// Cross-company corporate structure (Wikidata: parent P127, subsidiary P355, owner-of P1830).
export interface Holdings {
  parent: string | null;
  subsidiaries: string[];
  investments: string[];
}
// A recent SEC EDGAR filing (incl. M&A 8-K items), linked to the source document.
export interface Filing {
  form: string;
  date: string;
  label: string;
  href: string;
}
// Multi-year annual series parsed from SEC XBRL company-facts (10-K / 20-F).
// Each value is in USD billions. Metrics absent from a filer's facts are omitted.
export interface FinancialHistoryPoint {
  year: number;
  val: number;
}
export interface FinancialHistory {
  rnd?: FinancialHistoryPoint[];
  capex?: FinancialHistoryPoint[];
  acquisitions?: FinancialHistoryPoint[];
  revenue?: FinancialHistoryPoint[];
  netIncome?: FinancialHistoryPoint[];
  source?: string; // provenance: SEC EDGAR XBRL (US filers) or Yahoo (foreign filers)
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

// --- Supply Chain section ---
export interface SupplierEdge {
  buyer: string;
  supplier: string;
  tier: 1 | 2 | 3;
  material: string;
  spend: string;
  risk: RiskLevel;
}
export interface ProducerShare {
  country: string;
  share: number; // % of global output
}
export interface RawMaterial {
  id: string;
  name: string;
  category: string;
  price: string;
  concentration: number; // top-3 sourcing concentration %
  supplyRisk: RiskLevel;
  topProducers: ProducerShare[];
  usedIn: string;
}
export type ShipMode = "sea" | "air" | "rail";
export interface TradeShipment {
  lane: string;
  origin: string;
  destination: string;
  mode: ShipMode;
  commodity: string;
  volume: string;
  tariff: string;
  risk: RiskLevel;
}
export interface GraphNode {
  id: string;
  name: string;
  group: "company" | "supplier" | "material";
  val: number;
}
export interface GraphLink {
  source: string;
  target: string;
  value: number;
}
export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// --- Risk & Compliance section ---
export interface Policy {
  id: string;
  title: string;
  authority: string;
  region: string;
  date: string;
  severity: RiskLevel;
  targets: string[];
  summary: string;
}
export interface EsgProfile {
  company: string;
  scope1: number; // MtCO2e
  scope2: number;
  scope3: number;
  waterRisk: RiskLevel; // scarcity exposure at production sites
  netZeroTarget: string;
  ethicalSourcing: RiskLevel; // supply-loop compliance risk
}
export interface Chokepoint {
  name: string;
  share: string; // e.g. "~40% of global chip trade"
  risk: RiskLevel;
}
export interface GeoRisk {
  country: string;
  flag: string;
  tension: number; // 0-100
  role: string;
  localization: number; // % domestic supplier localization
  chokepoints: string[];
}

// --- Data & Analytics + Monitoring sections ---
export interface MarketIntel {
  inventoryRatio: { period: string; value: number }[]; // days of inventory
  leadTimes: { component: string; weeks: number; delta: number }[]; // delta vs prior quarter
  utilization: { segment: string; pct: number }[];
}
export interface SourceInfo {
  name: string;
  provides: string;
  cadence: string;
  lastSync: string;
  status: "healthy" | "degraded" | "offline";
  free: boolean;
}
export interface AlertItem {
  id: string;
  severity: RiskLevel;
  title: string;
  entity: string;
  href: string; // deep-link to the affected page
  ago: string;
}

export interface IndustryData {
  kpis: Kpi[];
  companies: Company[];
  facilities: Facility[];
  news: NewsItem[];
  sankey: SankeyData;
  financials: FinancialSeriesPoint[];
  deals: Deal[];
  suppliers: Supplier[];
  research: ResearchRow[];
  // Optional richer fixtures; provider fills defaults when absent.
  companyMeta?: Record<string, CompanyMeta>;
  patents?: PatentRow[];
  supplierEdges?: SupplierEdge[];
  materials?: RawMaterial[];
  shipments?: TradeShipment[];
}
