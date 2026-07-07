"use client";
import { useEffect, useMemo, useRef, useState } from "react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import ForceGraph3D from "react-force-graph-3d";
import SpriteText from "three-spritetext";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type GraphData, type GraphNode } from "@/lib/types";
import { useFocus } from "@/lib/focus";
import { PageHeader } from "@/components/ui/PageHeader";

const GROUP_COLOR: Record<GraphNode["group"], string> = {
  company: "#38bdf8",
  supplier: "#a78bfa",
  material: "#34d399",
};
const RISK_COLOR: Record<string, string> = {
  low: "#34d399",
  medium: "#f59e0b",
  high: "#ef4444",
};

export default function SupplyChainMap({ graph: raw }: { graph: GraphData }) {
  const industry = useIndustry();
  const { active, matchesText, toggleFocus, nameToId } = useFocus();
  const graph = useMemo(() => {
    // Fresh copies — the force engine mutates node/link objects with coordinates.
    return { nodes: raw.nodes.map((n) => ({ ...n })), links: raw.links.map((l) => ({ ...l })) };
  }, [raw]);

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

  // A stale selection from a previous industry's graph must not survive a data swap.
  useEffect(() => setSelected(null), [raw]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleClick(node: any) {
    if (!node) return;
    setSelected(node);
    // Company nodes drive the cross-page focus; suppliers/materials just zoom.
    if (node?.group === "company") {
      const id = nameToId(node.name);
      if (id) toggleFocus(id);
    }
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
        subtitle={`${INDUSTRY_LABEL[industry]} · interactive 3D dependency graph — arrows point supplier → buyer; click a node to focus`}
      />
      <div className="relative overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-2)]" style={{ height: "72vh" }} ref={wrapRef}>
        <ForceGraph3D
          key={industry} // full remount per industry — never swap data under a live engine
          ref={fgRef}
          width={dims.w}
          height={dims.h}
          graphData={graph}
          backgroundColor="#0a0e17"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodeLabel={(n: any) => `${n.name} (${n.group})`}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodeColor={(n: any) => {
            const base = GROUP_COLOR[n.group as GraphNode["group"]] ?? "#64748b";
            if (!active) return base;
            return matchesText(n.name) ? "#fbbf24" : "#2a3448";
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodeVal={(n: any) => Math.max(2, Math.sqrt(n.val || 1)) * (active && matchesText(n.name) ? 2.5 : 1)}
          nodeOpacity={0.95}
          // Always-visible name labels floating above each sphere.
          nodeThreeObjectExtend={true}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodeThreeObject={(n: any) => {
            const dimmed = active && !matchesText(n.name);
            // SpriteText extends THREE.Sprite at runtime; its .d.ts targets a
            // different three version, so position/material need the cast.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sprite = new SpriteText(n.name) as any;
            sprite.color = dimmed ? "#3a4661" : "#dbe4f5";
            sprite.textHeight = n.group === "company" ? 4 : 3;
            sprite.position.y = Math.max(4, Math.sqrt(n.val || 1)) + 4;
            sprite.material.depthWrite = false;
            return sprite;
          }}
          // Links carry the relationship: colored by supply risk, labeled with
          // supplier → buyer + what is supplied, arrow/particles flow supplier → buyer.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          linkColor={(l: any) => RISK_COLOR[l.risk] ?? "#33507a"}
          linkOpacity={0.45}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          linkLabel={(l: any) => {
            const s = endId(l.source), t = endId(l.target);
            const what = l.material ? `${l.material}` : "supply relationship";
            const extra = [l.spend, l.tier ? `Tier ${l.tier}` : "", l.risk ? `${l.risk} risk` : ""].filter(Boolean).join(" · ");
            return `${s} supplies ${what} → ${t}${extra ? `<br/><span style="opacity:.7">${extra}</span>` : ""}`;
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          linkWidth={(l: any) => Math.max(0.5, Math.log10((l.value || 1) + 1))}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={0.96}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.006}
          onNodeClick={handleClick}
        />

        {/* legend */}
        <div className="pointer-events-none absolute top-3 left-3 space-y-1 rounded-lg bg-[var(--bg)]/70 px-3 py-2 text-[11px] text-[var(--text-dim)] backdrop-blur">
          <div className="flex gap-3">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: GROUP_COLOR.company }} />Company</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: GROUP_COLOR.supplier }} />Supplier</span>
          </div>
          <div className="flex gap-3">
            <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3" style={{ background: RISK_COLOR.low }} />Low risk</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3" style={{ background: RISK_COLOR.medium }} />Medium</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3" style={{ background: RISK_COLOR.high }} />High</span>
          </div>
          <div className="text-[var(--text-faint)]">arrow / particles: supplier → buyer (buyer depends on supplier)</div>
        </div>

        {/* telemetry */}
        {selected && (
          <div className="absolute top-3 right-3 w-72 rounded-xl border border-[var(--panel-border)] bg-[var(--bg)]/85 p-3 backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{selected.name}</div>
              <button onClick={() => setSelected(null)} className="text-xs text-[var(--text-faint)] hover:text-[var(--text)]">✕</button>
            </div>
            <div className="mt-0.5 text-[11px] capitalize text-[var(--text-dim)]">{selected.group}</div>
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-[var(--text-dim)]">Direct links</span><span className="tabular-nums">{links.length}</span></div>
              <div className="border-t border-[var(--panel-border)] pt-1.5 text-[11px] font-medium text-[var(--text-dim)]">Relationships</div>
              {links.slice(0, 8).map((l, i) => {
                const isSupplier = endId(l.source) === selected.id;
                const other = isSupplier ? endId(l.target) : endId(l.source);
                return (
                  <div key={i} className="text-[11px] leading-snug">
                    <span className={isSupplier ? "text-[var(--risk-low)]" : "text-[var(--accent)]"}>
                      {isSupplier ? "supplies" : "depends on"}
                    </span>{" "}
                    <span className="font-medium">{String(other)}</span>
                    {l.material && <span className="text-[var(--text-dim)]"> · {l.material}</span>}
                    {l.spend && <span className="text-[var(--text-faint)]"> · {l.spend}</span>}
                    {l.risk && (
                      <span className="ml-1 rounded px-1 text-[10px] font-medium" style={{ color: RISK_COLOR[l.risk], background: `${RISK_COLOR[l.risk]}1f` }}>
                        {l.risk}
                      </span>
                    )}
                  </div>
                );
              })}
              {links.length > 8 && <div className="text-[10px] text-[var(--text-faint)]">+{links.length - 8} more…</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
