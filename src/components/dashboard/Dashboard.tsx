"use client";
import { useApp } from "@/lib/store";
import { getIndustryData } from "@/lib/data";
import { INDUSTRY_LABEL } from "@/lib/types";
import { Panel } from "@/components/ui/Panel";
import { KpiRow } from "@/components/dashboard/KpiRow";
import { ManufacturingFootprint } from "@/components/dashboard/ManufacturingFootprint";
import { MarketSnapshot } from "@/components/dashboard/MarketSnapshot";
import { NewsFeed } from "@/components/dashboard/NewsFeed";
import { RawMaterialsSankey } from "@/components/dashboard/RawMaterialsSankey";
import { RiskRadar } from "@/components/dashboard/RiskRadar";
import { FinancialPerformance } from "@/components/dashboard/FinancialPerformance";
import { DealsTable } from "@/components/dashboard/DealsTable";
import { TopSuppliers } from "@/components/dashboard/TopSuppliers";
import { ResearchInnovation } from "@/components/dashboard/ResearchInnovation";
import { DataSourcesFooter } from "@/components/dashboard/DataSourcesFooter";

export function Dashboard() {
  const industry = useApp((s) => s.industry);
  const d = getIndustryData(industry);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-bold">Dashboard</h1>
        <p className="text-xs text-[var(--text-dim)]">
          {INDUSTRY_LABEL[industry]} · global supply-chain risk overview
        </p>
      </div>

      <KpiRow kpis={d.kpis} />

      {/* Row: map / market / news */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <Panel title="Global Manufacturing Footprint" action="All Facilities" className="xl:col-span-5">
          <ManufacturingFootprint facilities={d.facilities} />
        </Panel>
        <Panel title="Market Snapshot (Top 10)" className="xl:col-span-4">
          <MarketSnapshot companies={d.companies} />
        </Panel>
        <Panel title="Latest News & Market Impact" action="View All" className="xl:col-span-3">
          <NewsFeed news={d.news} />
        </Panel>
      </div>

      {/* Row: sankey / radar / financials */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Panel title="Raw Materials Movement (30 Days)" action="View Trade & Shipments">
          <RawMaterialsSankey data={d.sankey} />
        </Panel>
        <Panel title="Supply Chain Risk Radar" action="View All Risks">
          <RiskRadar data={d.radar} />
        </Panel>
        <Panel title="Financial Performance (TTM)" action="View Financial Details">
          <FinancialPerformance data={d.financials} />
        </Panel>
      </div>

      {/* Row: deals / suppliers / research */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <Panel title="Recent Deals & Partnerships" action="View All" className="xl:col-span-5" bodyClassName="overflow-x-auto">
          <DealsTable deals={d.deals} />
        </Panel>
        <Panel title="Top Suppliers by Spend" action="View All" className="xl:col-span-4">
          <TopSuppliers suppliers={d.suppliers} />
        </Panel>
        <Panel title="Research & Innovation (TTM)" action="View All" className="xl:col-span-3">
          <ResearchInnovation rows={d.research} />
        </Panel>
      </div>

      <DataSourcesFooter />
    </div>
  );
}
