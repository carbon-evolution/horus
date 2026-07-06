"use client";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type RawMaterial } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { RiskBadge } from "@/components/ui/RiskBadge";

const PRODUCER_COLORS = ["#3b82f6", "#a78bfa", "#34d399"];
const strategicColor = (l?: string) =>
  l === "critical" ? "#f87171" : l === "high" ? "#f59e0b" : "#34d399";
const shortageColor = (s?: string) =>
  s === "acute" ? "#f87171" : s === "tight" ? "#f59e0b" : "#34d399";

export function MaterialsView({ materials }: { materials: RawMaterial[] }) {
  const industry = useIndustry();

  return (
    <div>
      <PageHeader title="Raw Materials" subtitle={`${INDUSTRY_LABEL[industry]} · critical commodities, pricing and sourcing concentration`} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {materials.map((m) => (
          <div key={m.id} className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{m.name}</div>
                <div className="text-[10px] text-[var(--text-faint)]">{m.category} · {m.usedIn}</div>
              </div>
              <RiskBadge level={m.supplyRisk} label={`${m.supplyRisk} risk`} />
            </div>

            <div className="mt-3 flex items-end justify-between gap-2">
              <div>
                <div className="text-lg font-bold">{m.price}</div>
                <div className="text-[10px] text-[var(--text-faint)]">Spot price</div>
              </div>
              {m.priceHistory && m.priceHistory.length > 0 && (
                <div className="h-9 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={m.priceHistory}>
                      <YAxis hide domain={["dataMin", "dataMax"]} />
                      <Line dataKey="value" stroke="#8695ab" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="text-right">
                <div className="text-sm font-semibold" style={{ color: m.concentration >= 80 ? "var(--risk-high)" : m.concentration >= 60 ? "var(--risk-med)" : "var(--risk-low)" }}>
                  {m.concentration}%
                </div>
                <div className="text-[10px] text-[var(--text-faint)]">Top-3 concentration</div>
              </div>
            </div>

            {/* strategic importance + shortage + reliance */}
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-[var(--panel-2)] p-1.5">
                <div className="text-sm font-bold" style={{ color: strategicColor(m.strategicLabel) }}>{m.strategicImportance ?? "—"}</div>
                <div className="text-[9px] text-[var(--text-faint)]">Strategic</div>
              </div>
              <div className="rounded-lg bg-[var(--panel-2)] p-1.5">
                <div className="text-sm font-bold capitalize" style={{ color: shortageColor(m.shortageStatus) }}>{m.shortageStatus ?? "—"}</div>
                <div className="text-[9px] text-[var(--text-faint)]">Supply</div>
              </div>
              <div className="rounded-lg bg-[var(--panel-2)] p-1.5">
                <div className="text-sm font-bold">{m.importReliance ?? m.concentration}%</div>
                <div className="text-[9px] text-[var(--text-faint)]">Top producer</div>
              </div>
            </div>

            {/* producer stacked bar */}
            <div className="mt-3">
              <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--panel-2)]">
                {m.topProducers.map((p, i) => (
                  <div key={p.country} title={`${p.country}: ${p.share}%`} style={{ width: `${p.share}%`, background: PRODUCER_COLORS[i % 3] }} />
                ))}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--text-dim)]">
                {m.topProducers.map((p, i) => (
                  <span key={p.country} className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm" style={{ background: PRODUCER_COLORS[i % 3] }} />
                    {p.country} {p.share}%
                  </span>
                ))}
              </div>
            </div>

            {/* deep intelligence */}
            <dl className="mt-3 space-y-1 border-t border-[var(--panel-border)] pt-2 text-[11px]">
              {m.globalProduction && m.globalProduction !== "—" && (
                <div className="flex justify-between"><dt className="text-[var(--text-faint)]">Global production</dt><dd className="text-[var(--text-dim)]">{m.globalProduction}</dd></div>
              )}
              {m.recyclability && m.recyclability !== "n/a" && (
                <div className="flex justify-between"><dt className="text-[var(--text-faint)]">Recyclability</dt><dd className="capitalize text-[var(--text-dim)]">{m.recyclability}</dd></div>
              )}
              {m.alternatives && m.alternatives.length > 0 && (
                <div className="flex justify-between gap-2"><dt className="shrink-0 text-[var(--text-faint)]">Alternatives</dt><dd className="text-right text-[var(--text-dim)]">{m.alternatives.join(", ")}</dd></div>
              )}
              {m.environmentalConcern && m.environmentalConcern !== "—" && (
                <div className="flex justify-between gap-2"><dt className="shrink-0 text-[var(--text-faint)]">Environmental</dt><dd className="text-right text-[var(--text-dim)]">{m.environmentalConcern}</dd></div>
              )}
            </dl>

            {m.exportRestrictions && m.exportRestrictions.length > 0 && (
              <div className="mt-2 rounded-lg bg-[#f8717111] p-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[#f87171]">Export Restrictions</div>
                {m.exportRestrictions.map((r, i) => (
                  <div key={i} className="mt-0.5 text-[11px] text-[var(--text-dim)]">{r.title}{r.authority ? ` · ${r.authority}` : ""}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
