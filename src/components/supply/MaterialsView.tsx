"use client";
import { useMemo, useState } from "react";
import {
  LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip,
  ScatterChart, Scatter, ZAxis, ReferenceLine, ReferenceArea, Cell,
} from "recharts";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type RawMaterial, type RiskLevel } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { StatTile } from "@/components/ui/StatTile";
import { RiskBadge } from "@/components/ui/RiskBadge";

const RISK_COLOR: Record<RiskLevel, string> = { high: "#ef4444", medium: "#f59e0b", low: "#34d399" };
const RISK_RANK: Record<RiskLevel, number> = { high: 3, medium: 2, low: 1 };
const PRODUCER_COLORS = ["#3b82f6", "#a78bfa", "#34d399", "#f59e0b", "#f472b6"];
const priceNum = (p: string) => parseFloat(p.replace(/[^0-9.]/g, "")) || 0;
const shortageRank = (s?: string) => (s === "acute" ? 3 : s === "tight" ? 2 : 1);
const shortageColor = (s?: string) => (s === "acute" ? "#f87171" : s === "tight" ? "#f59e0b" : "#34d399");
const strategicColor = (l?: string) => (l === "critical" ? "#f87171" : l === "high" ? "#f59e0b" : "#34d399");
const concColor = (c: number) => (c >= 80 ? "var(--risk-high)" : c >= 60 ? "var(--risk-med)" : "var(--risk-low)");

type SortKey = "name" | "price" | "concentration" | "strategic" | "risk";

