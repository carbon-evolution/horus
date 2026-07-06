"use client";
import { useState } from "react";
import type { Risk } from "@/lib/types";
import { Panel } from "@/components/ui/Panel";
import { CompanyLink } from "@/components/ui/CompanyLink";

const sevColor = (s: number) => (s >= 70 ? "#f87171" : s >= 45 ? "#f59e0b" : "#34d399");

export function RiskRegister({ byCompany }: { byCompany: Record<string, { name: string; risks: Risk[] }> }) {
  const ids = Object.keys(byCompany);
  const [sel, setSel] = useState<string>(ids[0] ?? "");
  const risks = byCompany[sel]?.risks ?? [];
  return (
    <Panel title="Risk Register">
      <select
        value={sel}
        onChange={(e) => setSel(e.target.value)}
        className="mb-3 rounded-md border border-[var(--panel-border)] bg-[var(--panel-2)] px-2 py-1 text-sm"
      >
        {ids.map((id) => (
          <option key={id} value={id}>{byCompany[id].name}</option>
        ))}
      </select>
      {risks.length ? (
        <div className="space-y-2">
          {risks.map((r) => (
            <div key={r.id} className="rounded-lg border border-[var(--panel-border)] p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{r.title}</span>
                <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-white" style={{ background: sevColor(r.severity) }}>
                  {r.category} · sev {r.severity}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-[var(--text-dim)]">
                <span>Probability {Math.round(r.probability * 100)}%</span>
                <span>Impact ${(r.financialImpactUsd / 1e6).toFixed(0)}M</span>
                <span>Recovery {r.timeToRecoveryDays}d</span>
                <span>Confidence {Math.round(r.confidence * 100)}%</span>
                <span>Source: {r.source}</span>
              </div>
              {r.impactedSuppliers.length > 0 && (
                <div className="mt-1 text-[11px] text-[var(--text-faint)]">
                  Impacted: {r.impactedSuppliers.map((s, i) => (
                    <span key={s}>{i > 0 && ", "}<CompanyLink name={s} /></span>
                  ))}
                </div>
              )}
              {r.recommendedActions.length > 0 && (
                <ul className="mt-1 list-disc pl-4 text-[11px] text-[var(--text-faint)]">
                  {r.recommendedActions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--text-faint)]">No material risks derived for this company.</p>
      )}
    </Panel>
  );
}
