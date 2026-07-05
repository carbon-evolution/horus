"use client";
import { useApp } from "@/lib/store";
import { getDeals } from "@/lib/provider";
import { INDUSTRY_LABEL } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { DealsTable } from "@/components/dashboard/DealsTable";

export function CompaniesDeals() {
  const industry = useApp((s) => s.industry);
  const deals = getDeals(industry);
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
