"use client";
import { useState } from "react";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type ShipMode, type SankeyData, type TradeShipment } from "@/lib/types";
import { chokepointsForLane } from "@/lib/maritime";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { StatTile } from "@/components/ui/StatTile";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { RawMaterialsSankey } from "@/components/dashboard/RawMaterialsSankey";
import { Icon } from "@/components/Icon";

const MODE_ICON: Record<ShipMode, string> = { sea: "Ship", air: "Plane", rail: "Train" };

// Derive headline trade metrics from the real sankey + shipment data.
function tradeStats(sankey: SankeyData, shipments: TradeShipment[]) {
  const hasIn = new Set<number>(), hasOut = new Set<number>();
  for (const l of sankey.links) { hasOut.add(l.source); hasIn.add(l.target); }
  const isMaterial = (i: number) => hasIn.has(i) && hasOut.has(i);
  const materialCount = sankey.nodes.filter((_, i) => isMaterial(i)).length;

  // Strongest single-country dependency across materials (its supply share).
  let topDep = { material: "—", country: "—", share: 0 };
  for (let m = 0; m < sankey.nodes.length; m++) {
    if (!isMaterial(m)) continue;
    const inbound = sankey.links.filter((l) => l.target === m);
    const inTotal = inbound.reduce((s, l) => s + l.value, 0) || 1;
    for (const l of inbound) {
      const share = l.value / inTotal;
      if (share > topDep.share) topDep = { material: sankey.nodes[m].name.trim(), country: sankey.nodes[l.source].name.trim(), share };
    }
  }
  const highRisk = shipments.filter((s) => s.risk === "high").length;
  return { materialCount, topDep, highRisk, lanes: shipments.length };
}

