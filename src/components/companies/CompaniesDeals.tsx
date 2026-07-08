"use client";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type Deal } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { StatTile } from "@/components/ui/StatTile";
import { AiInsight } from "@/components/ui/AiInsight";
import { DealsTable } from "@/components/dashboard/DealsTable";

const dealVal = (v: string) => parseFloat(v.replace(/[^0-9.]/g, "")) || 0;
const TYPE_COLORS = ["#38bdf8", "#a78bfa", "#34d399", "#f59e0b", "#f472b6", "#22d3ee", "#a3e635"];

export function CompaniesDeals({ deals }: { deals: Deal[] }) {
  const industry = useIndustry();
  const total = deals.reduce((s, d) => s + dealVal(d.value), 0);
  const avg = deals.length ? total / deals.length : 0;
  const byType = deals.reduce<Record<string, { count: number; value: number }>>((a, d) => {
    a[d.type] = a[d.type] ?? { count: 0, value: 0 };
    a[d.type].count += 1; a[d.type].value += dealVal(d.value);
    return a;
  }, {});
  const typeRows = Object.entries(byType).map(([type, v]) => ({ type, ...v })).sort((a, b) => b.value - a.value);
  const jvs = deals.filter((d) => /venture|jv/i.test(d.type)).length;
  const biggest = [...deals].sort((a, b) => dealVal(b.value) - dealVal(a.value))[0];
  const topType = typeRows[0];

  const summary =
    `${deals.length} strategic deals worth $${total.toFixed(1)}B tracked across ${INDUSTRY_LABEL[industry]}. ` +
    (topType ? `${topType.type} activity leads at $${topType.value.toFixed(1)}B across ${topType.count} deal${topType.count > 1 ? "s" : ""}. ` : "") +
    (biggest ? `The largest is ${biggest.parties} (${biggest.value}) — ${biggest.description}. ` : "") +
    `${jvs} joint venture${jvs === 1 ? "" : "s"} signal deepening vertical integration across the supply chain.`;

  return (
    <div className="space-y-3">
      <PageHeader title="Deals & Partnerships" subtitle={`${INDUSTRY_LABEL[industry]} · JVs, supply agreements and strategic partnerships`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Deals Tracked" value={deals.length} icon="Handshake" accent="#38bdf8" />
        <StatTile label="Total Value" value={`$${total.toFixed(0)}B`} icon="TrendingUp" accent="#34d399" />
        <StatTile label="Avg Deal Size" value={`$${avg.toFixed(1)}B`} icon="BarChart3" accent="#a78bfa" />
        <StatTile label="Joint Ventures" value={jvs} icon="Users" accent="#f59e0b" />
      </div>

      <AiInsight text={summary} />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Panel title="Deal Value by Type" className="xl:col-span-1">
          <div className="space-y-2.5">
            {typeRows.map((t, i) => {
              const pct = total > 0 ? (t.value / total) * 100 : 0;
              return (
                <div key={t.type}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm" style={{ background: TYPE_COLORS[i % TYPE_COLORS.length] }} />{t.type}
                    </span>
                    <span className="tabular-nums text-[var(--text-dim)]">${t.value.toFixed(1)}B · {t.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--panel-2)]">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(3, pct)}%`, background: TYPE_COLORS[i % TYPE_COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Deal Timeline" className="xl:col-span-2">
          <ol className="relative space-y-3 border-l border-[var(--panel-border)] pl-4">
            {deals.map((d, i) => (
              <li key={i} className="relative">
                <span className="absolute top-1 -left-[21px] h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium text-[var(--text)]">{d.parties}</span>
                  <span className="shrink-0 tabular-nums text-xs font-semibold text-[var(--accent)]">{d.value}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--text-dim)]">{d.type} · {d.description}</div>
                <div className="text-[10px] text-[var(--text-faint)]">{d.date}</div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <Panel title="Deal Matrix" bodyClassName="overflow-x-auto">
        <DealsTable deals={deals} />
      </Panel>
    </div>
  );
}
