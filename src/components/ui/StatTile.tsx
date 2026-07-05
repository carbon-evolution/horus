import { Icon } from "@/components/Icon";

export function StatTile({
  label,
  value,
  icon,
  accent = "#3b82f6",
  sub,
}: {
  label: string;
  value: string | number;
  icon?: string;
  accent?: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-3">
      {icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: `${accent}1f`, color: accent }}>
          <Icon name={icon} size={18} />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-lg font-bold leading-none">{value}</div>
        <div className="mt-1 text-[11px] leading-tight text-[var(--text-dim)]">{label}</div>
        {sub && <div className="text-[10px] text-[var(--text-faint)]">{sub}</div>}
      </div>
    </div>
  );
}
