import type { ResearchRow } from "@/lib/types";
import { CompanyLink } from "@/components/ui/CompanyLink";

export function ResearchInnovation({ rows }: { rows: ResearchRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] text-[var(--text-dim)]">
          <th className="pb-2 font-medium">Company</th>
          <th className="pb-2 text-right font-medium">R&amp;D Expense</th>
          <th className="pb-2 text-right font-medium">R&amp;D % of Revenue</th>
          <th className="pb-2 text-right font-medium">Patents Filed</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.company} className="border-t border-[var(--panel-border)]">
            <td className="py-2 font-medium"><CompanyLink name={r.company} /></td>
            <td className="py-2 text-right tabular-nums">{r.rndExpense}</td>
            <td className="py-2 text-right tabular-nums text-[var(--text-dim)]">{r.rndPctRevenue}</td>
            <td className="py-2 text-right tabular-nums">{r.patents}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
