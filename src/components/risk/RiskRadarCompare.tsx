"use client";
import { useState } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";
import { useApp } from "@/lib/store";
import { getCompareRadar } from "@/lib/provider";
import { INDUSTRY_LABEL } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";

export function RiskRadarCompare() {
  const industry = useApp((s) => s.industry);
  const series = getCompareRadar(industry);
  const [active, setActive] = useState<string[]>(series.map((s) => s.entity));

  // Merge per-entity axes into recharts rows: one row per axis, one key per entity.
  const axes = series[0]?.axes.map((a) => a.axis) ?? [];
  const rows = axes.map((axis, i) => {
    const row: Record<string, string | number> = { axis };
    for (const s of series) row[s.entity] = s.axes[i].value;
    return row;
  });
  const shown = series.filter((s) => active.includes(s.entity));

  return (
    <div className="space-y-3">
      <PageHeader title="Risk Radar" subtitle={`${INDUSTRY_LABEL[industry]} · side-by-side risk profiles across entities`} />
      <Panel title="Comparative Risk Profile (0–100 per axis)">
        <div className="mb-2 flex flex-wrap gap-2">
          {series.map((s) => (
            <button
              key={s.entity}
              onClick={() => setActive((a) => (a.includes(s.entity) ? a.filter((x) => x !== s.entity) : [...a, s.entity]))}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                active.includes(s.entity) ? "border-transparent text-white" : "border-[var(--panel-border)] text-[var(--text-dim)]"
              }`}
              style={active.includes(s.entity) ? { background: `${s.color}33`, color: s.color, borderColor: `${s.color}66` } : undefined}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.entity}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={460}>
          <RadarChart data={rows} outerRadius="78%">
            <PolarGrid stroke="#233149" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: "#8695ab", fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            {shown.map((s) => (
              <Radar key={s.entity} name={s.entity} dataKey={s.entity} stroke={s.color} fill={s.color} fillOpacity={0.12} strokeWidth={2} />
            ))}
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </RadarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}