export function TradeView({ sankey, shipments, companySankey, materialLanes }: { sankey: SankeyData; shipments: TradeShipment[]; companySankey: SankeyData; materialLanes: TradeShipment[] }) {
  const industry = useIndustry();
  const stats = tradeStats(sankey, shipments);
  const [flowTab, setFlowTab] = useState<"country" | "company">("country");
  const hasCompany = companySankey.links.length > 0;

  return (
    <div className="space-y-3">
      <PageHeader title="Trade & Shipments" subtitle={`${INDUSTRY_LABEL[industry]} · sourcing flows, freight lanes and tariff exposure`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Materials Tracked" value={stats.materialCount} icon="Boxes" accent="#34d399" />
        <StatTile label="Active Lanes" value={stats.lanes} icon="Ship" accent="#38bdf8" />
        <StatTile label="High-Risk Lanes" value={stats.highRisk} icon="TriangleAlert" accent="#ef4444" />
        <StatTile label="Top Dependency" value={`${Math.round(stats.topDep.share * 100)}%`} sub={`${stats.topDep.country} · ${stats.topDep.material}`} icon="Crosshair" accent="#f59e0b" />
      </div>

      <Panel title={flowTab === "country" ? "Sourcing Flow (Origin → Material → Destination)" : "Sourcing Flow (Supplier → Input → Buyer)"}>
        <div className="mb-4 inline-flex rounded-lg border border-[var(--panel-border)] p-1 text-[15px] font-semibold">
          <button
            onClick={() => setFlowTab("country")}
            className={`rounded-md px-6 py-3 transition-colors ${flowTab === "country" ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--text-dim)] hover:text-[var(--text)]"}`}
          >
            By country
          </button>
          <button
            onClick={() => hasCompany && setFlowTab("company")}
            disabled={!hasCompany}
            title={hasCompany ? "" : "No company-level supply data for this industry"}
            className={`rounded-md px-6 py-3 transition-colors ${flowTab === "company" ? "bg-[var(--accent)]/15 text-[var(--accent)]" : hasCompany ? "text-[var(--text-dim)] hover:text-[var(--text)]" : "cursor-not-allowed text-[var(--text-faint)]"}`}
          >
            By company
          </button>
        </div>
        {flowTab === "country"
          ? <RawMaterialsSankey data={sankey} variant="country" />
          : <RawMaterialsSankey data={companySankey} variant="company" />}
        {flowTab === "country" && (
          <p className="mt-2 text-[10px] text-[var(--text-faint)]">
            Producer shares from UN Comtrade 2024 export data (WITS, per-material HS codes); USGS · Statista industry
            estimates where trade codes are ambiguous. Per-material provenance on the Raw Materials page.
          </p>
        )}
      </Panel>

      <Panel title="Freight Lanes & Tariff Exposure" bodyClassName="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-[var(--text-dim)]">
              <th className="pb-2 pr-4 font-medium">Lane</th>
              <th className="pb-2 pr-4 font-medium">Mode</th>
              <th className="pb-2 pr-4 font-medium">Commodity</th>
              <th className="pb-2 pr-6 text-right font-medium">Volume</th>
              <th className="pb-2 pr-4 font-medium">Tariff</th>
              <th className="pb-2 text-right font-medium">Risk</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((s, i) => (
              <tr key={i} className="border-t border-[var(--panel-border)]">
                <td className="py-2 pr-4 font-medium">{s.lane}</td>
                <td className="py-2 pr-4">
                  <span className="inline-flex items-center gap-1.5 capitalize text-[var(--text-dim)]">
                    <Icon name={MODE_ICON[s.mode]} size={14} /> {s.mode}
                  </span>
                </td>
                <td className="py-2 pr-4 text-[var(--text-dim)]">{s.commodity}</td>
                <td className="py-2 pr-6 text-right tabular-nums whitespace-nowrap">{s.volume}</td>
                <td className="py-2 pr-4">
                  <span className={s.tariff.toLowerCase().includes("control") ? "text-[var(--risk-high)]" : "text-[var(--text-dim)]"}>{s.tariff}</span>
                </td>
                <td className="py-2 text-right"><RiskBadge level={s.risk} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {materialLanes.length > 0 && (
        <Panel title="Raw Material Shipping Routes" bodyClassName="overflow-x-auto">
          <div className="mb-2 text-[11px] text-[var(--text-dim)]">
            How each raw material moves from its producing country to a manufacturing hub, and the maritime chokepoints that route transits — the same lanes projected onto the map in Risk → Geopolitical.
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-[var(--text-dim)]">
                <th className="pb-2 pr-4 font-medium">Material</th>
                <th className="pb-2 pr-4 font-medium">Route</th>
                <th className="pb-2 pr-4 font-medium">Mode</th>
                <th className="pb-2 pr-6 text-right font-medium">Est. Value</th>
                <th className="pb-2 pr-4 font-medium">Chokepoints</th>
                <th className="pb-2 text-right font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {[...materialLanes].sort((a, b) => a.commodity.localeCompare(b.commodity)).map((s, i) => {
                const cps = s.mode === "sea" ? chokepointsForLane(s.origin, s.destination) : [];
                return (
                  <tr key={i} className="border-t border-[var(--panel-border)] align-top">
                    <td className="py-2 pr-4 font-medium">{s.commodity}</td>
                    <td className="py-2 pr-4 text-[var(--text-dim)]">{s.origin} → {s.destination}</td>
                    <td className="py-2 pr-4">
                      <span className="inline-flex items-center gap-1.5 capitalize text-[var(--text-dim)]">
                        <Icon name={MODE_ICON[s.mode]} size={14} /> {s.mode}
                      </span>
                    </td>
                    <td className="py-2 pr-6 text-right tabular-nums whitespace-nowrap">{s.volume}</td>
                    <td className="py-2 pr-4">
                      {cps.length ? (
                        <div className="flex flex-wrap gap-1">
                          {cps.map((c) => (
                            <span key={c} className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-2)] px-2 py-0.5 text-[10px] text-[var(--text-dim)]">{c}</span>
                          ))}
                        </div>
                      ) : <span className="text-[10px] text-[var(--text-faint)]">{s.mode === "air" ? "air freight" : "—"}</span>}
                    </td>
                    <td className="py-2 text-right"><RiskBadge level={s.risk} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
