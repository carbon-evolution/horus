"use client";
import { useMemo } from "react";
import type { GeoRisk, RawMaterial } from "@/lib/types";
import { COUNTRY_COORD } from "@/lib/maritime";
import { WORLD_LAND_PATH } from "@/lib/world-land-path";

const W = 720;
const H = 360;
const px = (lng: number) => ((lng + 180) / 360) * W;
const py = (lat: number) => ((90 - lat) / 180) * H;
const PALETTE = ["#38bdf8", "#a78bfa", "#34d399", "#f59e0b", "#f87171", "#22d3ee", "#e879f9", "#a3e635"];
const tensionColor = (t: number | null) => (t == null ? "#64748b" : t >= 70 ? "#ef4444" : t >= 45 ? "#f59e0b" : "#34d399");

export function PoliticalImpactMap({
  geo, materials, selected, onSelectAction,
}: {
  geo: GeoRisk[]; materials: RawMaterial[]; selected: string | null; onSelectAction: (c: string) => void;
}) {
  const tensionOf = useMemo(() => new Map(geo.map((g) => [g.country, g.tension])), [geo]);
  const matColor = useMemo(() => new Map(materials.map((m, i) => [m.name, PALETTE[i % PALETTE.length]])), [materials]);

  // Producing countries with the materials they supply.
  const producers = useMemo(() => {
    const by = new Map<string, { country: string; x: number; y: number; tension: number | null; materials: string[] }>();
    for (const m of materials) {
      for (const p of m.topProducers) {
        if (!COUNTRY_COORD[p.country]) continue;
        if (!by.has(p.country)) {
          const [lat, lng] = COUNTRY_COORD[p.country];
          by.set(p.country, { country: p.country, x: px(lng), y: py(lat), tension: tensionOf.get(p.country) ?? null, materials: [] });
        }
        by.get(p.country)!.materials.push(m.name);
      }
    }
    return [...by.values()];
  }, [materials, tensionOf]);

  // On select: arcs from the country to the alternative producers of each of its materials.
  const arcs = useMemo(() => {
    if (!selected || !COUNTRY_COORD[selected]) return [];
    const [slat, slng] = COUNTRY_COORD[selected];
    const sx = px(slng), sy = py(slat);
    const out: { d: string; color: string; material: string; toCountry: string; tx: number; ty: number; share: number }[] = [];
    for (const m of materials) {
      if (!m.topProducers.some((p) => p.country === selected)) continue;
      for (const p of m.topProducers) {
        if (p.country === selected || !COUNTRY_COORD[p.country]) continue;
        const [lat, lng] = COUNTRY_COORD[p.country];
        const tx = px(lng), ty = py(lat);
        const mx = (sx + tx) / 2, my = (sy + ty) / 2 - Math.hypot(tx - sx, ty - sy) * 0.25;
        out.push({ d: `M${sx.toFixed(1)},${sy.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)}`, color: matColor.get(m.name) ?? "#94a3b8", material: m.name, toCountry: p.country, tx, ty, share: p.share });
      }
    }
    return out;
  }, [selected, materials, matColor]);

  const altSet = new Set(arcs.map((a) => a.toCountry));

  return (
    <div className="relative overflow-hidden rounded-lg border border-[var(--panel-border)] bg-[var(--panel-2)]">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
        {Array.from({ length: 13 }).map((_, i) => (
          <line key={`v${i}`} x1={(i * W) / 12} y1={0} x2={(i * W) / 12} y2={H} stroke="#ffffff" strokeOpacity={0.03} />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={(i * H) / 6} x2={W} y2={(i * H) / 6} stroke="#ffffff" strokeOpacity={0.03} />
        ))}
        <path d={WORLD_LAND_PATH} fill="#1b2740" fillOpacity={0.85} stroke="#2b3b5a" strokeWidth={0.4} />

        {/* alternative-source arcs from the selected producer */}
        {arcs.map((a, i) => (
          <path key={i} d={a.d} fill="none" stroke={a.color} strokeOpacity={0.6} strokeWidth={1.1} strokeDasharray="3 3">
            <title>{`${a.material}: also ${a.share}% from ${a.toCountry}`}</title>
          </path>
        ))}

        {/* producer markers */}
        {producers.map((p) => {
          const isSel = selected === p.country;
          const isAlt = altSet.has(p.country);
          const color = tensionColor(p.tension);
          const r = 3 + Math.min(4, p.materials.length);
          return (
            <g key={p.country} style={{ cursor: "pointer" }} onClick={() => onSelectAction(p.country)}>
              <circle cx={p.x} cy={p.y} r={isSel ? r + 4 : r} fill={color} fillOpacity={isSel ? 0.28 : isAlt ? 0.2 : 0.14}>
                {isSel && <animate attributeName="r" values={`${r + 2};${r + 6};${r + 2}`} dur="2s" repeatCount="indefinite" />}
              </circle>
              <circle cx={p.x} cy={p.y} r={isSel ? 4 : 2.6} fill={color} stroke={isSel ? "#e2e8f0" : isAlt ? "#cbd5e1" : "none"} strokeWidth={1.2} />
              <text x={p.x} y={p.y - (isSel ? r + 6 : r + 2)} textAnchor="middle" fontSize={8} fill={isSel ? "#f1f5f9" : "#8b98b8"} style={{ pointerEvents: "none" }}>{p.country}</text>
            </g>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute bottom-2 left-2 flex flex-wrap gap-3 rounded bg-[var(--bg)]/70 px-2 py-1 text-[10px] text-[var(--text-dim)] backdrop-blur">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#ef4444]" />High tension</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#f59e0b]" />Elevated</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#34d399]" />Stable</span>
        <span>marker = producing country · click one; dashed arcs = alternative sources for its materials</span>
      </div>
    </div>
  );
}
