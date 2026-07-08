"use client";
import { useMemo, useState } from "react";
import { Crosshair } from "lucide-react";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceArea, Cell,
} from "recharts";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type SupplierEdge, type SupplierProfile, type RiskLevel } from "@/lib/types";
import { useFocus } from "@/lib/focus";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { StatTile } from "@/components/ui/StatTile";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { CompanyLink } from "@/components/ui/CompanyLink";

const riskColor = (v: number) => (v >= 66 ? "#ef4444" : v >= 40 ? "#f59e0b" : "#34d399");
const BAND_COLOR: Record<RiskLevel, string> = { high: "#ef4444", medium: "#f59e0b", low: "#34d399" };
const RISK_KEYS = ["financial", "cyber", "esg", "political", "disaster"] as const;

type SortKey = "name" | "spend" | "risk" | "tier" | "delivery";

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="capitalize text-[var(--text-dim)]">{label}</span>
        <span className="font-semibold" style={{ color: riskColor(value) }}>{value}</span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-[var(--panel-2)]">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: riskColor(value) }} />
      </div>
    </div>
  );
}

export function SuppliersView({ edges, profiles }: { edges: SupplierEdge[]; profiles: SupplierProfile[] }) {
  const industry = useIndustry();
  const { active, matchesText, toggleFocus, nameToId } = useFocus();

  const [selName, setSelName] = useState<string | null>(profiles[0]?.name ?? null);
  const [sortKey, setSortKey] = useState<SortKey>("risk");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const sorted = useMemo(() => {
    const val = (p: SupplierProfile): number | string =>
      sortKey === "name" ? p.name
      : sortKey === "spend" ? p.totalSpend
      : sortKey === "tier" ? p.tier
      : sortKey === "delivery" ? p.performance.delivery
      : p.overallRisk;
    return [...profiles].sort((a, b) => {
      const av = val(a), bv = val(b);
      if (typeof av === "string") return sortDir * av.localeCompare(bv as string);
      return sortDir * ((av as number) - (bv as number));
    });
  }, [profiles, sortKey, sortDir]);

  const selected = profiles.find((p) => p.name === selName) ?? profiles[0];
  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(k); setSortDir(k === "name" ? 1 : -1); }
  };

  // headline stats
  const highRisk = profiles.filter((p) => p.overallBand === "high").length;
  const soleSource = profiles.filter((p) => p.dependency.soleSource).length;
  const totalSpend = profiles.reduce((s, p) => s + p.totalSpend, 0);
  const topExposure = profiles.reduce((a, b) => (b.totalSpend > a.totalSpend ? b : a), profiles[0]);

  const maxSpend = Math.max(1, ...profiles.map((p) => p.totalSpend));
  const spendThresh = maxSpend * 0.5;
  const scatter = profiles.map((p) => ({
    name: p.name, x: p.totalSpend, y: p.overallRisk,
    z: p.dependency.soleSource ? 2 : 1, color: BAND_COLOR[p.overallBand], band: p.overallBand, sole: p.dependency.soleSource,
  }));

  const Arrow = ({ k }: { k: SortKey }) => (
    <span className="ml-0.5 text-[9px] text-[var(--text-faint)]">{sortKey === k ? (sortDir === 1 ? "▲" : "▼") : "↕"}</span>
  );

  // buyer → supplier network (multi-tier edges) — kept as a secondary view
  const buyers = useMemo(() => [...new Set(edges.map((e) => e.buyer))], [edges]);
  const [picked, setPicked] = useState<string>(buyers[0] ?? "");
  const focusedBuyer = active ? buyers.find((b) => matchesText(b)) : undefined;
  const buyer = focusedBuyer ?? picked;
  const rows = edges.filter((e) => e.buyer === buyer);

  return (
    <div className="space-y-3">
      <PageHeader title="Suppliers & Vendors" subtitle={`${INDUSTRY_LABEL[industry]} · supplier intelligence + multi-tier dependencies`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Suppliers Tracked" value={profiles.length} icon="Users" accent="#a78bfa" />
        <StatTile label="High-Risk Suppliers" value={highRisk} icon="TriangleAlert" accent="#ef4444" />
        <StatTile label="Sole-Source" value={soleSource} icon="Ban" accent="#f59e0b" />
        <StatTile label="Top Exposure" value={`$${topExposure?.totalSpend ?? 0}B`} sub={topExposure?.name} icon="Crosshair" accent="#38bdf8" />
      </div>

      {/* ── Supplier-risk matrix: spend (exposure) × overall risk ── */}
      <Panel title="Supplier-Risk Matrix" action={`total spend $${totalSpend.toFixed(0)}B`}>
        <div className="text-[11px] text-[var(--text-dim)]">
          Each dot is a supplier · x = annual spend (financial exposure) · y = overall risk · colour = risk band · larger = sole-source (no fallback). Top-right = critical exposure.
        </div>
        <div className="mt-2 h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 12, right: 20, bottom: 28, left: 8 }}>
              <ReferenceArea x1={spendThresh} x2={maxSpend} y1={66} y2={100} fill="#ef4444" fillOpacity={0.06} />
              <ReferenceLine x={spendThresh} stroke="#334155" strokeDasharray="3 3" />
              <ReferenceLine y={66} stroke="#334155" strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" name="Spend" domain={[0, Math.ceil(maxSpend)]} unit="B"
                tick={{ fontSize: 11, fill: "#8b98b8" }} label={{ value: "Annual spend ($B) →", position: "bottom", fontSize: 11, fill: "#64748b" }} />
              <YAxis type="number" dataKey="y" name="Risk" domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#8b98b8" }} label={{ value: "Overall risk ↑", angle: -90, position: "insideLeft", fontSize: 11, fill: "#64748b" }} />
              <ZAxis type="number" dataKey="z" range={[90, 340]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={({ payload }: any) => {
                  const p = payload?.[0]?.payload;
                  if (!p) return null;
                  return (
                    <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--bg)]/95 px-2.5 py-1.5 text-xs">
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-[11px] text-[var(--text-dim)]">${p.x}B spend · risk {p.y}</div>
                      <div className="text-[11px] capitalize" style={{ color: p.color }}>{p.band} risk{p.sole ? " · sole-source" : ""}</div>
                    </div>
                  );
                }}
              />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Scatter data={scatter} onClick={(d: any) => d?.name && setSelName(d.name)}>
                {scatter.map((s) => (
                  <Cell key={s.name} fill={s.color} fillOpacity={selected?.name === s.name ? 1 : 0.7}
                    stroke={selected?.name === s.name ? "#e2e8f0" : "none"} strokeWidth={2} style={{ cursor: "pointer" }} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* ── Comparison table + supplier profile ── */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
        <Panel title="Compare Suppliers" bodyClassName="overflow-x-auto" className="xl:col-span-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-[var(--text-dim)]">
                <th className="cursor-pointer pb-2 pr-3 font-medium" onClick={() => toggleSort("name")}>Supplier<Arrow k="name" /></th>
                <th className="cursor-pointer pb-2 pr-3 font-medium" onClick={() => toggleSort("tier")}>Tier<Arrow k="tier" /></th>
                <th className="cursor-pointer pb-2 pr-3 text-right font-medium" onClick={() => toggleSort("spend")}>Spend<Arrow k="spend" /></th>
                <th className="cursor-pointer pb-2 pr-3 font-medium" onClick={() => toggleSort("risk")}>Overall risk<Arrow k="risk" /></th>
                <th className="cursor-pointer pb-2 text-right font-medium" onClick={() => toggleSort("delivery")}>Delivery<Arrow k="delivery" /></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const sel = p.name === selected?.name;
                return (
                  <tr key={p.name} onClick={() => setSelName(p.name)}
                    className={`cursor-pointer border-t border-[var(--panel-border)] transition-colors ${sel ? "bg-[var(--accent)]/10" : "hover:bg-[var(--panel-2)]"}`}>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-1.5 font-medium">
                        {p.name}
                        {p.dependency.soleSource && <span className="rounded bg-[#f8717122] px-1 text-[9px] font-semibold text-[#f87171]">SOLE</span>}
                      </div>
                      <div className="text-[10px] text-[var(--text-faint)]">{p.country} · {p.products.slice(0, 2).join(", ")}</div>
                    </td>
                    <td className="py-2 pr-3"><span className="rounded bg-[var(--panel-2)] px-1.5 py-0.5 text-[11px] text-[var(--text-dim)]">T{p.tier}</span></td>
                    <td className="py-2 pr-3 text-right tabular-nums">${p.totalSpend}B</td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--panel-2)]">
                          <div className="h-full rounded-full" style={{ width: `${p.overallRisk}%`, background: riskColor(p.overallRisk) }} />
                        </div>
                        <span className="tabular-nums text-[11px]" style={{ color: riskColor(p.overallRisk) }}>{p.overallRisk}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right tabular-nums" style={{ color: p.performance.delivery >= 95 ? "var(--risk-low)" : p.performance.delivery >= 90 ? "var(--text)" : "var(--risk-med)" }}>{p.performance.delivery}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>

        {/* selected supplier profile */}
        {selected && (
          <Panel title="Supplier Profile" className="xl:col-span-2">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-lg font-bold">{selected.companyId ? <CompanyLink name={selected.name} /> : selected.name}</div>
                  <div className="text-xs text-[var(--text-dim)]">{selected.country} · Tier {selected.tier} · ${selected.totalSpend}B annual spend</div>
                </div>
                <RiskBadge level={selected.overallBand} label={`Overall Risk: ${selected.overallRisk}`} />
              </div>

              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">Risk Breakdown</div>
                <div className="space-y-1.5">
                  {RISK_KEYS.map((k) => <Bar key={k} label={k} value={selected.risk[k]} />)}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">Dependency</div>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className={`rounded px-1.5 py-0.5 ${selected.dependency.soleSource ? "bg-[#f8717133] text-[#f87171]" : "bg-[var(--panel-2)] text-[var(--text-dim)]"}`}>
                      {selected.dependency.soleSource ? "Sole-source" : "Multi-source"}
                    </span>
                    <span className="rounded bg-[var(--panel-2)] px-1.5 py-0.5 text-[var(--text-dim)]">{selected.dependency.alternates} alternate(s)</span>
                    {selected.dependency.singleRegion && <span className="rounded bg-[#f59e0b33] px-1.5 py-0.5 text-[#f59e0b]">Single-region</span>}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">Performance</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-[var(--text-dim)]">
                    <span>Delivery <b className="text-[var(--text)]">{selected.performance.delivery}%</b></span>
                    <span>Quality <b className="text-[var(--text)]">{selected.performance.quality}%</b></span>
                    <span>Lead time <b className="text-[var(--text)]">{selected.performance.leadTimeDays}d</b></span>
                    <span>Capacity <b className="text-[var(--text)]">{selected.performance.capacityUtil}%</b></span>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">Supplies</div>
                <div className="text-[11px] text-[var(--text-dim)]">{selected.products.join(", ")}</div>
                <div className="mt-1 text-[11px] text-[var(--text-faint)]">To: {selected.buyers.map((b, i) => <span key={b}>{i > 0 && ", "}<CompanyLink name={b} /></span>)}</div>
              </div>
            </div>
          </Panel>
        )}
      </div>

      {/* ── Buyer → supplier network (multi-tier edges) ── */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
        <Panel title="Buyers" className="xl:col-span-1" bodyClassName="p-2">
          <ul className="space-y-0.5">
            {buyers.map((b) => {
              const id = nameToId(b);
              return (
                <li key={b} className="flex items-center gap-1">
                  <button
                    onClick={() => setPicked(b)}
                    className={`flex-1 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      buyer === b ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--text-dim)] hover:bg-white/5"
                    }`}
                  >
                    {b}
                    <span className="ml-1 text-[10px] text-[var(--text-faint)]">{edges.filter((e) => e.buyer === b).length} suppliers</span>
                  </button>
                  {id && (
                    <button
                      onClick={() => toggleFocus(id)}
                      title={matchesText(b) ? "Clear focus" : "Focus across all pages"}
                      className={`shrink-0 px-1.5 ${matchesText(b) ? "text-[var(--accent)]" : "text-[var(--text-faint)] hover:text-[var(--text-dim)]"}`}
                    >
                      <Crosshair size={13} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title={`${buyer} — Supplier Network`} className="xl:col-span-3" bodyClassName="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-[var(--text-dim)]">
                <th className="pb-2 pr-3 font-medium">Supplier</th>
                <th className="pb-2 pr-3 font-medium">Tier</th>
                <th className="pb-2 pr-3 font-medium">Material / Input</th>
                <th className="pb-2 pr-3 text-right font-medium">Annual Spend</th>
                <th className="pb-2 text-right font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e, i) => (
                <tr key={i} onClick={() => setSelName(e.supplier)}
                  className={`cursor-pointer border-t border-[var(--panel-border)] transition-colors hover:bg-[var(--panel-2)]`}>
                  <td className="py-2 pr-3 font-medium">{e.supplier}</td>
                  <td className="py-2 pr-3"><span className="rounded bg-[var(--panel-2)] px-1.5 py-0.5 text-[11px] text-[var(--text-dim)]">Tier {e.tier}</span></td>
                  <td className="py-2 pr-3 text-[var(--text-dim)]">{e.material}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{e.spend}</td>
                  <td className="py-2 text-right"><RiskBadge level={e.risk} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}
