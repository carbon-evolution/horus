"use client";
import type { Deal } from "@/lib/types";
import { CompanyLink } from "@/components/ui/CompanyLink";
import { CompanyLogo } from "@/components/ui/CompanyLogo";

const dealVal = (v: string) => parseFloat(v.replace(/[^0-9.]/g, "")) || 0;

const ROW_H = 64;

function PartyChip({ name, sub, highlight = false }: { name: string; sub?: string; highlight?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border bg-[var(--panel-2)] px-2.5 py-1.5 ${
        highlight ? "border-[var(--accent)]/50" : "border-[var(--panel-border)]"
      }`}
      style={{ height: ROW_H - 18 }}
    >
      <CompanyLogo name={name} size={22} />
      <div className="min-w-0">
        <div className="truncate text-xs font-medium"><CompanyLink name={name} /></div>
        {sub && <div className="truncate text-[10px] text-[var(--text-faint)]">{sub}</div>}
      </div>
    </div>
  );
}

// Hub-and-spoke deal cards: one card per most-connected party, one labeled
// connector per deal (type + value sit ON the line), so each relationship
// reads left-to-right without a legend hunt.
export function PartnershipNetwork({ deals, typeColors }: { deals: Deal[]; typeColors: Record<string, string> }) {
  const typeColor = (type: string) => typeColors[type] ?? "#38bdf8";

  const parsed = deals
    .map((d) => ({ deal: d, parts: d.parties.split("↔").map((s) => s.trim()).filter(Boolean) }))
    .filter((d) => d.parts.length === 2);
  if (!parsed.length) return <p className="text-sm text-[var(--text-faint)]">No deals to map.</p>;

  // Greedy grouping: repeatedly pull the party with the most remaining deals
  // and make it a hub, so multi-deal companies cluster instead of repeating.
  const groups: { hub: string; rows: { partner: string; deal: Deal }[]; total: number }[] = [];
  let remaining = [...parsed];
  while (remaining.length) {
    const count = new Map<string, number>();
    for (const d of remaining) for (const p of d.parts) count.set(p, (count.get(p) ?? 0) + 1);
    const hub = [...count.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const mine = remaining.filter((d) => d.parts.includes(hub));
    remaining = remaining.filter((d) => !d.parts.includes(hub));
    const rows = mine.map((d) => ({ partner: d.parts[0] === hub ? d.parts[1] : d.parts[0], deal: d.deal }));
    groups.push({ hub, rows, total: rows.reduce((s, r) => s + dealVal(r.deal.value), 0) });
  }
  groups.sort((a, b) => b.total - a.total);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {groups.map((g) => {
        const height = g.rows.length * ROW_H;
        const centerY = height / 2;
        const rowY = (i: number) => i * ROW_H + (ROW_H - 18) / 2;
        return (
          <div key={g.hub} className="rounded-lg border border-[var(--panel-border)] p-3">
            <div className="relative" style={{ height }}>
              {/* connectors */}
              <svg className="pointer-events-none absolute inset-0 h-full w-full">
                {g.rows.map((r, i) => (
                  <line key={r.deal.parties + i} x1="34%" y1={centerY} x2="66%" y2={rowY(i)} stroke={typeColor(r.deal.type)} strokeOpacity={0.7} strokeWidth={2} />
                ))}
              </svg>
              {/* hub */}
              <div className="absolute left-0 top-1/2 w-[34%] -translate-y-1/2">
                <PartyChip name={g.hub} sub={`${g.rows.length} deal${g.rows.length > 1 ? "s" : ""} · $${g.total.toFixed(0)}B`} highlight />
              </div>
              {/* deal labels on the connectors */}
              {g.rows.map((r, i) => (
                <div
                  key={`lbl${i}`}
                  title={r.deal.description}
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border bg-[var(--panel)] px-2 py-0.5 text-[10px] font-medium"
                  style={{ left: "50%", top: (centerY + rowY(i)) / 2, borderColor: typeColor(r.deal.type), color: typeColor(r.deal.type) }}
                >
                  {r.deal.type} · {r.deal.value}
                </div>
              ))}
              {/* partners */}
              <div className="absolute right-0 top-0 w-[34%]" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {g.rows.map((r, i) => (
                  <PartyChip key={r.partner + i} name={r.partner} sub={r.deal.date} />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
