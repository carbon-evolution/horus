import { DATA_SOURCES } from "@/lib/nav";

export function DataSourcesFooter() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 text-xs text-[var(--text-dim)]">
      <span className="font-semibold text-[var(--text)]">Data Sources</span>
      {DATA_SOURCES.map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--pos)]" />
          {s}
        </span>
      ))}
      <span className="ml-auto text-[var(--text-faint)]">
        Last Updated: {new Date().toISOString().slice(0, 10)} · live free-tier feeds
      </span>
    </div>
  );
}