export function MaterialsView({ materials }: { materials: RawMaterial[] }) {
  const industry = useIndustry();
  const [sortKey, setSortKey] = useState<SortKey>("risk");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [selectedId, setSelectedId] = useState<string | null>(materials[0]?.id ?? null);

  const strat = (m: RawMaterial) => m.strategicImportance ?? m.concentration;

  const sorted = useMemo(() => {
    const val = (m: RawMaterial): number | string =>
      sortKey === "name" ? m.name
      : sortKey === "price" ? priceNum(m.price)
      : sortKey === "concentration" ? m.concentration
      : sortKey === "strategic" ? strat(m)
      : RISK_RANK[m.supplyRisk];
    return [...materials].sort((a, b) => {
      const av = val(a), bv = val(b);
      if (typeof av === "string") return sortDir * av.localeCompare(bv as string);
      return sortDir * ((av as number) - (bv as number));
    });
  }, [materials, sortKey, sortDir]);

  const selected = materials.find((m) => m.id === selectedId) ?? materials[0];

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(k); setSortDir(k === "name" ? 1 : -1); }
  };

  // headline stats
  const criticalCount = materials.filter((m) => m.supplyRisk === "high").length;
  const restricted = materials.filter((m) => m.exportRestrictions && m.exportRestrictions.length > 0).length;
  const mostConc = materials.reduce((a, b) => (b.concentration > a.concentration ? b : a), materials[0]);
  const avgConc = Math.round(materials.reduce((s, m) => s + m.concentration, 0) / (materials.length || 1));

  const scatter = materials.map((m) => ({
    id: m.id, name: m.name, x: m.concentration, y: strat(m),
    z: shortageRank(m.shortageStatus), color: RISK_COLOR[m.supplyRisk], risk: m.supplyRisk,
  }));

  const Arrow = ({ k }: { k: SortKey }) => (
    <span className="ml-0.5 text-[9px] text-[var(--text-faint)]">{sortKey === k ? (sortDir === 1 ? "▲" : "▼") : "↕"}</span>
  );

  return (
    <div className="space-y-3">
      <PageHeader title="Raw Materials" subtitle={`${INDUSTRY_LABEL[industry]} · critical commodities, pricing and sourcing concentration`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Materials Tracked" value={materials.length} icon="Boxes" accent="#22d3ee" />
        <StatTile label="High Supply Risk" value={criticalCount} icon="TriangleAlert" accent="#ef4444" />
        <StatTile label="Under Export Curbs" value={restricted} icon="Ban" accent="#f59e0b" />
        <StatTile label="Most Concentrated" value={`${mostConc?.concentration ?? 0}%`} sub={mostConc?.name} icon="Crosshair" accent="#a78bfa" />
      </div>

      {/* ── Supply-risk matrix: concentration × strategic importance ── */}
      <Panel title="Supply-Risk Matrix" action={`avg concentration ${avgConc}%`}>
        <div className="text-[11px] text-[var(--text-dim)]">
          Each dot is a material · x = sourcing concentration · y = strategic importance · colour = supply risk · larger = tighter supply. Top-right = critical chokepoints.
        </div>
        <div className="mt-2 h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 12, right: 20, bottom: 28, left: 8 }}>
              {/* critical quadrant shading */}
              <ReferenceArea x1={66} x2={100} y1={66} y2={100} fill="#ef4444" fillOpacity={0.06} />
              <ReferenceLine x={66} stroke="#334155" strokeDasharray="3 3" />
              <ReferenceLine y={66} stroke="#334155" strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" name="Concentration" domain={[0, 100]} unit="%"
                tick={{ fontSize: 11, fill: "#8b98b8" }} label={{ value: "Sourcing concentration →", position: "bottom", fontSize: 11, fill: "#64748b" }} />
              <YAxis type="number" dataKey="y" name="Strategic" domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#8b98b8" }} label={{ value: "Strategic ↑", angle: -90, position: "insideLeft", fontSize: 11, fill: "#64748b" }} />
              <ZAxis type="number" dataKey="z" range={[80, 420]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={({ payload }: any) => {
                  const p = payload?.[0]?.payload;
                  if (!p) return null;
                  return (
                    <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--bg)]/95 px-2.5 py-1.5 text-xs">
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-[11px] text-[var(--text-dim)]">Concentration {p.x}% · Strategic {p.y}</div>
                      <div className="text-[11px] capitalize" style={{ color: p.color }}>{p.risk} supply risk</div>
                    </div>
                  );
                }}
              />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Scatter data={scatter} onClick={(d: any) => d?.id && setSelectedId(d.id)}>
                {scatter.map((s) => (
                  <Cell key={s.id} fill={s.color} fillOpacity={selected?.id === s.id ? 1 : 0.7}
                    stroke={selected?.id === s.id ? "#e2e8f0" : "none"} strokeWidth={2} style={{ cursor: "pointer" }} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* ── Comparison table + detail ── */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
        <Panel title="Compare Materials" bodyClassName="overflow-x-auto" className="xl:col-span-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-[var(--text-dim)]">
                <th className="cursor-pointer pb-2 pr-3 font-medium" onClick={() => toggleSort("name")}>Material<Arrow k="name" /></th>
                <th className="cursor-pointer pb-2 pr-3 text-right font-medium" onClick={() => toggleSort("price")}>Spot price<Arrow k="price" /></th>
                <th className="cursor-pointer pb-2 pr-3 font-medium" onClick={() => toggleSort("concentration")}>Concentration<Arrow k="concentration" /></th>
                <th className="cursor-pointer pb-2 pr-3 text-right font-medium" onClick={() => toggleSort("strategic")}>Strategic<Arrow k="strategic" /></th>
                <th className="cursor-pointer pb-2 text-right font-medium" onClick={() => toggleSort("risk")}>Risk<Arrow k="risk" /></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => {
                const sel = m.id === selected?.id;
                return (
                  <tr key={m.id} onClick={() => setSelectedId(m.id)}
                    className={`cursor-pointer border-t border-[var(--panel-border)] transition-colors ${sel ? "bg-[var(--accent)]/10" : "hover:bg-[var(--panel-2)]"}`}>
                    <td className="py-2 pr-3">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-[10px] text-[var(--text-faint)]">{m.category} · {m.usedIn}</div>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <div className="tabular-nums">{m.price}</div>
                      {m.priceHistory && m.priceHistory.length > 1 && (
                        <div className="ml-auto h-4 w-16">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={m.priceHistory}>
                              <YAxis hide domain={["dataMin", "dataMax"]} />
                              <Line dataKey="value" stroke="#8695ab" strokeWidth={1.25} dot={false} isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--panel-2)]">
                          <div className="h-full rounded-full" style={{ width: `${m.concentration}%`, background: concColor(m.concentration) }} />
                        </div>
                        <span className="tabular-nums text-[11px]" style={{ color: concColor(m.concentration) }}>{m.concentration}%</span>
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <span className="font-semibold" style={{ color: strategicColor(m.strategicLabel) }}>{m.strategicImportance ?? "—"}</span>
                    </td>
                    <td className="py-2 text-right"><RiskBadge level={m.supplyRisk} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>

        {/* detail panel for the selected material */}
        {selected && (
          <Panel title={selected.name} className="xl:col-span-2">
            <div className="flex items-start justify-between">
              <div className="text-[11px] text-[var(--text-faint)]">{selected.category} · used in {selected.usedIn}</div>
              <RiskBadge level={selected.supplyRisk} label={`${selected.supplyRisk} risk`} />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-[var(--panel-2)] p-2">
                <div className="text-sm font-bold">{selected.price}</div>
                <div className="text-[9px] text-[var(--text-faint)]">Spot price</div>
              </div>
              <div className="rounded-lg bg-[var(--panel-2)] p-2">
                <div className="text-sm font-bold" style={{ color: strategicColor(selected.strategicLabel) }}>{selected.strategicImportance ?? "—"}</div>
                <div className="text-[9px] text-[var(--text-faint)] capitalize">{selected.strategicLabel ?? "strategic"}</div>
              </div>
              <div className="rounded-lg bg-[var(--panel-2)] p-2">
                <div className="text-sm font-bold capitalize" style={{ color: shortageColor(selected.shortageStatus) }}>{selected.shortageStatus ?? "—"}</div>
                <div className="text-[9px] text-[var(--text-faint)]">Supply status</div>
              </div>
            </div>

            {selected.priceHistory && selected.priceHistory.length > 1 && (
              <div className="mt-3">
                <div className="text-[11px] font-medium text-[var(--text-dim)]">12-month price</div>
                <div className="mt-1 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={selected.priceHistory} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                      <YAxis hide domain={["dataMin", "dataMax"]} />
                      <XAxis dataKey="period" hide />
                      <Tooltip
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        content={({ payload }: any) => payload?.[0] ? (
                          <div className="rounded border border-[var(--panel-border)] bg-[var(--bg)]/95 px-2 py-1 text-[11px]">{payload[0].payload.period}: {Math.round(payload[0].value).toLocaleString()}</div>
                        ) : null}
                      />
                      <Line dataKey="value" stroke="#60a5fa" strokeWidth={1.75} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] font-medium text-[var(--text-dim)]">
                <span>Producer concentration</span>
                <span style={{ color: concColor(selected.concentration) }}>top-3 {selected.concentration}%</span>
              </div>
              <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-[var(--panel-2)]">
                {selected.topProducers.map((p, i) => (
                  <div key={p.country} title={`${p.country}: ${p.share}%`} style={{ width: `${p.share}%`, background: PRODUCER_COLORS[i % PRODUCER_COLORS.length] }} />
                ))}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--text-dim)]">
                {selected.topProducers.map((p, i) => (
                  <span key={p.country} className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm" style={{ background: PRODUCER_COLORS[i % PRODUCER_COLORS.length] }} />
                    {p.country} {p.share}%
                  </span>
                ))}
              </div>
            </div>

            <dl className="mt-3 space-y-1 border-t border-[var(--panel-border)] pt-2 text-[11px]">
              {selected.globalProduction && selected.globalProduction !== "—" && (
                <div className="flex justify-between"><dt className="text-[var(--text-faint)]">Global production</dt><dd className="text-[var(--text-dim)]">{selected.globalProduction}</dd></div>
              )}
              {selected.importReliance != null && (
                <div className="flex justify-between"><dt className="text-[var(--text-faint)]">Import reliance</dt><dd className="text-[var(--text-dim)]">{selected.importReliance}%</dd></div>
              )}
              {selected.recyclability && selected.recyclability !== "n/a" && (
                <div className="flex justify-between"><dt className="text-[var(--text-faint)]">Recyclability</dt><dd className="capitalize text-[var(--text-dim)]">{selected.recyclability}</dd></div>
              )}
              {selected.alternatives && selected.alternatives.length > 0 && (
                <div className="flex justify-between gap-2"><dt className="shrink-0 text-[var(--text-faint)]">Alternatives</dt><dd className="text-right text-[var(--text-dim)]">{selected.alternatives.join(", ")}</dd></div>
              )}
              {selected.environmentalConcern && selected.environmentalConcern !== "—" && (
                <div className="flex justify-between gap-2"><dt className="shrink-0 text-[var(--text-faint)]">Environmental</dt><dd className="text-right text-[var(--text-dim)]">{selected.environmentalConcern}</dd></div>
              )}
            </dl>

            {selected.exportRestrictions && selected.exportRestrictions.length > 0 && (
              <div className="mt-2 rounded-lg bg-[#f8717111] p-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[#f87171]">Export Restrictions</div>
                {selected.exportRestrictions.map((r, i) => (
                  <div key={i} className="mt-0.5 text-[11px] text-[var(--text-dim)]">{r.title}{r.authority ? ` · ${r.authority}` : ""}</div>
                ))}
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}
