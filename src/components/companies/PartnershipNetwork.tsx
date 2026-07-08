"use client";
import type { Deal } from "@/lib/types";
import { CompanyLink } from "@/components/ui/CompanyLink";

const dealVal = (v: string) => parseFloat(v.replace(/[^0-9.]/g, "")) || 0;

// Circular partnership graph: each deal's parties ("A ↔ B") become nodes on a
// ring, deals become chords. Node size scales with total deal value touched.
export function PartnershipNetwork({ deals, typeColors }: { deals: Deal[]; typeColors: Record<string, string> }) {
  const typeColor = (type: string) => typeColors[type] ?? "#38bdf8";
  const nodeVal = new Map<string, number>();
  const edges: { a: string; b: string; deal: Deal }[] = [];
  for (const d of deals) {
    const parts = d.parties.split("↔").map((s) => s.trim()).filter(Boolean);
    for (const p of parts) nodeVal.set(p, (nodeVal.get(p) ?? 0) + dealVal(d.value));
    if (parts.length === 2) edges.push({ a: parts[0], b: parts[1], deal: d });
  }
  const nodes = [...nodeVal.entries()].sort((a, b) => b[1] - a[1]);
  if (!nodes.length) return <p className="text-sm text-[var(--text-faint)]">No deals to map.</p>;

  const maxVal = Math.max(...nodes.map(([, v]) => v), 1);
  // Positions on a ring, percent coordinates so the layout is responsive.
  const pos = new Map<string, { x: number; y: number }>();
  nodes.forEach(([name], i) => {
    const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    pos.set(name, { x: 50 + 41 * Math.cos(angle), y: 50 + 40 * Math.sin(angle) });
  });

  return (
    <div className="relative mx-auto aspect-[16/10] w-full max-w-3xl">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {edges.map((e, i) => {
          const a = pos.get(e.a)!, b = pos.get(e.b)!;
          const mx = (a.x + b.x) / 2 + (50 - (a.x + b.x) / 2) * 0.35;
          const my = (a.y + b.y) / 2 + (50 - (a.y + b.y) / 2) * 0.35;
          return (
            <path key={i} d={`M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`} fill="none" stroke={typeColor(e.deal.type)} strokeOpacity={0.55} strokeWidth={0.4 + Math.min(dealVal(e.deal.value) / 15, 1.2)} vectorEffect="non-scaling-stroke" strokeLinecap="round">
              <title>{`${e.deal.parties} — ${e.deal.type} · ${e.deal.value}\n${e.deal.description}`}</title>
            </path>
          );
        })}
      </svg>
      {nodes.map(([name, val]) => {
        const p = pos.get(name)!;
        const size = 8 + (val / maxVal) * 14;
        return (
          <div key={name} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            <div className="mx-auto rounded-full border border-[var(--accent)]/50 bg-[var(--panel-2)]" style={{ width: size, height: size, boxShadow: `0 0 ${size / 2}px var(--accent)33` }} />
            <div className="mt-0.5 whitespace-nowrap rounded bg-[var(--panel)]/80 px-1 text-[9px] leading-tight">
              <CompanyLink name={name} className="!text-[9px]" />
              <span className="ml-1 text-[var(--text-faint)]">${val.toFixed(0)}B</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
