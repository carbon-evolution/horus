"use client";
import type { Company, RiskLevel, SupplierEdge } from "@/lib/types";
import { CompanyLink } from "@/components/ui/CompanyLink";
import { CompanyLogo } from "@/components/ui/CompanyLogo";

const RISK_COLOR: Record<RiskLevel, string> = {
  low: "var(--risk-low)",
  medium: "var(--risk-med)",
  high: "var(--risk-high)",
};
const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };

interface Counterpart {
  name: string;
  materials: string[];
  spend: string[];
  risk: RiskLevel;
  tier: number;
}

// Collapse parallel edges (same counterpart, different materials) into one node.
function groupBy(edges: SupplierEdge[], key: "supplier" | "buyer"): Counterpart[] {
  const map = new Map<string, Counterpart>();
  for (const e of edges) {
    const name = e[key];
    const c = map.get(name) ?? { name, materials: [], spend: [], risk: e.risk, tier: e.tier };
    if (!c.materials.includes(e.material)) c.materials.push(e.material);
    c.spend.push(e.spend);
    if (RISK_RANK[e.risk] > RISK_RANK[c.risk]) c.risk = e.risk;
    map.set(name, c);
  }
  return [...map.values()].sort((a, b) => RISK_RANK[b.risk] - RISK_RANK[a.risk]).slice(0, 8);
}

const ROW_H = 52;

function NodeCard({ c, align }: { c: Counterpart; align: "left" | "right" }) {
  return (
    <div
      className="flex items-center rounded-lg border border-[var(--panel-border)] bg-[var(--panel-2)] px-2.5 py-1.5"
      style={{ height: ROW_H - 10, borderLeftWidth: align === "left" ? 3 : 1, borderRightWidth: align === "right" ? 3 : 1, borderLeftColor: align === "left" ? RISK_COLOR[c.risk] : undefined, borderRightColor: align === "right" ? RISK_COLOR[c.risk] : undefined }}
    >
      <div className="min-w-0">
        <div className="truncate text-xs font-medium"><CompanyLink name={c.name} /></div>
        <div className="truncate text-[10px] text-[var(--text-faint)]">
          {c.materials.slice(0, 2).join(", ")}{c.materials.length > 2 ? ` +${c.materials.length - 2}` : ""} · {c.spend[0]}{c.spend.length > 1 ? ` +${c.spend.length - 1}` : ""}
        </div>
      </div>
    </div>
  );
}

// Bipartite supply-network view: upstream suppliers → the company → downstream
// customers, connectors colored by the counterpart's worst edge risk.
export function SupplierNetwork({ company, edges }: { company: Company; edges: SupplierEdge[] }) {
  const key = company.name.toLowerCase();
  const suppliers = groupBy(edges.filter((e) => e.buyer.toLowerCase() === key), "supplier");
  const customers = groupBy(edges.filter((e) => e.supplier.toLowerCase() === key), "buyer");
  const rows = Math.max(suppliers.length, customers.length, 1);
  const height = rows * ROW_H;
  const centerY = height / 2;
  const rowY = (i: number) => i * ROW_H + ROW_H / 2 - 5;

  if (!suppliers.length && !customers.length) {
    return <p className="text-sm text-[var(--text-faint)]">No supplier or customer relationships mapped for this company.</p>;
  }

  return (
    <div>
      <div className="mb-2 grid grid-cols-[1fr_auto_1fr] gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">
        <span>Upstream Suppliers ({suppliers.length})</span>
        <span />
        <span className="text-right">Downstream Customers ({customers.length})</span>
      </div>
      <div className="relative" style={{ height }}>
        {/* connectors */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {suppliers.map((s, i) => (
            <line key={`s${s.name}`} x1="32%" y1={rowY(i)} x2="44%" y2={centerY} stroke={RISK_COLOR[s.risk]} strokeOpacity={0.45} strokeWidth={1.5} />
          ))}
          {customers.map((c, i) => (
            <line key={`c${c.name}`} x1="56%" y1={centerY} x2="68%" y2={rowY(i)} stroke={RISK_COLOR[c.risk]} strokeOpacity={0.45} strokeWidth={1.5} />
          ))}
        </svg>
        {/* left: suppliers */}
        <div className="absolute inset-y-0 left-0 w-[32%] space-y-[10px]">
          {suppliers.map((s) => <NodeCard key={s.name} c={s} align="right" />)}
        </div>
        {/* center: the company */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="flex flex-col items-center gap-1 rounded-xl border border-[var(--accent)]/40 bg-[var(--panel-2)] px-4 py-3">
            <CompanyLogo id={company.id} name={company.name} size={28} />
            <div className="max-w-[110px] truncate text-center text-xs font-semibold">{company.name}</div>
          </div>
        </div>
        {/* right: customers */}
        <div className="absolute inset-y-0 right-0 w-[32%] space-y-[10px]">
          {customers.map((c) => <NodeCard key={c.name} c={c} align="left" />)}
        </div>
      </div>
      <p className="mt-2 text-[10px] text-[var(--text-faint)]">
        Tier-1 mapped relationships; connector color = worst edge risk (green low · amber medium · red high). Ranked by risk, top 8 per side.
      </p>
    </div>
  );
}
