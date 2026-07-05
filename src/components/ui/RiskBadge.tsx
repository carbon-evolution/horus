import type { RiskLevel } from "@/lib/types";

const STYLE: Record<RiskLevel, { color: string; label: string }> = {
  low: { color: "var(--risk-low)", label: "Low" },
  medium: { color: "var(--risk-med)", label: "Medium" },
  high: { color: "var(--risk-high)", label: "High" },
};

export function RiskBadge({ level, label }: { level: RiskLevel; label?: string }) {
  const s = STYLE[level];
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[11px] font-medium"
      style={{ color: s.color, background: `${s.color}1f` }}
    >
      {label ?? s.label}
    </span>
  );
}
