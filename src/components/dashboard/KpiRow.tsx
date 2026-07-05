import type { Kpi } from "@/lib/types";
import { Icon } from "@/components/Icon";

export function KpiRow({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
      {kpis.map((k) => (
        <div key={k.label} className="flex items-center gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ background: `${k.accent}1f`, color: k.accent }}
          >
            <Icon name={k.icon} size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold leading-none">{k.value}</div>
            <div className="mt-1 text-[11px] leading-tight text-[var(--text-dim)]">{k.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
