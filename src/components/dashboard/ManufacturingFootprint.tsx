"use client";
import type { Facility, FacilityStatus } from "@/lib/types";
import { useFocus } from "@/lib/focus";

const STATUS_COLOR: Record<FacilityStatus, string> = {
  operating: "#34d399",
  planned: "#3b82f6",
  construction: "#f59e0b",
  risk: "#ef4444",
};
const STATUS_LABEL: Record<FacilityStatus, string> = {
  operating: "Operating",
  planned: "Planned",
  construction: "Under Construction",
  risk: "Risk Detected",
};

const W = 720;
const H = 360;
// Equirectangular projection.
const px = (lng: number) => ((lng + 180) / 360) * W;
const py = (lat: number) => ((90 - lat) / 180) * H;

// Rough continental land masses as soft blobs — enough to orient the nodes
// without shipping a heavy GeoJSON. Coordinates are [lng, lat] centers + radii.
const LANDMASSES: { cx: number; cy: number; rx: number; ry: number }[] = [
  { cx: -100, cy: 45, rx: 34, ry: 22 }, // North America
  { cx: -60, cy: -15, rx: 20, ry: 26 }, // South America
  { cx: 18, cy: 50, rx: 20, ry: 16 }, // Europe
  { cx: 22, cy: 5, rx: 26, ry: 30 }, // Africa
  { cx: 90, cy: 45, rx: 52, ry: 26 }, // Asia
  { cx: 134, cy: -25, rx: 18, ry: 12 }, // Australia
];

export function ManufacturingFootprint({ facilities }: { facilities: Facility[] }) {
  const { focusId, active } = useFocus();
  return (
    <div>
      <div className="relative overflow-hidden rounded-lg bg-[var(--panel-2)]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {/* graticule */}
          {Array.from({ length: 13 }).map((_, i) => (
            <line key={`v${i}`} x1={(i * W) / 12} y1={0} x2={(i * W) / 12} y2={H} stroke="#ffffff" strokeOpacity={0.03} />
          ))}
          {Array.from({ length: 7 }).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={(i * H) / 6} x2={W} y2={(i * H) / 6} stroke="#ffffff" strokeOpacity={0.03} />
          ))}
          {/* land */}
          {LANDMASSES.map((l, i) => (
            <ellipse key={i} cx={px(l.cx)} cy={py(l.cy)} rx={l.rx} ry={l.ry} fill="#1b2740" fillOpacity={0.6} />
          ))}
          {/* faint connection arcs between the first facility and others (trade-route feel) */}
          {facilities.slice(1, 8).map((f, i) => {
            const a = facilities[0];
            const x1 = px(a.lng), y1 = py(a.lat), x2 = px(f.lng), y2 = py(f.lat);
            const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - 24;
            return (
              <path key={`arc${i}`} d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`} fill="none" stroke="#3b82f6" strokeOpacity={0.12} strokeDasharray="2 3" />
            );
          })}
          {/* facility nodes */}
          {facilities.map((f) => {
            const color = STATUS_COLOR[f.status];
            const matched = f.companyId === focusId;
            const dim = active && !matched;
            return (
              <g key={f.id} opacity={dim ? 0.25 : 1}>
                <circle cx={px(f.lng)} cy={py(f.lat)} r={7} fill={color} fillOpacity={0.18} />
                {matched && (
                  <circle cx={px(f.lng)} cy={py(f.lat)} r={9} fill="none" stroke={color} strokeOpacity={0.8} strokeWidth={1.5} />
                )}
                <circle cx={px(f.lng)} cy={py(f.lat)} r={3} fill={color}>
                  <title>{`${f.name} — ${STATUS_LABEL[f.status]}`}</title>
                </circle>
              </g>
            );
          })}
        </svg>
      </div>
      {/* legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--text-dim)]">
        {(Object.keys(STATUS_COLOR) as FacilityStatus[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>
    </div>
  );
}
