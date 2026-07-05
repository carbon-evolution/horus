import type { Supplier, RiskLevel } from "@/lib/types";

const RISK_STYLE: Record<RiskLevel, { color: string; label: string }> = {
  high: { color: "var(--risk-high)", label: "High" },
  medium: { color: "var(--risk-med)", label: "Medium" },
  low: { color: "var(--risk-low)", label: "Low" },
};

export function TopSuppliers({ suppliers }: { suppliers: Supplier[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] text-[var(--text-dim)]">
          <th className="pb-2 font-medium">Supplier</th>
          <th className="pb-2 font-medium">Category</th>
          <th className="pb-2 text-right font-medium">Total Spend</th>
          <th className="pb-2 text-right font-medium">Risk</th>
        </tr>
      </thead>
      <tbody>
        {suppliers.map((s) => {
          const r = RISK_STYLE[s.risk];
          return (
            <tr key={s.name} className="border-t border-[var(--panel-border)]">
              <td className="py-2 font-medium">{s.name}</td>
              <td className="py-2 text-[var(--text-dim)]">{s.category}</td>
              <td className="py-2 text-right tabular-nums">{s.spend}</td>
              <td className="py-2 text-right">
                <span className="rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ color: r.color, background: `${r.color}1f` }}>
                  {r.label}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
