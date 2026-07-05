"use client";
import { getDataSources } from "@/lib/provider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";

const STATUS_COLOR = { healthy: "var(--risk-low)", degraded: "var(--risk-med)", offline: "var(--risk-high)" } as const;

export function SourcesView() {
  const sources = getDataSources();
  return (
    <div className="space-y-3">
      <PageHeader title="Data Sources" subtitle="Lineage of every feed powering the platform — all free and open" />
      <Panel title="Feed Registry" bodyClassName="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-[var(--text-dim)]">
              <th className="pb-2 font-medium">Source</th>
              <th className="pb-2 font-medium">Provides</th>
              <th className="pb-2 font-medium">Cadence</th>
              <th className="pb-2 font-medium">Last Sync</th>
              <th className="pb-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.name} className="border-t border-[var(--panel-border)]">
                <td className="py-2.5 font-medium">
                  {s.name}
                  {s.free && <span className="ml-2 rounded bg-[var(--pos)]/10 px-1.5 py-0.5 text-[10px] text-[var(--pos)]">FREE</span>}
                </td>
                <td className="py-2.5 text-[var(--text-dim)]">{s.provides}</td>
                <td className="py-2.5 whitespace-nowrap text-[var(--text-dim)]">{s.cadence}</td>
                <td className="py-2.5 whitespace-nowrap tabular-nums text-[var(--text-faint)]">{s.lastSync}</td>
                <td className="py-2.5 text-right">
                  <span className="inline-flex items-center gap-1.5 text-xs capitalize" style={{ color: STATUS_COLOR[s.status] }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[s.status] }} />
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[11px] text-[var(--text-faint)]">
          Mock lineage — in live mode this table reflects the actual ETL pipeline sync log (cron → DuckDB staging → Postgres/Redis cache).
        </p>
      </Panel>
    </div>
  );
}
