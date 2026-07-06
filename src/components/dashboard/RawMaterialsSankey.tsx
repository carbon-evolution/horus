"use client";
import type { SankeyData } from "@/lib/types";

// A recharts Sankey is unreadable in this narrow dashboard panel (13 nodes /
// 15 flows collapse into an overlapping ribbon blob). Present the SAME data —
// origin country → raw material → destination — as a compact, legible flow
// grouped by material instead.
const PALETTE = ["#38bdf8", "#a78bfa", "#34d399", "#f59e0b", "#f87171", "#22d3ee", "#e879f9", "#a3e635"];

interface MaterialFlow {
  name: string;
  color: string;
  origins: string[];
  destinations: string[];
}

function buildFlows(data: SankeyData): MaterialFlow[] {
  const name = (i: number) => (data.nodes[i]?.name ?? "").trim();
  const hasIn = new Set<number>(), hasOut = new Set<number>();
  for (const l of data.links) { hasOut.add(l.source); hasIn.add(l.target); }

  const flows: MaterialFlow[] = [];
  let c = 0;
  data.nodes.forEach((_, i) => {
    if (!(hasIn.has(i) && hasOut.has(i))) return; // materials sit in the middle
    const origins = data.links.filter((l) => l.target === i).sort((a, b) => b.value - a.value).map((l) => name(l.source));
    const destinations = data.links.filter((l) => l.source === i).sort((a, b) => b.value - a.value).map((l) => name(l.target));
    flows.push({
      name: name(i),
      color: PALETTE[c++ % PALETTE.length],
      origins: [...new Set(origins)],
      destinations: [...new Set(destinations)],
    });
  });
  return flows;
}

export function RawMaterialsSankey({ data }: { data: SankeyData }) {
  const flows = buildFlows(data);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] gap-2 text-[10px] font-medium uppercase tracking-wide text-[var(--text-faint)]">
        <span>Origin</span>
        <span className="text-center">Material</span>
        <span className="text-right">Destination</span>
      </div>
      <ul className="flex flex-1 flex-col justify-between gap-2.5">
        {flows.map((f) => (
          <li
            key={f.name}
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-2)] px-2.5 py-2"
          >
            {/* origins */}
            <div className="flex flex-wrap gap-1 text-[11px] text-[var(--text-dim)]">
              {f.origins.map((o) => (
                <span key={o} className="rounded bg-white/5 px-1.5 py-0.5">{o}</span>
              ))}
            </div>
            {/* material chip with arrows */}
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-[var(--text-faint)]">→</span>
              <span
                className="whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-semibold text-[#0b0f17]"
                style={{ background: f.color }}
              >
                {f.name}
              </span>
              <span className="text-[var(--text-faint)]">→</span>
            </div>
            {/* destinations */}
            <div className="flex flex-wrap justify-end gap-1 text-[11px] text-[var(--text-dim)]">
              {f.destinations.map((d) => (
                <span key={d} className="rounded bg-white/5 px-1.5 py-0.5">{d}</span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
