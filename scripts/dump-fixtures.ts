import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
// Relative imports (not the "@/lib" alias) so `tsx` resolves without tsconfig-paths.
import { INDUSTRIES, type Industry } from "../src/lib/types";
import {
  getKpis, getCompanies, getFacilities, getNews, getRadar, getSankey,
  getFinancialsSnapshot, getDeals, getSuppliers, getResearch,
  getSupplierEdges, getMaterials, getShipments,
  getPolicies, getEsgProfiles, getGeoRisks, getCompareRadar,
  getMarketIntel, getAlerts, getPatents,
  getDataSources, getChokepoints, getCompanyMetaMap,
} from "../src/lib/fixtures";

const OUT = join(process.cwd(), "etl", "seeds", "fixtures");
mkdirSync(OUT, { recursive: true });

function perIndustry(industry: Industry) {
  return {
    kpis: getKpis(industry),
    companies: getCompanies(industry),
    facilities: getFacilities(industry),
    news: getNews(industry),
    radar: getRadar(industry),
    sankey: getSankey(industry),
    financials: getFinancialsSnapshot(industry),
    deals: getDeals(industry),
    suppliers: getSuppliers(industry),
    research: getResearch(industry),
    supplierEdges: getSupplierEdges(industry),
    materials: getMaterials(industry),
    shipments: getShipments(industry),
    policies: getPolicies(industry),
    esg: getEsgProfiles(industry),
    geo: getGeoRisks(industry),
    compareRadar: getCompareRadar(industry),
    marketIntel: getMarketIntel(industry),
    alerts: getAlerts(industry),
    patents: getPatents(industry),
    companyMeta: getCompanyMetaMap(industry),
  };
}

for (const industry of INDUSTRIES) {
  const data = perIndustry(industry);
  writeFileSync(join(OUT, `${industry}.json`), JSON.stringify(data, null, 2));
  console.log(`wrote ${industry}.json (${Object.keys(data).length} datasets)`);
}

// Global (industry-independent) datasets.
const globalData = { sources: getDataSources(), chokepoints: getChokepoints() };
writeFileSync(join(OUT, `_global.json`), JSON.stringify(globalData, null, 2));
console.log(`wrote _global.json (${Object.keys(globalData).length} datasets)`);
