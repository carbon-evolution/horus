"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useApp } from "@/lib/store";
import { getMarketIntel } from "@/lib/fixtures";
import { INDUSTRY_LABEL } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";

function utilColor(pct: number) {
  return pct >= 95 ? "var(--risk-high)" : pct >= 80 ? "var(--risk-med)" : "var(--risk-low)";
}

export function MarketIntelView() {
  const industry = useApp((s) => s.industry);
  const m = getMarketIntel(industry);

  return (
    <div className="space-y-3">
      <PageHeader title="Market Intelligence" subtitle={`${INDUSTRY_LABEL[industry]} · inventories, lead times and capacity utilization`} />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Panel title="Days of Inventory (industry avg)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={m.inventoryRatio} margin={{ top: 6, right: 10, bottom: 0, left: -16 }}>
              <XAxis dataKey="period" tick={{ fill: "#8695ab", fontSize: 10 }} />
              <YAxis tick={{ fill: "#5b6a80", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#0d1420", border: "1px solid #1e2a3d", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2.5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Delivery Lead Times">
          <ul className="space-y-2.5">
            {m.leadTimes.map((l) => (
              <li key={l.component} className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-dim)]">{l.component}</span>
                <span className="tabular-nums">
                  {l.weeks} wks{" "}
                  <span className="text-xs" style={{ color: l.delta > 0 ? "var(--neg)" : l.delta < 0 ? "var(--pos)" : "var(--text-faint)" }}>
                    {l.delta > 0 ? `▲ +${l.delta}` : l.delta < 0 ? `▼ ${l.delta}` : "—"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] text-[var(--text-faint)]">Delta vs prior quarter (weeks).</p>
        </Panel>

        <Panel title="Capacity Utilization">
          <div className="space-y-3">
            {m.utilization.map((u) => (
              <div key={u.segment}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{u.segment}</span>
                  <span className="tabular-nums" style={{ color: utilColor(u.pct) }}>{u.pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--panel-2)]">
                  <div className="h-full rounded-full" style={{ width: `${u.pct}%`, background: utilColor(u.pct) }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-[var(--text-faint)]">≥95% signals allocation risk; ≤70% signals oversupply.</p>
        </Panel>
      </div>
    </div>
  );
}
