"use client";
import { useMemo, useState } from "react";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type GeoRisk, type Chokepoint, type TradeShipment, type RawMaterial, type SupplierEdge } from "@/lib/types";
import { chokepointsForLane, volumeToBillions } from "@/lib/maritime";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { StatTile } from "@/components/ui/StatTile";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { ChokepointMap } from "@/components/risk/ChokepointMap";
import { PoliticalImpact } from "@/components/risk/PoliticalImpact";

function tensionColor(t: number) {
  return t >= 70 ? "var(--risk-high)" : t >= 45 ? "var(--risk-med)" : "var(--risk-low)";
}

interface CpExposure {
  name: string;
  share: string;
  risk: Chokepoint["risk"];
  value: number;             // $B of tracked sea trade transiting
  lanes: { lane: string; commodity: string; value: number }[];
  materials: string[];
}

export function GeoRiskView({ geo: allGeo, chokepoints, shipments, materials, edges }: { geo: GeoRisk[]; chokepoints: Chokepoint[]; shipments: TradeShipment[]; materials: RawMaterial[]; edges: SupplierEdge[] }) {
  const industry = useIndustry();
  const geo = [...allGeo].sort((a, b) => b.tension - a.tension);
  const [openCp, setOpenCp] = useState<string | null>(null);
  const [tab, setTab] = useState<"maritime" | "political">("maritime");

  const seaLanes = useMemo(() => shipments.filter((s) => s.mode === "sea"), [shipments]);

  // Join each sea lane to the chokepoints it transits, then aggregate exposure.
  const exposure = useMemo<CpExposure[]>(() => {
    const map = new Map<string, CpExposure>();
    for (const c of chokepoints) map.set(c.name, { name: c.name, share: c.share, risk: c.risk, value: 0, lanes: [], materials: [] });
    for (const s of seaLanes) {
      const v = volumeToBillions(s.volume);
      for (const cpName of chokepointsForLane(s.origin, s.destination)) {
        const cp = map.get(cpName);
        if (!cp) continue;
        cp.value += v;
        cp.lanes.push({ lane: s.lane, commodity: s.commodity, value: v });
        if (!cp.materials.includes(s.commodity)) cp.materials.push(s.commodity);
      }
    }
    return [...map.values()].sort((a, b) => b.value - a.value || (b.risk === "high" ? 1 : 0) - (a.risk === "high" ? 1 : 0));
  }, [chokepoints, seaLanes]);

  const totalSeaValue = seaLanes.reduce((s, l) => s + volumeToBillions(l.volume), 0);
  const exposedCount = exposure.filter((c) => c.value > 0).length;
  const topCp = exposure.find((c) => c.value > 0);
  const fmt = (v: number) => (v >= 1 ? `$${v.toFixed(1)}B` : v > 0 ? `$${Math.round(v * 1000)}M` : "$0");

  return (
    <div className="space-y-3">
      <PageHeader title="Geopolitical Risk" subtitle={`${INDUSTRY_LABEL[industry]} · sovereign tension, maritime chokepoints and localization`} />

      {/* ── Maritime Chokepoints + Political Instability (tabbed) ── */}
      <Panel title={tab === "maritime" ? "Maritime Chokepoint Exposure" : "Political Instability → Supply Impact"}>
        <div className="mb-4 inline-flex rounded-lg border border-[var(--panel-border)] p-1 text-[15px] font-semibold">
          <button
            onClick={() => setTab("maritime")}
            className={`rounded-md px-6 py-3 transition-colors ${tab === "maritime" ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--text-dim)] hover:text-[var(--text)]"}`}
          >
            Maritime Chokepoints
          </button>
          <button
            onClick={() => setTab("political")}
            className={`rounded-md px-6 py-3 transition-colors ${tab === "political" ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--text-dim)] hover:text-[var(--text)]"}`}
          >
            Political Instability
          </button>
        </div>

        {tab === "political" ? (
          <PoliticalImpact geo={allGeo} materials={materials} edges={edges} />
        ) : (
          <>
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Sea Lanes Tracked" value={seaLanes.length} icon="Ship" accent="#38bdf8" />
              <StatTile label="Sea Trade Value" value={fmt(totalSeaValue)} icon="TrendingUp" accent="#34d399" />
              <StatTile label="Chokepoints Exposed" value={`${exposedCount}/${chokepoints.length}`} icon="AlertTriangle" accent="#f59e0b" />
              <StatTile label="Top Chokepoint" value={topCp ? fmt(topCp.value) : "—"} sub={topCp?.name} icon="Crosshair" accent="#ef4444" />
            </div>
            {seaLanes.length === 0 ? (
          <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-2)] p-4 text-sm text-[var(--text-dim)]">
            No sea-freight lanes are tracked for {INDUSTRY_LABEL[industry]} — its trade is predominantly air-freighted, so shipping chokepoints carry limited direct exposure.
          </div>
        ) : (
          <>
            <div className="mb-3 text-[11px] text-[var(--text-dim)]">
              Ships animate along each tracked sea lane through the chokepoints it transits. Click a chokepoint (on the map or a bar below) to isolate its routes and see the affected shipments, materials and receiving countries. Routing is an estimate from origin/destination geography.
            </div>
            <div className="mb-3">
              <ChokepointMap lanes={seaLanes} chokepoints={chokepoints} />
            </div>
            <div className="space-y-2">
              {exposure.map((c) => {
                const pct = totalSeaValue > 0 ? (c.value / totalSeaValue) * 100 : 0;
                const open = openCp === c.name;
                const barColor = c.risk === "high" ? "var(--risk-high)" : c.risk === "medium" ? "var(--risk-med)" : "var(--risk-low)";
                return (
                  <div key={c.name} className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-2)]">
                    <button
                      onClick={() => setOpenCp(open ? null : c.name)}
                      disabled={c.value === 0}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${c.value > 0 ? "cursor-pointer" : "cursor-default opacity-70"}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{c.name}</span>
                          <RiskBadge level={c.risk} />
                          {c.value > 0 && <span className="text-[10px] text-[var(--text-faint)]">{c.lanes.length} lane{c.lanes.length !== 1 ? "s" : ""}</span>}
                        </div>
                        <div className="mt-0.5 text-[10px] text-[var(--text-faint)]">{c.share}</div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--panel)]">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(c.value > 0 ? 3 : 0, pct)}%`, background: barColor }} />
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="tabular-nums text-sm font-semibold" style={{ color: c.value > 0 ? barColor : "var(--text-faint)" }}>{fmt(c.value)}</div>
                        <div className="text-[10px] text-[var(--text-faint)]">{c.value > 0 ? `${Math.round(pct)}% of sea trade` : "not on tracked routes"}</div>
                      </div>
                    </button>
                    {open && c.value > 0 && (
                      <div className="border-t border-[var(--panel-border)] px-3 py-2">
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">Exposed lanes</div>
                        <div className="space-y-1">
                          {c.lanes.sort((a, b) => b.value - a.value).map((l, i) => (
                            <div key={i} className="flex items-center justify-between text-[11px]">
                              <span className="text-[var(--text-dim)]">{l.lane} · <span className="text-[var(--text-faint)]">{l.commodity}</span></span>
                              <span className="tabular-nums text-[var(--text-dim)]">{fmt(l.value)}/yr</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-1.5 text-[10px] text-[var(--text-faint)]">Materials at risk: {c.materials.join(", ")}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
            )}
          </>
        )}
      </Panel>

      {/* ── Country exposure ── */}
      <Panel title="Country Exposure" bodyClassName="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-[var(--text-dim)]">
              <th className="pb-2 font-medium">Country</th>
              <th className="pb-2 font-medium">Strategic Role</th>
              <th className="pb-2 font-medium">Tension</th>
              <th className="pb-2 text-right font-medium">Localization</th>
              <th className="pb-2 font-medium">Chokepoints</th>
            </tr>
          </thead>
          <tbody>
            {geo.map((g) => (
              <tr key={g.country} className="border-t border-[var(--panel-border)] align-top">
                <td className="py-2.5 whitespace-nowrap font-medium">{g.flag} {g.country}</td>
                <td className="max-w-xs py-2.5 text-[var(--text-dim)]">{g.role}</td>
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--panel-2)]">
                      <div className="h-full rounded-full" style={{ width: `${g.tension}%`, background: tensionColor(g.tension) }} />
                    </div>
                    <span className="text-xs tabular-nums" style={{ color: tensionColor(g.tension) }}>{g.tension}</span>
                  </div>
                </td>
                <td className="py-2.5 text-right tabular-nums text-[var(--text-dim)]">{g.localization}%</td>
                <td className="py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {g.chokepoints.length ? g.chokepoints.map((c) => (
                      <span key={c} className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-2)] px-2 py-0.5 text-[10px] text-[var(--text-dim)]">{c}</span>
                    )) : <span className="text-[10px] text-[var(--text-faint)]">—</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
