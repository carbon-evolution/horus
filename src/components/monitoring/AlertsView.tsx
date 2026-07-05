"use client";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { getAlerts } from "@/lib/provider";
import { INDUSTRY_LABEL, type RiskLevel } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { RiskBadge } from "@/components/ui/RiskBadge";

const ORDER: RiskLevel[] = ["high", "medium", "low"];

export function AlertsView() {
  const industry = useApp((s) => s.industry);
  const [filter, setFilter] = useState<RiskLevel | "all">("all");
  const alerts = getAlerts(industry)
    .filter((a) => filter === "all" || a.severity === filter)
    .sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity));

  return (
    <div className="space-y-3">
      <PageHeader
        title="Alerts & Notifications"
        subtitle={`${INDUSTRY_LABEL[industry]} · priority events with deep links to affected assets`}
        actions={
          <div className="inline-flex rounded-lg border border-[var(--panel-border)] bg-[var(--panel-2)] p-0.5 text-xs">
            {(["all", ...ORDER] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-2.5 py-1 font-medium capitalize transition-colors ${
                  filter === f ? "bg-[var(--accent)] text-white" : "text-[var(--text-dim)] hover:text-[var(--text)]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        }
      />
      <Panel title={`Active Alerts (${alerts.length})`}>
        <ul className="divide-y divide-[var(--panel-border)]">
          {alerts.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <RiskBadge level={a.severity} />
                <div className="min-w-0">
                  <div className="truncate text-sm">{a.title}</div>
                  <div className="text-[11px] text-[var(--text-faint)]">{a.entity} · {a.ago}</div>
                </div>
              </div>
              <Link href={a.href} className="shrink-0 text-xs text-[var(--accent)] hover:underline">
                View asset →
              </Link>
            </li>
          ))}
          {alerts.length === 0 && <li className="py-6 text-center text-sm text-[var(--text-faint)]">No alerts at this severity.</li>}
        </ul>
      </Panel>
    </div>
  );
}
