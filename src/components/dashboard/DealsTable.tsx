import type { Deal } from "@/lib/types";

export function DealsTable({ deals }: { deals: Deal[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] text-[var(--text-dim)]">
            <th className="pb-2 font-medium">Date</th>
            <th className="pb-2 font-medium">Companies</th>
            <th className="pb-2 font-medium">Deal Type</th>
            <th className="pb-2 text-right font-medium">Value</th>
            <th className="pb-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((d, i) => (
            <tr key={i} className="border-t border-[var(--panel-border)]">
              <td className="py-2 whitespace-nowrap text-[var(--text-dim)]">{d.date}</td>
              <td className="py-2 whitespace-nowrap font-medium text-[var(--accent)]">{d.parties}</td>
              <td className="py-2 whitespace-nowrap text-[var(--text-dim)]">{d.type}</td>
              <td className="py-2 text-right tabular-nums">{d.value}</td>
              <td className="py-2 text-[var(--text-dim)]">{d.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
