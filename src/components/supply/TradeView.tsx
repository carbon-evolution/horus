"use client";
import { useApp } from "@/lib/store";
import { getSankey, getShipments } from "@/lib/provider";
import { INDUSTRY_LABEL, type ShipMode } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { RawMaterialsSankey } from "@/components/dashboard/RawMaterialsSankey";
import { Icon } from "@/components/Icon";

const MODE_ICON: Record<ShipMode, string> = { sea: "Ship", air: "Plane", rail: "Train" };

export function TradeView() {
  const industry = useApp((s) => s.industry);
  const sankey = getSankey(industry);
  const shipments = getShipments(industry);

  return (
    <div className="space-y-3">
      <PageHeader title="Trade & Shipments" subtitle={`${INDUSTRY_LABEL[industry]} · sourcing flows, freight lanes and tariff exposure`} />

      <Panel title="Sourcing Flow (Origin → Material → Destination)">
        <RawMaterialsSankey data={sankey} />
      </Panel>

      <Panel title="Freight Lanes & Tariff Exposure" bodyClassName="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-[var(--text-dim)]">
              <th className="pb-2 font-medium">Lane</th>
              <th className="pb-2 font-medium">Mode</th>
              <th className="pb-2 font-medium">Commodity</th>
              <th className="pb-2 text-right font-medium">Volume</th>
              <th className="pb-2 font-medium">Tariff</th>
              <th className="pb-2 text-right font-medium">Risk</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((s, i) => (
              <tr key={i} className="border-t border-[var(--panel-border)]">
                <td className="py-2 font-medium">{s.lane}</td>
                <td className="py-2">
                  <span className="inline-flex items-center gap-1.5 capitalize text-[var(--text-dim)]">
                    <Icon name={MODE_ICON[s.mode]} size={14} /> {s.mode}
                  </span>
                </td>
                <td className="py-2 text-[var(--text-dim)]">{s.commodity}</td>
                <td className="py-2 text-right tabular-nums">{s.volume}</td>
                <td className="py-2">
                  <span className={s.tariff.toLowerCase().includes("control") ? "text-[var(--risk-high)]" : "text-[var(--text-dim)]"}>{s.tariff}</span>
                </td>
                <td className="py-2 text-right"><RiskBadge level={s.risk} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
