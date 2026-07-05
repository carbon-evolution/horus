"use client";
import { useEffect, useMemo, useRef, useState } from "react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import ForceGraph3D from "react-force-graph-3d";
import { useApp } from "@/lib/store";
import { getSupplyGraph } from "@/lib/provider";
import { INDUSTRY_LABEL, type GraphNode } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";

const GROUP_COLOR: Record<GraphNode["group"], string> = {
  company: "#38bdf8",
  supplier: "#a78bfa",
  material: "#34d399",
};

export default function SupplyChainMap() {
  const industry = useApp((s) => s.industry);
  const graph = useMemo(() => {
    const g = getSupplyGraph(industry);
    // Fresh copies — the force engine mutates node/link objects with coordinates.
    return { nodes: g.nodes.map((n) => ({ ...n })), links: g.links.map((l) => ({ ...l })) };
  }, [industry]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 520 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setDims({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setDims({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleClick(node: any) {
    setSelected(node);
    const fg = fgRef.current;
    if (fg?.cameraPosition && Number.isFinite(node.x)) {
      const dist = 120;
      const ratio = 1 + dist / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
      fg.cameraPosition({ x: node.x * ratio, y: node.y * ratio, z: node.z * ratio }, node, 1400);
    }
  }

  // After layout the engine replaces source/target ids with node objects.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const endId = (ref: any): string => (ref && typeof ref === "object" ? ref.id : ref);
  const links = selected
    ? graph.links.filter((l) => endId(l.source) === selected.id || endId(l.target) === selected.id)
    : [];

  return (
    <div className="space-y-3">
      <PageHeader
        title="Supply Chain Map"
        subtitle={`${INDUSTRY_LABEL[industry]} · interactive 3D dependency graph — click a node to focus`}
      />
      <div className="relative overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-2)]" style={{ height: "72vh" }} ref={wrapRef}>
        <ForceGraph3D
          ref={fgRef}
          width={dims.w}
          height={dims.h}
          graphData={graph}
          backgroundColor="#0a0e17"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodeLabel={(n: any) => `${n.name} (${n.group})`}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodeColor={(n: any) => GROUP_COLOR[n.group as GraphNode["group"]] ?? "#64748b"}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodeVal={(n: any) => Math.max(2, Math.sqrt(n.val || 1))}
          nodeOpacity={0.95}
          linkColor={() => "#33507a"}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          linkWidth={(l: any) => Math.max(0.5, Math.log10((l.value || 1) + 1))}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.006}
          onNodeClick={handleClick}
        />

        {/* legend */}
        <div className="pointer-events-none absolute top-3 left-3 flex gap-3 rounded-lg bg-[var(--bg)]/70 px-3 py-1.5 text-[11px] text-[var(--text-dim)] backdrop-blur">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: GROUP_COLOR.company }} />Company</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: GROUP_COLOR.supplier }} />Supplier</span>
        </div>

        {/* telemetry */}
        {selected && (
          <div className="absolute top-3 right-3 w-60 rounded-xl border border-[var(--panel-border)] bg-[var(--bg)]/85 p-3 backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{selected.name}</div>
              <button onClick={() => setSelected(null)} className="text-xs text-[var(--text-faint)] hover:text-[var(--text)]">✕</button>
            </div>
            <div className="mt-0.5 text-[11px] capitalize text-[var(--text-dim)]">{selected.group}</div>
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-[var(--text-dim)]">Direct links</span><span className="tabular-nums">{links.length}</span></div>
              <div className="border-t border-[var(--panel-border)] pt-1.5 text-[11px] font-medium text-[var(--text-dim)]">Connections</div>
              {links.slice(0, 6).map((l, i) => {
                const other = endId(l.source) === selected.id ? endId(l.target) : endId(l.source);
                return <div key={i} className="text-[11px]">{String(other)}</div>;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
