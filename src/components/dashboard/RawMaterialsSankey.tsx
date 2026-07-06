"use client";
import { Sankey, Tooltip, ResponsiveContainer } from "recharts";
import type { SankeyData } from "@/lib/types";

const PALETTE = ["#38bdf8", "#a78bfa", "#34d399", "#f59e0b", "#f87171", "#22d3ee", "#e879f9", "#a3e635"];
const NEUTRAL = "#64748b";

// Middle-column nodes (both incoming and outgoing links) are the materials we colour.
function analyze(data: SankeyData) {
  const hasIn = new Set<number>(), hasOut = new Set<number>();
  for (const l of data.links) { hasOut.add(l.source); hasIn.add(l.target); }
  const colorByName = new Map<string, string>();
  let c = 0;
  data.nodes.forEach((n, i) => {
    if (hasIn.has(i) && hasOut.has(i)) colorByName.set(n.name.trim(), PALETTE[c++ % PALETTE.length]);
  });
  const role = (i: number) => (hasIn.has(i) && hasOut.has(i) ? "material" : hasOut.has(i) ? "source" : "dest");
  return { colorByName, role };
}

function nodeName(nodes: SankeyData["nodes"], ref: unknown): string {
  if (ref && typeof ref === "object" && "name" in ref) return String((ref as { name: string }).name).trim();
  return (nodes[ref as number]?.name ?? "").trim();
}

export function RawMaterialsSankey({ data }: { data: SankeyData }) {
  const { colorByName, role } = analyze(data);
  const materials = [...colorByName.entries()];

  const NodeShape = (props: {
    x: number; y: number; width: number; height: number; index: number; payload: { name?: string; value?: number };
  }) => {
    const { x, y, width, height, index, payload } = props;
    const name = String(payload?.name ?? "").trim();
    const r = role(index);
    const fill = r === "material" ? colorByName.get(name) ?? NEUTRAL : NEUTRAL;
    const leftmost = r === "source";
    const barH = Math.max(height, 3);
    return (
      <g>
        <rect x={x} y={y} width={width} height={barH} rx={1.5} fill={fill} fillOpacity={r === "material" ? 0.95 : 0.65} />
        <text
          x={leftmost ? x - 6 : x + width + 6}
          y={y + barH / 2}
          textAnchor={leftmost ? "end" : "start"}
          dominantBaseline="middle"
          fontSize={10.5}
          fill="#cbd5e1"
        >
          {name}
        </text>
      </g>
    );
  };

  const LinkShape = (props: {
    sourceX: number; sourceY: number; sourceControlX: number; targetControlX: number;
    targetX: number; targetY: number; linkWidth: number; index: number; payload: { source: unknown; target: unknown };
  }) => {
    const { sourceX, sourceY, sourceControlX, targetControlX, targetX, targetY, linkWidth, index, payload } = props;
    const src = nodeName(data.nodes, payload?.source);
    const tgt = nodeName(data.nodes, payload?.target);
    const color = colorByName.get(src) ?? colorByName.get(tgt) ?? NEUTRAL;
    const id = `sg${index}`;
    return (
      <g>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0.5} />
          </linearGradient>
        </defs>
        <path
          d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={Math.max(linkWidth, 1)}
        />
      </g>
    );
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-[var(--text-faint)]">
        <span>Origin country</span>
        <span>Raw material</span>
        <span>Destination</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <Sankey
          data={data}
          nodePadding={14}
          nodeWidth={10}
          margin={{ top: 10, right: 84, bottom: 10, left: 66 }}
          link={<LinkShape sourceX={0} sourceY={0} sourceControlX={0} targetControlX={0} targetX={0} targetY={0} linkWidth={0} index={0} payload={{ source: 0, target: 0 }} />}
          node={<NodeShape x={0} y={0} width={0} height={0} index={0} payload={{}} />}
        >
          <Tooltip
            contentStyle={{ background: "#0d1420", border: "1px solid #1e2a3d", borderRadius: 8, fontSize: 12 }}
          />
        </Sankey>
      </ResponsiveContainer>
      {materials.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-dim)]">
          {materials.map(([name, color]) => (
            <span key={name} className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
