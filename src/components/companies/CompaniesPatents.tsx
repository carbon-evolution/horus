"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Line, Legend } from "recharts";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type PatentRow, type ResearchRow, type Company, type Facility } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { StatTile } from "@/components/ui/StatTile";
import { AiInsight } from "@/components/ui/AiInsight";
import { CompanyLink } from "@/components/ui/CompanyLink";
import { WORLD_LAND_PATH } from "@/lib/world-land-path";

const num = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;

const W = 720, H = 360;
const px = (lng: number) => ((lng + 180) / 360) * W;
const py = (lat: number) => ((90 - lat) / 180) * H;

// World map with a patent-count bubble at each company HQ (geo derived from
// the tracked HQ facility — patents data itself carries no location).
function InnovationMap({ spots }: { spots: { name: string; total: number; lat: number; lng: number; city: string; country: string }[] }) {
  const max = Math.max(...spots.map((s) => s.total), 1);
  return (
    <div className="relative mx-auto aspect-[2/1] w-full overflow-hidden rounded-lg border border-[var(--panel-border)] bg-[var(--panel-2)]">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
        <path d={WORLD_LAND_PATH} fill="#1b2740" fillOpacity={0.85} stroke="#2b3b5a" strokeWidth={0.4} />
        {spots.map((s) => {
          const r = 4 + Math.sqrt(s.total / max) * 14;
          const x = px(s.lng), y = py(s.lat);
          return (
            <g key={s.name}>
              <circle cx={x} cy={y} r={r} fill="var(--accent)" fillOpacity={0.16} stroke="var(--accent)" strokeOpacity={0.6} strokeWidth={0.8}>
                <title>{`${s.name} · ${s.city}, ${s.country} — ${s.total.toLocaleString()} patents`}</title>
              </circle>
              <circle cx={x} cy={y} r={1.8} fill="var(--accent)" />
              {r > 9 && (
                <text x={x} y={y - r - 3} textAnchor="middle" fontSize={9} fill="#8695ab">{s.name}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function CompaniesPatents({
  patents: allPatents,
  research,
  companies,
  facilities,
}: {
  patents: PatentRow[];
  research: ResearchRow[];
  companies: Company[];
  facilities: Facility[];
}) {
  const industry = useIndustry();
  const patents = [...allPatents].sort((a, b) => b.total - a.total);
  const chart = patents.map((p) => ({ company: p.company, total: p.total }));

  const totalPatents = patents.reduce((s, p) => s + p.total, 0);
  const totalPending = patents.reduce((s, p) => s + p.pending, 0);
  const leader = patents[0];
  const domainTotals = patents.flatMap((p) => p.categories).reduce<Record<string, number>>((a, c) => ((a[c.name] = (a[c.name] ?? 0) + c.count), a), {});
  const topDomain = Object.entries(domainTotals).sort((a, b) => b[1] - a[1])[0];

  // R&D investment (getResearch) joined to patent output, by company name.
  const rndRows = patents
    .map((p) => {
      const r = research.find((x) => x.company.toLowerCase() === p.company.toLowerCase());
      return r ? { company: p.company, rnd: num(r.rndExpense), rndPct: num(r.rndPctRevenue), patents: p.total } : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
  const intensityLeader = [...rndRows].sort((a, b) => b.rndPct - a.rndPct)[0];

  // HQ location per company → innovation map bubbles.
  const nameToId = new Map(companies.map((c) => [c.name.toLowerCase(), c.id]));
  const mapSpots = patents.flatMap((p) => {
    const id = nameToId.get(p.company.toLowerCase());
    const hq = facilities.find((f) => f.companyId === id && f.type === "hq") ?? facilities.find((f) => f.companyId === id);
    return hq ? [{ name: p.company, total: p.total, lat: hq.lat, lng: hq.lng, city: hq.city, country: hq.country }] : [];
  });

  const summary =
    `${totalPatents.toLocaleString()} active patents across ${patents.length} tracked ${INDUSTRY_LABEL[industry]} companies, with ${totalPending.toLocaleString()} pending. ` +
    (leader ? `${leader.company} leads the portfolio (${leader.total.toLocaleString()} patents). ` : "") +
    (intensityLeader ? `${intensityLeader.company} runs the highest R&D intensity at ${intensityLeader.rndPct.toFixed(1)}% of revenue. ` : "") +
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
        {mapSpots.length > 0 && (
          <Panel title="Innovation Map — Patent Output by HQ">
            <InnovationMap spots={mapSpots} />
            <p className="mt-2 text-[10px] text-[var(--text-faint)]">Bubble size = active patents; location = company headquarters.</p>
          </Panel>
        )}
        {rndRows.length > 0 && (
          <Panel title="R&D Investment vs Patent Output">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={rndRows} margin={{ top: 6, right: 0, bottom: 4, left: -8 }}>
                <XAxis dataKey="company" tick={{ fill: "#8695ab", fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={54} />
                <YAxis yAxisId="rnd" tick={{ fill: "#5b6a80", fontSize: 10 }} />
                <YAxis yAxisId="pat" orientation="right" tick={{ fill: "#5b6a80", fontSize: 10 }} />
                <Tooltip cursor={{ fill: "#ffffff", fillOpacity: 0.04 }} contentStyle={{ background: "#0d1420", border: "1px solid #1e2a3d", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="rnd" dataKey="rnd" name="R&D Spend ($B)" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Line yAxisId="pat" type="monotone" dataKey="patents" name="Active Patents" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </Panel>
        )}

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
              <th className="pb-2 text-right font-medium">R&D Spend</th>
              <th className="pb-2 text-right font-medium">R&D % Rev</th>
              <th className="pb-2 font-medium">Top Domains</th>
            </tr>
          </thead>
          <tbody>
            {patents.map((p) => {
              const r = research.find((x) => x.company.toLowerCase() === p.company.toLowerCase());
              return (
                <tr key={p.company} className="border-t border-[var(--panel-border)]">
                  <td className="py-2 font-medium"><CompanyLink name={p.company} /></td>
                  <td className="py-2 text-right tabular-nums">{p.total.toLocaleString()}</td>
                  <td className="py-2 text-right tabular-nums text-[var(--text-dim)]">{p.pending.toLocaleString()}</td>
                  <td className="py-2 text-right tabular-nums text-[var(--text-dim)]">{r?.rndExpense ?? "—"}</td>
                  <td className="py-2 text-right tabular-nums text-[var(--text-dim)]">{r?.rndPctRevenue ?? "—"}</td>
                  <td className="py-2 text-[var(--text-dim)]">{p.categories.map((c) => c.name).join(", ")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
