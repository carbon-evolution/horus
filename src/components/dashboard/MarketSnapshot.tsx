import type { Company } from "@/lib/types";

function pct(n: number) {
  if (n === 0) return <span className="text-[var(--text-faint)]">—</span>;
  const up = n >= 0;
  return <span style={{ color: up ? "var(--pos)" : "var(--neg)" }}>{`${up ? "+" : ""}${n.toFixed(2)}%`}</span>;
}

export function MarketSnapshot({ companies }: { companies: Company[] }) {
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
          {companies.map((c) => (
            <tr key={c.id} className="border-t border-[var(--panel-border)]">
              <td className="py-1.5">
                <div className="font-medium">{c.name}</div>
                <div className="text-[10px] text-[var(--text-faint)]">{c.ticker}</div>
              </td>
              <td className="py-1.5 text-right tabular-nums">{c.marketCap}</td>
              <td className="py-1.5 text-right tabular-nums text-[var(--text-dim)]">{c.price}</td>
              <td className="py-1.5 text-right tabular-nums">{pct(c.change24h)}</td>
              <td className="py-1.5 text-right tabular-nums">{pct(c.changeYtd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
