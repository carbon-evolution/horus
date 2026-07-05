"use client";
import { useApp } from "@/lib/store";
import { getMaterials } from "@/lib/provider";
import { INDUSTRY_LABEL } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { RiskBadge } from "@/components/ui/RiskBadge";

const PRODUCER_COLORS = ["#3b82f6", "#a78bfa", "#34d399"];

export function MaterialsView() {
  const industry = useApp((s) => s.industry);
  const materials = getMaterials(industry);

  return (
    <div>
      <PageHeader title="Raw Materials" subtitle={`${INDUSTRY_LABEL[industry]} · critical commodities, pricing and sourcing concentration`} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {materials.map((m) => (
          <div key={m.id} className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{m.name}</div>
                <div className="text-[10px] text-[var(--text-faint)]">{m.category} · {m.usedIn}</div>
              </div>
              <RiskBadge level={m.supplyRisk} label={`${m.supplyRisk} risk`} />
            </div>

            <div className="mt-3 flex items-end justify-between">
              <div>
                <div className="text-lg font-bold">{m.price}</div>
                <div className="text-[10px] text-[var(--text-faint)]">Spot price</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold" style={{ color: m.concentration >= 80 ? "var(--risk-high)" : m.concentration >= 60 ? "var(--risk-med)" : "var(--risk-low)" }}>
                  {m.concentration}%
                </div>
                <div className="text-[10px] text-[var(--text-faint)]">Top-3 concentration</div>
              </div>
            </div>

            {/* producer stacked bar */}
            <div className="mt-3">
              <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--panel-2)]">
                {m.topProducers.map((p, i) => (
                  <div key={p.country} title={`${p.country}: ${p.share}%`} style={{ width: `${p.share}%`, background: PRODUCER_COLORS[i % 3] }} />
                ))}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--text-dim)]">
                {m.topProducers.map((p, i) => (
                  <span key={p.country} className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm" style={{ background: PRODUCER_COLORS[i % 3] }} />
                    {p.country} {p.share}%
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
