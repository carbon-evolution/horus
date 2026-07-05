"use client";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { getSupplierEdges } from "@/lib/provider";
import { INDUSTRY_LABEL } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { RiskBadge } from "@/components/ui/RiskBadge";

export function SuppliersView() {
  const industry = useApp((s) => s.industry);
  const edges = getSupplierEdges(industry);
  const buyers = useMemo(() => [...new Set(edges.map((e) => e.buyer))], [edges]);
  const [buyer, setBuyer] = useState<string>(buyers[0] ?? "");
  const rows = edges.filter((e) => e.buyer === buyer);

  return (
    <div className="space-y-3">
      <PageHeader title="Suppliers & Vendors" subtitle={`${INDUSTRY_LABEL[industry]} · buyer → multi-tier supplier dependencies`} />
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
        {/* buyer list */}
        <Panel title="Buyers" className="xl:col-span-1" bodyClassName="p-2">
          <ul className="space-y-0.5">
            {buyers.map((b) => (
              <li key={b}>
                <button
                  onClick={() => setBuyer(b)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    buyer === b ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--text-dim)] hover:bg-white/5"
                  }`}
                >
                  {b}
                  <span className="ml-1 text-[10px] text-[var(--text-faint)]">
                    {edges.filter((e) => e.buyer === b).length} suppliers
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        {/* supplier detail */}
        <Panel title={`${buyer} — Supplier Network`} className="xl:col-span-3" bodyClassName="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-[var(--text-dim)]">
                <th className="pb-2 font-medium">Supplier</th>
                <th className="pb-2 font-medium">Tier</th>
                <th className="pb-2 font-medium">Material / Input</th>
                <th className="pb-2 text-right font-medium">Annual Spend</th>
                <th className="pb-2 text-right font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e, i) => (
                <tr key={i} className="border-t border-[var(--panel-border)]">
                  <td className="py-2 font-medium">{e.supplier}</td>
                  <td className="py-2">
                    <span className="rounded bg-[var(--panel-2)] px-1.5 py-0.5 text-[11px] text-[var(--text-dim)]">Tier {e.tier}</span>
                  </td>
                  <td className="py-2 text-[var(--text-dim)]">{e.material}</td>
                  <td className="py-2 text-right tabular-nums">{e.spend}</td>
                  <td className="py-2 text-right"><RiskBadge level={e.risk} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}
