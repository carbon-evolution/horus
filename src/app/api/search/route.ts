import { NextRequest, NextResponse } from "next/server";
import {
  getCompanies, getMaterials, getChokepoints, getShipments, getMaterialLanes, getFinancialsSnapshot,
} from "@/lib/provider";
import { INDUSTRIES, type Industry } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Hit { type: string; label: string; sub: string; href: string; id?: string }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const industry = searchParams.get("industry") as Industry;
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 1 || !INDUSTRIES.includes(industry)) return NextResponse.json({ groups: [] });

  const [companies, materials, chokepoints, shipments, lanes, financials] = await Promise.all([
    getCompanies(industry), getMaterials(industry), getChokepoints(),
    getShipments(industry), getMaterialLanes(industry), getFinancialsSnapshot(industry),
  ]);

  const has = (s?: string) => (s ?? "").toLowerCase().includes(q);
  const wants = (re: RegExp) => re.test(q);
  const base = `/${industry}`;

  const companyHits: Hit[] = companies.filter((c) => has(c.name) || has(c.ticker))
    .slice(0, 6).map((c) => ({ type: "Company", label: c.name, sub: `${c.ticker} · ${c.marketCap}`, href: `${base}/companies/${c.id}`, id: c.id }));

  const finHits: Hit[] = financials
    .filter((f) => has(f.company) || wants(/revenue|profit|sales|income|margin|earnings/))
    .sort((a, b) => b.revenue - a.revenue).slice(0, 6)
    .map((f) => ({ type: "Financials", label: f.company, sub: `Revenue $${f.revenue}B · Profit $${f.profit}B`, href: `${base}/companies/financials` }));

  const materialHits: Hit[] = materials.filter((m) => has(m.name) || has(m.category) || has(m.usedIn))
    .slice(0, 6).map((m) => ({ type: "Raw Material", label: m.name, sub: `${m.category} · ${m.supplyRisk} risk · ${m.price}`, href: `${base}/supply-chain/materials` }));

  const cpHits: Hit[] = chokepoints.filter((c) => has(c.name) || wants(/chokepoint|strait|canal|maritime/))
    .slice(0, 6).map((c) => ({ type: "Chokepoint", label: c.name, sub: c.share, href: `${base}/risk/geopolitical` }));

  const seen = new Set<string>();
  const tradeHits: Hit[] = [...shipments, ...lanes]
    .filter((s) => has(s.lane) || has(s.commodity) || has(s.origin) || has(s.destination) || wants(/trade|shipment|lane|export/))
    .filter((s) => { const k = `${s.lane}|${s.commodity}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 6).map((s) => ({ type: "Trade", label: s.lane, sub: `${s.commodity} · ${s.volume}`, href: `${base}/supply-chain/trade` }));

  const groups = [
    { name: "Companies", items: companyHits },
    { name: "Raw Materials", items: materialHits },
    { name: "Maritime Chokepoints", items: cpHits },
    { name: "Trade & Shipments", items: tradeHits },
    { name: "Revenue & Profit", items: finHits },
  ].filter((g) => g.items.length > 0);

  return NextResponse.json({ groups });
}
