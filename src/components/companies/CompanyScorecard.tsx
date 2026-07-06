"use client";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import type { Scores } from "@/lib/types";

const LABELS: Record<string, string> = {
  overall: "Overall SC Risk", geopolitical: "Geopolitical", supplierDependency: "Supplier Dep.",
  cyber: "Cyber", financial: "Financial", esg: "ESG", customerDependency: "Customer Dep.",
};
const bandColor = (b: string) =>
  ({ A: "#34d399", B: "#a3e635", C: "#f59e0b", D: "#fb923c", F: "#f87171" }[b] ?? "#8695ab");
const riskColor = (v: number) => (v >= 70 ? "#f87171" : v >= 45 ? "#f59e0b" : "#34d399");

export function CompanyScorecard({ scores }: { scores: Scores }) {
  const keys = ["geopolitical", "supplierDependency", "cyber", "financial", "esg", "customerDependency"] as const;
  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg text-2xl font-bold text-white" style={{ background: bandColor(scores.band) }}>
            {scores.band}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-faint)]">{LABELS.overall}</div>
            <div className="text-2xl font-bold">
              {scores.overall}
              <span className="text-sm text-[var(--text-faint)]">/100</span>
            </div>
          </div>
        </div>
        <div className="h-12 w-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={scores.trend}>
              <YAxis hide domain={[0, 100]} />
              <Area dataKey="value" stroke="#38bdf8" fill="#38bdf833" strokeWidth={2} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {keys.map((k) => (
          <div key={k} className="rounded-lg bg-[var(--panel-2)] p-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--text-dim)]">
                {LABELS[k]}
                {k === "customerDependency" && <span title="limited data (proxy)"> *</span>}
              </span>
              <span className="font-semibold" style={{ color: riskColor(scores[k]) }}>{scores[k]}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--panel-border)]">
              <div className="h-full rounded-full" style={{ width: `${scores[k]}%`, background: riskColor(scores[k]) }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-[var(--text-faint)]">
        * customer dependency is a proxy (no free customer-relationship feed). Higher = more risk.
      </p>
    </div>
  );
}
