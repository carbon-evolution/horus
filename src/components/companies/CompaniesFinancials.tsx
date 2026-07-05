"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useApp } from "@/lib/store";
import { getCompanies, getFinancialsTTM, getFinancialsSnapshot } from "@/lib/provider";
import { INDUSTRY_LABEL } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { FinancialPerformance } from "@/components/dashboard/FinancialPerformance";

const LINE_COLORS = ["#3b82f6", "#a78bfa", "#34d399", "#f59e0b", "#f87171"];

export function CompaniesFinancials() {
  const industry = useApp((s) => s.industry);
  const snapshot = getFinancialsSnapshot(industry);
  const top = getCompanies(industry).slice(0, 5);

  // Merge each top company's TTM revenue into one series keyed by period.
  const periods = getFinancialsTTM(industry, top[0]?.id ?? "").map((p) => p.period);
  const revenueTrend = periods.map((period, i) => {
    const row: Record<string, number | string> = { period };
    for (const c of top) {
      const s = getFinancialsTTM(industry, c.id)[i];
      if (s) row[c.name] = s.revenue;
    }
    return row;
  });

  const ratios = snapshot.map((s) => ({
    company: s.company,
    revenue: s.revenue,
    profit: s.profit,
    margin: s.revenue ? (s.profit / s.revenue) * 100 : 0,
    rndPct: s.revenue ? (s.rnd / s.revenue) * 100 : 0,
    capex: s.capex,
  }));

  return (
    <div className="space-y-3">
      <PageHeader title="Financials" subtitle={`${INDUSTRY_LABEL[industry]} · comparative revenue, margins, R&D and capex`} />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Panel title="Revenue Trend — Top 5 (TTM, $B)">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={revenueTrend} margin={{ top: 6, right: 12, bottom: 0, left: -14 }}>
              <XAxis dataKey="period" tick={{ fill: "#8695ab", fontSize: 10 }} />
              <YAxis tick={{ fill: "#5b6a80", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#0d1420", border: "1px solid #1e2a3d", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {top.map((c, i) => (
                <Line key={c.id} type="monotone" dataKey={c.name} stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Financial Performance Snapshot ($B)">
          <FinancialPerformance data={snapshot} />
        </Panel>
      </div>

      <Panel title="Key Ratios" bodyClassName="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-[var(--text-dim)]">
              <th className="pb-2 font-medium">Company</th>
              <th className="pb-2 text-right font-medium">Revenue ($B)</th>
              <th className="pb-2 text-right font-medium">Profit ($B)</th>
              <th className="pb-2 text-right font-medium">Net Margin</th>
              <th className="pb-2 text-right font-medium">R&amp;D % Rev</th>
              <th className="pb-2 text-right font-medium">CapEx ($B)</th>
            </tr>
          </thead>
          <tbody>
            {ratios.map((r) => (
              <tr key={r.company} className="border-t border-[var(--panel-border)]">
                <td className="py-2 font-medium">{r.company}</td>
                <td className="py-2 text-right tabular-nums">{r.revenue.toFixed(1)}</td>
                <td className="py-2 text-right tabular-nums">{r.profit.toFixed(1)}</td>
                <td className="py-2 text-right tabular-nums" style={{ color: r.margin >= 0 ? "var(--pos)" : "var(--neg)" }}>{r.margin.toFixed(1)}%</td>
                <td className="py-2 text-right tabular-nums text-[var(--text-dim)]">{r.rndPct.toFixed(1)}%</td>
                <td className="py-2 text-right tabular-nums">{r.capex.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
