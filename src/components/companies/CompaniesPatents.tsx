"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type PatentRow } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";

export function CompaniesPatents({ patents: allPatents }: { patents: PatentRow[] }) {
  const industry = useIndustry();
  const patents = [...allPatents].sort((a, b) => b.total - a.total);
  const chart = patents.map((p) => ({ company: p.company, total: p.total }));

  return (
    <div className="space-y-3">
      <PageHeader title="Research & Patents" subtitle={`${INDUSTRY_LABEL[industry]} · intellectual-property output and technology domains`} />

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
                <td className="py-2 font-medium">{p.company}</td>
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
