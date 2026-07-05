"use client";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type Deal } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { DealsTable } from "@/components/dashboard/DealsTable";

export function CompaniesDeals({ deals }: { deals: Deal[] }) {
  const industry = useIndustry();
  const total = deals.reduce((s, d) => s + (parseFloat(d.value.replace(/[^0-9.]/g, "")) || 0), 0);

  return (
    <div className="space-y-3">
      <PageHeader
        title="Deals & Partnerships"
        subtitle={`${INDUSTRY_LABEL[industry]} · JVs, supply agreements and strategic partnerships`}
        actions={<span className="text-xs text-[var(--text-dim)]">Tracked value: <span className="font-semibold text-[var(--text)]">${total.toFixed(1)}B</span></span>}
      />
      <Panel title="Deal Matrix" bodyClassName="overflow-x-auto">
        <DealsTable deals={deals} />
      </Panel>
    </div>
  );
}
