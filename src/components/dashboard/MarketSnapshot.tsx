"use client";
import type { Company } from "@/lib/types";
import { useFocus, focusDim } from "@/lib/focus";

function pct(n: number) {
  if (n === 0) return <span className="text-[var(--text-faint)]">—</span>;
  const up = n >= 0;
  return <span style={{ color: up ? "var(--pos)" : "var(--neg)" }}>{`${up ? "+" : ""}${n.toFixed(2)}%`}</span>;
}

export function MarketSnapshot({ companies }: { companies: Company[] }) {
  const { focusId, active, toggleFocus } = useFocus();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] text-[var(--text-dim)]">
            <th className="pb-2 font-medium">Company</th>
            <th className="pb-2 text-right font-medium">Market Cap</th>
            <th className="pb-2 text-right font-medium">Price (USD)</th>
            <th className="pb-2 text-right font-medium">24h %</th>
            <th className="pb-2 text-right font-medium">YTD %</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => {
            const focused = c.id === focusId;
            return (
              <tr
                key={c.id}
                onClick={() => toggleFocus(c.id)}
                title={focused ? "Clear focus" : "Focus this company across all widgets"}
                className={`cursor-pointer border-t border-[var(--panel-border)] transition-opacity hover:bg-white/5 ${
                  focused ? "bg-[var(--accent)]/10" : focusDim(active, focused)
                }`}
              >
                <td className="py-1.5">
                  <div className={`font-medium ${focused ? "text-[var(--accent)]" : ""}`}>{c.name}</div>
                  <div className="text-[10px] text-[var(--text-faint)]">{c.ticker}</div>
                </td>
                <td className="py-1.5 text-right tabular-nums">{c.marketCap}</td>
                <td className="py-1.5 text-right tabular-nums text-[var(--text-dim)]">{c.price}</td>
                <td className="py-1.5 text-right tabular-nums">{pct(c.change24h)}</td>
                <td className="py-1.5 text-right tabular-nums">{pct(c.changeYtd)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
