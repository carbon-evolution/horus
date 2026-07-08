"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type PatentRow } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { StatTile } from "@/components/ui/StatTile";
import { AiInsight } from "@/components/ui/AiInsight";
import { CompanyLink } from "@/components/ui/CompanyLink";

export function CompaniesPatents({ patents: allPatents }: { patents: PatentRow[] }) {
  const industry = useIndustry();
  const patents = [...allPatents].sort((a, b) => b.total - a.total);
  const chart = patents.map((p) => ({ company: p.company, total: p.total }));

  const totalPatents = patents.reduce((s, p) => s + p.total, 0);
  const totalPending = patents.reduce((s, p) => s + p.pending, 0);
  const leader = patents[0];
  const domainTotals = patents.flatMap((p) => p.categories).reduce<Record<string, number>>((a, c) => ((a[c.name] = (a[c.name] ?? 0) + c.count), a), {});
  const topDomain = Object.entries(domainTotals).sort((a, b) => b[1] - a[1])[0];
  const summary =
    `${totalPatents.toLocaleString()} active patents across ${patents.length} tracked ${INDUSTRY_LABEL[industry]} companies, with ${totalPending.toLocaleString()} pending. ` +
    (leader ? `${leader.company} leads the portfolio (${leader.total.toLocaleString()} patents). ` : "") +
    (topDomain ? `Innovation is concentrated in ${topDomain[0]}, the most-patented technology domain — a signal of where the next competitive edge is being built.` : "");

  return (
    <div className="space-y-3">
      <PageHeader title="Research & Patents" subtitle={`${INDUSTRY_LABEL[industry]} · intellectual-property output and technology domains`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Active Patents" value={totalPatents.toLocaleString()} icon="FileText" accent="#38bdf8" />
        <StatTile label="Pending" value={totalPending.toLocaleString()} icon="Clock" accent="#f59e0b" />
        <StatTile label="Top Innovator" value={leader?.total.toLocaleString() ?? "—"} sub={leader?.company} icon="Award" accent="#a78bfa" />
        <StatTile label="Lead Domain" value={topDomain?.[0] ?? "—"} icon="Cpu" accent="#34d399" />
      </div>

      <AiInsight text={summary} />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Panel title="Patents Filed (TTM)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chart} margin={{ top: 6, right: 8, bottom: 4, left: -8 }}>
              <XAxis dataKey="company" tick={{ fill: "#8695ab", fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={54} />
              <YAxis tick={{ fill: "#5b6a80", fontSize: 10 }} />
              <Tooltip cursor={{ fill: "#ffffff", fillOpacity: 0.04 }} contentStyle={{ background: "#0d1420", border: "1px solid #1e2a3d", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="total" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Technology Domain Distribution" bodyClassName="space-y-3">
          {patents.slice(0, 5).map((p) => {
            const max = Math.max(...p.categories.map((c) => c.count), 1);
            return (
              <div key={p.company}>
                <div className="mb-1 text-xs font-medium">{p.company}</div>
                <div className="flex gap-1">
                  {p.categories.map((c, i) => (
                    <div
                      key={c.name}
                      title={`${c.name}: ${c.count}`}
                      className="h-2.5 rounded-sm"
                      style={{ width: `${(c.count / max) * 40 + 8}%`, background: ["#3b82f6", "#a78bfa", "#34d399"][i % 3] }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          <div className="flex gap-3 pt-1 text-[10px] text-[var(--text-dim)]">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#3b82f6]" />Core Tech</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#a78bfa]" />Materials</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#34d399]" />Packaging</span>
          </div>
        </Panel>
      </div>

      <Panel title="Patent Portfolio" bodyClassName="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-[var(--text-dim)]">
              <th className="pb-2 font-medium">Company</th>
              <th className="pb-2 text-right font-medium">Total</th>
              <th className="pb-2 text-right font-medium">Pending</th>
              <th className="pb-2 font-medium">Top Domains</th>
            </tr>
          </thead>
          <tbody>
            {patents.map((p) => (
              <tr key={p.company} className="border-t border-[var(--panel-border)]">
                <td className="py-2 font-medium"><CompanyLink name={p.company} /></td>
                <td className="py-2 text-right tabular-nums">{p.total.toLocaleString()}</td>
                <td className="py-2 text-right tabular-nums text-[var(--text-dim)]">{p.pending.toLocaleString()}</td>
                <td className="py-2 text-[var(--text-dim)]">{p.categories.map((c) => c.name).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
