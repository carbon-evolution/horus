"use client";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type Policy } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { RiskBadge } from "@/components/ui/RiskBadge";

export function PoliciesView({ policies: allPolicies }: { policies: Policy[] }) {
  const industry = useIndustry();
  const policies = [...allPolicies].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-3">
      <PageHeader title="Policies & Laws" subtitle={`${INDUSTRY_LABEL[industry]} · regulatory measures affecting tracked companies and materials`} />
      <Panel title="Regulatory Tracker" bodyClassName="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-[var(--text-dim)]">
              <th className="pb-2 font-medium">Measure</th>
              <th className="pb-2 font-medium">Authority</th>
              <th className="pb-2 font-medium">Region</th>
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Targets</th>
              <th className="pb-2 text-right font-medium">Severity</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.id} className="border-t border-[var(--panel-border)] align-top">
                <td className="max-w-md py-2.5">
                  <div className="font-medium">{p.title}</div>
                  <div className="mt-0.5 text-xs text-[var(--text-dim)]">{p.summary}</div>
                </td>
                <td className="py-2.5 whitespace-nowrap text-[var(--text-dim)]">{p.authority}</td>
                <td className="py-2.5 whitespace-nowrap text-[var(--text-dim)]">{p.region}</td>
                <td className="py-2.5 whitespace-nowrap tabular-nums text-[var(--text-faint)]">{p.date}</td>
                <td className="py-2.5">
                  <div className="flex max-w-48 flex-wrap gap-1">
                    {p.targets.map((t) => (
                      <span key={t} className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-2)] px-2 py-0.5 text-[10px] text-[var(--text-dim)]">{t}</span>
                    ))}
                  </div>
                </td>
                <td className="py-2.5 text-right"><RiskBadge level={p.severity} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
