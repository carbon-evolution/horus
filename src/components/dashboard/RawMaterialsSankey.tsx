"use client";
import type { SankeyData } from "@/lib/types";

// Origin country → raw material → destination, drawn as a compact node-link flow
// diagram that fills the panel. A recharts Sankey collapses into an unreadable
// ribbon blob at this width, so we lay the three columns out ourselves with thin
// colour-coded connectors.
const PALETTE = ["#38bdf8", "#a78bfa", "#34d399", "#f59e0b", "#f87171", "#22d3ee", "#e879f9", "#a3e635"];

const W = 480;
const H = 340;
const PAD = 30;
const ORIGIN_X = 92;
const MAT_X = 240;
const DEST_X = 388;
const MAT_HALF = 44;

interface Parsed {
  origins: { name: string; y: number }[];
  materials: { name: string; color: string; y: number }[];
  destinations: { name: string; y: number }[];
  links: { x1: number; y1: number; x2: number; y2: number; color: string }[];
}

function spread(n: number): number[] {
  if (n <= 1) return [H / 2];
  return Array.from({ length: n }, (_, i) => PAD + (i * (H - 2 * PAD)) / (n - 1));
}

function parse(data: SankeyData): Parsed {
  const name = (i: number) => (data.nodes[i]?.name ?? "").trim();
  const hasIn = new Set<number>(), hasOut = new Set<number>();
  for (const l of data.links) { hasOut.add(l.source); hasIn.add(l.target); }
  const role = (i: number) => (hasIn.has(i) && hasOut.has(i) ? "material" : hasOut.has(i) ? "origin" : "dest");

  const originIdx = data.nodes.map((_, i) => i).filter((i) => role(i) === "origin");
  const matIdx = data.nodes.map((_, i) => i).filter((i) => role(i) === "material");
  const destIdx = data.nodes.map((_, i) => i).filter((i) => role(i) === "dest");

  const oy = spread(originIdx.length), my = spread(matIdx.length), dy = spread(destIdx.length);
  const originPos = new Map(originIdx.map((idx, k) => [idx, oy[k]]));
  const matPos = new Map(matIdx.map((idx, k) => [idx, my[k]]));
  const destPos = new Map(destIdx.map((idx, k) => [idx, dy[k]]));
  const matColor = new Map(matIdx.map((idx, k) => [idx, PALETTE[k % PALETTE.length]]));

  const links = data.links.map((l) => {
    if (matPos.has(l.target)) {
      // origin -> material
      return { x1: ORIGIN_X, y1: originPos.get(l.source)!, x2: MAT_X - MAT_HALF, y2: matPos.get(l.target)!, color: matColor.get(l.target)! };
    }
    // material -> destination
    return { x1: MAT_X + MAT_HALF, y1: matPos.get(l.source)!, x2: DEST_X, y2: destPos.get(l.target)!, color: matColor.get(l.source)! };
  });

  return {
    origins: originIdx.map((idx) => ({ name: name(idx), y: originPos.get(idx)! })),
    materials: matIdx.map((idx) => ({ name: name(idx), color: matColor.get(idx)!, y: matPos.get(idx)! })),
    destinations: destIdx.map((idx) => ({ name: name(idx), y: destPos.get(idx)! })),
    links,
  };
}

export function RawMaterialsSankey({ data }: { data: SankeyData }) {
  const { origins, materials, destinations, links } = parse(data);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 grid grid-cols-3 text-[10px] font-medium uppercase tracking-wide text-[var(--text-faint)]">
        <span>Origin country</span>
        <span className="text-center">Raw material</span>
        <span className="text-right">Destination</span>
      </div>
      <div className="relative min-h-[220px] flex-1 overflow-hidden rounded-lg border border-[var(--panel-border)] bg-[var(--panel-2)]">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
          {/* connectors */}
          {links.map((l, i) => (
            <path
              key={i}
              d={`M${l.x1},${l.y1} C${(l.x1 + l.x2) / 2},${l.y1} ${(l.x1 + l.x2) / 2},${l.y2} ${l.x2},${l.y2}`}
              fill="none"
              stroke={l.color}
              strokeOpacity={0.5}
              strokeWidth={1.6}
            />
          ))}
          {/* origin nodes */}
          {origins.map((o) => (
            <g key={o.name}>
              <circle cx={ORIGIN_X} cy={o.y} r={3} fill="#94a3b8" />
              <text x={ORIGIN_X - 8} y={o.y} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="#cbd5e1">{o.name}</text>
            </g>
          ))}
          {/* material pills */}
          {materials.map((m) => (
            <g key={m.name}>
              <rect x={MAT_X - MAT_HALF} y={m.y - 11} width={MAT_HALF * 2} height={22} rx={4} fill={m.color} />
              <text x={MAT_X} y={m.y} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight={600} fill="#0b0f17">{m.name}</text>
            </g>
          ))}
          {/* destination nodes */}
          {destinations.map((d) => (
            <g key={d.name}>
              <circle cx={DEST_X} cy={d.y} r={3} fill="#94a3b8" />
              <text x={DEST_X + 8} y={d.y} textAnchor="start" dominantBaseline="middle" fontSize={11} fill="#cbd5e1">{d.name}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
