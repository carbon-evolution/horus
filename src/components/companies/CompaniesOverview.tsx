"use client";
import { useRouter } from "next/navigation";
import { Crosshair } from "lucide-react";
import { useFocus, focusDim } from "@/lib/focus";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type Company, type CompanyMeta, type Scores, type Facility, type AlertItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { StatTile } from "@/components/ui/StatTile";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { AiInsight } from "@/components/ui/AiInsight";
import { ManufacturingFootprint } from "@/components/dashboard/ManufacturingFootprint";

const bandColor = (b?: string) => ({ A: "#34d399", B: "#a3e635", C: "#f59e0b", D: "#fb923c", F: "#f87171" }[b ?? ""] ?? "#8695ab");
const riskColor = (v: number) => (v >= 66 ? "#ef4444" : v >= 40 ? "#f59e0b" : "#34d399");
const sevColor = (s: string) => (s === "high" ? "var(--risk-high)" : s === "medium" ? "var(--risk-med)" : "var(--risk-low)");

function capToB(mc: string): number {
  const n = parseFloat(mc.replace(/[^0-9.]/g, "")) || 0;
  return /T/i.test(mc) ? n * 1000 : n;
}

function ScoreCell({ v }: { v?: number }) {
  if (v == null) return <span className="text-[var(--text-faint)]">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-10 overflow-hidden rounded-full bg-[var(--panel-2)]">
        <div className="h-full rounded-full" style={{ width: `${v}%`, background: riskColor(v) }} />
      </div>
      <span className="tabular-nums text-[11px]" style={{ color: riskColor(v) }}>{v}</span>
    </div>
  );
}

