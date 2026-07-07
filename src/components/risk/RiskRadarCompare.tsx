"use client";
import { useState } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type RadarAxis } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";

export interface CompareRadarSeries {
  entity: string;
  color: string;
  axes: RadarAxis[];
}

const COMPOSITE = "Sector Composite";

export function RiskRadarCompare({ compareRadar: series }: { compareRadar: CompareRadarSeries[] }) {
  const industry = useIndustry();
  // Effective focus = whatever is hovered, else whatever is pinned (clicked).
  const [pinned, setPinned] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const focus = hovered ?? pinned;

  const companies = series.filter((s) => s.entity !== COMPOSITE);
  const composite = series.find((s) => s.entity === COMPOSITE);

  // Merge per-entity axes into recharts rows: one row per axis, one key per entity.
  const axes = series[0]?.axes.map((a) => a.axis) ?? [];
  const rows = axes.map((axis, i) => {
    const row: Record<string, string | number> = { axis };
    for (const s of series) row[s.entity] = s.axes[i].value;
    return row;
  });

  // Opacity model: no focus -> faint "cloud" of every company; focus one ->
  // it comes forward and the rest fade away.
  const styleFor = (entity: string) => {
    if (!focus) return { stroke: 0.3, fill: 0, width: 1.2 };
    if (entity === focus) return { stroke: 1, fill: 0.2, width: 2.6 };
    return { stroke: 0.05, fill: 0, width: 1 };
  };

  const focused = focus ? series.find((s) => s.entity === focus) : null;

  return (
    <div className="space-y-3">
      <PageHeader title="Risk Radar" subtitle={`${INDUSTRY_LABEL[industry]} · side-by-side risk profiles across every tracked company`} />
      <Panel title="Comparative Risk Profile (0–100 per axis)">
        <p className="mb-2 text-[11px] text-[var(--text-faint)]">
          Hover a company to isolate it; click to keep it pinned. The dashed line is the sector benchmark.
        </p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {companies.map((s) => {
            const isFocus = focus === s.entity;
            const dim = focus && !isFocus;
            return (
              <button
                key={s.entity}
                onMouseEnter={() => setHovered(s.entity)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setPinned((p) => (p === s.entity ? null : s.entity))}
                aria-pressed={pinned === s.entity}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all ${
                  pinned === s.entity ? "ring-1 ring-[var(--accent)]" : ""
                } ${dim ? "opacity-40" : "opacity-100"}`}
                style={
                  isFocus
                    ? { background: `${s.color}33`, color: s.color, borderColor: `${s.color}99` }
                    : { borderColor: "var(--panel-border)", color: "var(--text-dim)" }
                }
              >
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.entity}
              </button>
            );
          })}
        </div>
        <ResponsiveContainer width="100%" height={480}>
          <RadarChart data={rows} outerRadius="78%">
            <PolarGrid stroke="#233149" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: "#8695ab", fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            {companies.map((s) => {
              const st = styleFor(s.entity);
              return (
                <Radar
                  key={s.entity}
                  name={s.entity}
                  dataKey={s.entity}
                  stroke={s.color}
                  strokeOpacity={st.stroke}
                  strokeWidth={st.width}
                  fill={s.color}
                  fillOpacity={st.fill}
                  isAnimationActive={false}
                />
              );
            })}
            {composite && (
              <Radar
                name={COMPOSITE}
                dataKey={COMPOSITE}
                stroke={composite.color}
                strokeOpacity={focus ? 0.35 : 0.6}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                fill="none"
                isAnimationActive={false}
              />
            )}
          </RadarChart>
        </ResponsiveContainer>
        {focused && focused.entity !== COMPOSITE && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--panel-border)] pt-2 text-[11px]">
            <span className="font-semibold" style={{ color: focused.color }}>{focused.entity}</span>
            {focused.axes.map((a) => (
              <span key={a.axis} className="text-[var(--text-dim)]">
                {a.axis} <span className="font-medium text-[var(--text)]">{a.value}</span>
              </span>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
