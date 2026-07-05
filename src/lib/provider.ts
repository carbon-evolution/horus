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