export function CompaniesOverview({
  companies, metas, scores, facilities, alerts,
}: {
  companies: Company[]; metas: Record<string, CompanyMeta>; scores: Record<string, Scores | null>;
  facilities: Facility[]; alerts: AlertItem[];
}) {
  const industry = useIndustry();
  const router = useRouter();
  const { focusId, active, toggleFocus } = useFocus();

  const withScore = companies.map((c) => ({ c, m: metas[c.id], s: scores[c.id] }));
  const rated = withScore.filter((x) => x.s);
  const avgRisk = rated.length ? Math.round(rated.reduce((n, x) => n + (x.s!.overall), 0) / rated.length) : 0;
  const highRisk = rated.filter((x) => ["D", "F"].includes(x.s!.band)).length;
  const totalCapB = companies.reduce((n, x) => n + capToB(x.marketCap), 0);
  const capLabel = totalCapB >= 1000 ? `$${(totalCapB / 1000).toFixed(1)}T` : `$${totalCapB.toFixed(0)}B`;
  const worst = [...rated].sort((a, b) => b.s!.overall - a.s!.overall)[0];

  // AI executive summary from the real aggregates.
  const countries = [...new Set(facilities.map((f) => f.country))];
  const topCountry = Object.entries(facilities.reduce<Record<string, number>>((a, f) => ((a[f.country] = (a[f.country] ?? 0) + 1), a), {}))
    .sort((a, b) => b[1] - a[1])[0];
  const concentration = topCountry ? Math.round((topCountry[1] / facilities.length) * 100) : 0;
  const highAlerts = alerts.filter((a) => a.severity === "high").length;
  const summary =
    `${companies.length} leading ${INDUSTRY_LABEL[industry]} companies tracked with an average supply-chain risk of ${avgRisk}/100. ` +
    (worst ? `${worst.c.name} carries the highest exposure (band ${worst.s!.band}, ${worst.s!.overall}/100), driven by its ${worst.s!.geopolitical >= worst.s!.cyber ? "geopolitical" : "cyber"} profile. ` : "") +
    `Manufacturing spans ${countries.length} countries but is ${concentration}% concentrated in ${topCountry?.[0] ?? "—"}, a single-region dependency to watch. ` +
    (highAlerts ? `${highAlerts} high-severity risk event${highAlerts > 1 ? "s are" : " is"} currently active.` : "No high-severity events are active.");

  return (
    <div className="space-y-3">
      <PageHeader title="Top 10 Overview" subtitle={`${INDUSTRY_LABEL[industry]} · performance & risk leaderboard`} />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Companies Tracked" value={companies.length} icon="Building2" accent="#38bdf8" />
        <StatTile label="Avg SC Risk" value={`${avgRisk}/100`} icon="Gauge" accent={riskColor(avgRisk)} />
        <StatTile label="High-Risk (D/F)" value={highRisk} icon="AlertTriangle" accent="#ef4444" />
        <StatTile label="Combined Market Cap" value={capLabel} icon="TrendingUp" accent="#34d399" />
      </div>

      <AiInsight text={summary} title="AI Executive Summary" />

      {/* Leaderboard */}
      <Panel title="Global Company Rankings" bodyClassName="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-[var(--text-dim)]">
              <th className="pb-2 pr-3 font-medium">#</th>
              <th className="pb-2 pr-3 font-medium">Company</th>
              <th className="pb-2 pr-3 font-medium">Overall Risk</th>
              <th className="pb-2 pr-3 font-medium">Financial</th>
              <th className="pb-2 pr-3 font-medium">Cyber</th>
              <th className="pb-2 pr-3 font-medium">ESG</th>
              <th className="pb-2 pr-3 font-medium">Geopolitical</th>
              <th className="pb-2 pr-3 text-right font-medium">Market Cap</th>
              <th className="pb-2 text-right font-medium">YTD</th>
            </tr>
          </thead>
          <tbody>
            {withScore.map(({ c, m, s }, i) => {
              const focused = c.id === focusId;
              const up = c.changeYtd >= 0;
              return (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/${industry}/companies/${c.id}`)}
                  className={`cursor-pointer border-t border-[var(--panel-border)] transition-colors hover:bg-[var(--panel-2)] ${focused ? "bg-[var(--accent)]/10" : focusDim(active, focused)}`}
                >
                  <td className="py-2 pr-3 tabular-nums text-[var(--text-faint)]">{i + 1}</td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2.5">
                      <button onClick={(e) => { e.stopPropagation(); toggleFocus(c.id); }} title="Focus across pages"
                        className={focused ? "text-[var(--accent)]" : "text-[var(--text-faint)] hover:text-[var(--text-dim)]"}>
                        <Crosshair size={13} />
                      </button>
                      <CompanyLogo id={c.id} name={c.name} size={24} />
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-[10px] text-[var(--text-faint)]">{c.ticker} · {m?.hq}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    {s ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white" style={{ background: bandColor(s.band) }}>{s.band}</span>
                        <span className="tabular-nums text-[11px]">{s.overall}</span>
                      </span>
                    ) : <RiskBadge level={m?.exposure ?? "medium"} />}
                  </td>
                  <td className="py-2 pr-3"><ScoreCell v={s?.financial} /></td>
                  <td className="py-2 pr-3"><ScoreCell v={s?.cyber} /></td>
                  <td className="py-2 pr-3"><ScoreCell v={s?.esg} /></td>
                  <td className="py-2 pr-3"><ScoreCell v={s?.geopolitical} /></td>
                  <td className="py-2 pr-3 text-right tabular-nums font-medium">{c.marketCap}</td>
                  <td className="py-2 text-right tabular-nums" style={{ color: c.changeYtd === 0 ? "var(--text-faint)" : up ? "var(--pos)" : "var(--neg)" }}>
                    {c.changeYtd === 0 ? "Private" : `${up ? "+" : ""}${c.changeYtd.toFixed(1)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      {/* Operations map + alerts timeline */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Panel title="Global Operations Footprint" action="All Facilities" actionHref={`/${industry}/supply-chain/facilities`} className="xl:col-span-2">
          <ManufacturingFootprint facilities={facilities} />
        </Panel>
        <Panel title="Recent Risk Events" action="All Alerts" actionHref={`/${industry}/monitoring/alerts`}>
          {alerts.length === 0 ? (
            <div className="text-xs text-[var(--text-faint)]">No recent risk events.</div>
          ) : (
            <ol className="relative space-y-3 border-l border-[var(--panel-border)] pl-4">
              {alerts.slice(0, 7).map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute top-1 -left-[21px] h-2.5 w-2.5 rounded-full" style={{ background: sevColor(a.severity) }} />
                  <a href={a.href} className="block hover:opacity-80">
                    <div className="text-xs font-medium text-[var(--text)]">{a.title}</div>
                    <div className="mt-0.5 text-[10px] text-[var(--text-faint)]">{a.entity} · {a.ago}</div>
                  </a>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}
