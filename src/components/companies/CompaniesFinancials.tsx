"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type Company, type FinancialSeriesPoint, type FinancialTTMPoint, type Scores } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { StatTile } from "@/components/ui/StatTile";
import { AiInsight } from "@/components/ui/AiInsight";
import { FinancialPerformance } from "@/components/dashboard/FinancialPerformance";
import { CompanyLink } from "@/components/ui/CompanyLink";

const LINE_COLORS = ["#3b82f6", "#a78bfa", "#34d399", "#f59e0b", "#f87171"];

const riskColor = (v: number) => (v < 35 ? "var(--risk-low)" : v < 65 ? "var(--risk-med)" : "var(--risk-high)");

// Semicircular gauge for a 0-100 risk value (higher = worse).
function RiskGauge({ value, label }: { value: number; label: string }) {
  const R = 54, CX = 70, CY = 70;
  const angle = Math.PI * (1 - value / 100); // 100 → 0 rad (right), 0 → π (left)
  const nx = CX + R * Math.cos(angle), ny = CY - R * Math.sin(angle);
  const largeArc = value > 50 ? 1 : 0;
  return (
    <div className="flex flex-col items-center">
      <svg width={140} height={86} viewBox="0 0 140 86">
        <path d={`M${CX - R},${CY} A${R},${R} 0 0 1 ${CX + R},${CY}`} fill="none" stroke="var(--panel-2)" strokeWidth={11} strokeLinecap="round" />
        <path d={`M${CX - R},${CY} A${R},${R} 0 ${largeArc} 1 ${nx},${ny}`} fill="none" stroke={riskColor(value)} strokeWidth={11} strokeLinecap="round" />
        <text x={CX} y={CY - 8} textAnchor="middle" fontSize={22} fontWeight={700} fill={riskColor(value)}>{Math.round(value)}</text>
        <text x={CX} y={CY + 8} textAnchor="middle" fontSize={9} fill="#8695ab">/100 risk</text>
      </svg>
      <div className="text-[11px] text-[var(--text-dim)]">{label}</div>
    </div>
  );
}

export function CompaniesFinancials({
  companies,
  financials: snapshot,
  ttm,
  scores,
}: {
  companies: Company[];
  financials: FinancialSeriesPoint[];
  ttm: Record<string, FinancialTTMPoint[]>;
  scores: Record<string, Scores | null>;
}) {
  const industry = useIndustry();
  const top = companies.slice(0, 5);

  // Merge each top company's TTM revenue into one series keyed by period.
  const periods = (ttm[top[0]?.id ?? ""] ?? []).map((p) => p.period);
  const revenueTrend = periods.map((period, i) => {
    const row: Record<string, number | string> = { period };
    for (const c of top) {
      const s = ttm[c.id]?.[i];
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

  const totalRev = snapshot.reduce((n, s) => n + s.revenue, 0);
  const totalProfit = snapshot.reduce((n, s) => n + s.profit, 0);
  const avgMargin = totalRev ? (totalProfit / totalRev) * 100 : 0;
  const avgRnd = totalRev ? (snapshot.reduce((n, s) => n + s.rnd, 0) / totalRev) * 100 : 0;
  const topMargin = [...ratios].sort((a, b) => b.margin - a.margin)[0];
  const topRnd = [...ratios].sort((a, b) => b.rndPct - a.rndPct)[0];
  const lossmakers = ratios.filter((r) => r.profit < 0);

  // Financial-risk dimension of the composite score (0-100, higher = worse).
  const finRisk = companies
    .map((c) => ({ id: c.id, name: c.name, risk: scores[c.id]?.financial }))
    .filter((r): r is { id: string; name: string; risk: number } => r.risk != null)
    .sort((a, b) => b.risk - a.risk);
  const avgFinRisk = finRisk.length ? finRisk.reduce((s, r) => s + r.risk, 0) / finRisk.length : null;
  const summary =
    `Tracked ${INDUSTRY_LABEL[industry]} leaders post $${totalRev.toFixed(0)}B combined revenue at a ${avgMargin.toFixed(1)}% aggregate net margin, reinvesting ${avgRnd.toFixed(1)}% of revenue into R&D. ` +
    (topMargin ? `${topMargin.company} is the most profitable (${topMargin.margin.toFixed(1)}% margin), while ${topRnd?.company} invests most heavily in R&D (${topRnd?.rndPct.toFixed(1)}% of revenue). ` : "") +
    (lossmakers.length ? `${lossmakers.map((r) => r.company).join(", ")} ${lossmakers.length > 1 ? "are" : "is"} currently loss-making — a financial-risk flag.` : "All tracked leaders are profitable this period.");

  return (
    <div className="space-y-3">
      <PageHeader title="Financials" subtitle={`${INDUSTRY_LABEL[industry]} · comparative revenue, margins, R&D and capex`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Combined Revenue" value={`$${totalRev.toFixed(0)}B`} icon="TrendingUp" accent="#34d399" />
        <StatTile label="Combined Profit" value={`$${totalProfit.toFixed(0)}B`} icon="DollarSign" accent="#38bdf8" />
        <StatTile label="Avg Net Margin" value={`${avgMargin.toFixed(1)}%`} icon="Percent" accent="#a78bfa" />
        <StatTile label="Avg R&D Intensity" value={`${avgRnd.toFixed(1)}%`} icon="FlaskConical" accent="#f59e0b" />
      </div>

      <AiInsight text={summary} />

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

      {avgFinRisk != null && (
        <Panel title="Financial Risk — Composite Score Dimension">
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[auto_1fr]">
            <RiskGauge value={avgFinRisk} label="Universe average" />
            <div className="space-y-1.5">
              {finRisk.map((r) => (
                <div key={r.id} className="flex items-center gap-2">
                  <span className="w-28 shrink-0 truncate text-xs"><CompanyLink name={r.name} /></span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--panel-2)]">
                    <div className="h-full rounded-full" style={{ width: `${r.risk}%`, background: riskColor(r.risk) }} />
                  </div>
                  <span className="w-8 shrink-0 text-right text-[11px] tabular-nums" style={{ color: riskColor(r.risk) }}>{Math.round(r.risk)}</span>
                </div>
              ))}
              <p className="pt-1 text-[10px] text-[var(--text-faint)]">Financial dimension of the composite risk score (leverage, margin trend, loss-making periods) — higher is riskier.</p>
            </div>
          </div>
        </Panel>
      )}

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
                <td className="py-2 font-medium"><CompanyLink name={r.company} /></td>
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
