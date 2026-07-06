"use client";
import { useState } from "react";
import type { SupplierProfile } from "@/lib/types";
import { Panel } from "@/components/ui/Panel";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { CompanyLink } from "@/components/ui/CompanyLink";

const riskColor = (v: number) => (v >= 66 ? "#f87171" : v >= 40 ? "#f59e0b" : "#34d399");
const RISK_KEYS = ["financial", "cyber", "esg", "political", "disaster"] as const;

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="capitalize text-[var(--text-dim)]">{label}</span>
        <span className="font-semibold" style={{ color: riskColor(value) }}>{value}</span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-[var(--panel-2)]">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: riskColor(value) }} />
      </div>
    </div>
  );
}

export function SupplierIntel({ profiles }: { profiles: SupplierProfile[] }) {
  const [sel, setSel] = useState(0);
  if (!profiles.length) return null;
  const p = profiles[sel];
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
      {/* ranked supplier list */}
      <Panel title="Supplier Risk Ranking" bodyClassName="p-2">
        <ul className="space-y-0.5">
          {profiles.map((s, i) => (
            <li key={s.name}>
              <button
                onClick={() => setSel(i)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  i === sel ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--text-dim)] hover:bg-white/5"
                }`}
              >
                <span className="truncate">{s.name}<span className="ml-1 text-[10px] text-[var(--text-faint)]">{s.country}</span></span>
                <span className="ml-2 shrink-0 text-xs font-semibold" style={{ color: riskColor(s.overallRisk) }}>{s.overallRisk}</span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      {/* selected supplier profile */}
      <Panel title="Supplier Profile" className="xl:col-span-2">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-lg font-bold">
                {p.companyId ? <CompanyLink name={p.name} /> : p.name}
              </div>
              <div className="text-xs text-[var(--text-dim)]">
                {p.country} · Tier {p.tier} · ${p.totalSpend}B annual spend
              </div>
            </div>
            <RiskBadge level={p.overallBand} label={`Overall Risk: ${p.overallRisk}`} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">Risk Breakdown</div>
              <div className="space-y-1.5">
                {RISK_KEYS.map((k) => <Bar key={k} label={k} value={p.risk[k]} />)}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">Dependency</div>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className={`rounded px-1.5 py-0.5 ${p.dependency.soleSource ? "bg-[#f8717133] text-[#f87171]" : "bg-[var(--panel-2)] text-[var(--text-dim)]"}`}>
                    {p.dependency.soleSource ? "Sole-source" : "Multi-source"}
                  </span>
                  <span className="rounded bg-[var(--panel-2)] px-1.5 py-0.5 text-[var(--text-dim)]">{p.dependency.alternates} alternate(s)</span>
                  {p.dependency.singleRegion && <span className="rounded bg-[#f59e0b33] px-1.5 py-0.5 text-[#f59e0b]">Single-region</span>}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">Performance</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-[var(--text-dim)]">
                  <span>Delivery <b className="text-[var(--text)]">{p.performance.delivery}%</b></span>
                  <span>Quality <b className="text-[var(--text)]">{p.performance.quality}%</b></span>
                  <span>Lead time <b className="text-[var(--text)]">{p.performance.leadTimeDays}d</b></span>
                  <span>Capacity <b className="text-[var(--text)]">{p.performance.capacityUtil}%</b></span>
                </div>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">Supplies</div>
                <div className="text-[11px] text-[var(--text-dim)]">{p.products.join(", ")}</div>
                <div className="mt-1 text-[11px] text-[var(--text-faint)]">To: {p.buyers.map((b, i) => <span key={b}>{i > 0 && ", "}<CompanyLink name={b} /></span>)}</div>
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
