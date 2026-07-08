"use client";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type IndustryData, type RadarAxis } from "@/lib/types";
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

type DashboardData = Pick<IndustryData,
  "kpis" | "companies" | "facilities" | "news" | "sankey" | "financials" | "deals" | "suppliers" | "research">
  & { radar: RadarAxis[] };

export function Dashboard({ data }: { data: DashboardData }) {
  const industry = useIndustry();

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-bold">Dashboard</h1>
        <p className="text-xs text-[var(--text-dim)]">
          {INDUSTRY_LABEL[industry]} · global supply-chain risk overview
        </p>
      </div>

      <KpiRow kpis={data.kpis} />

      {/* Hero row: the two headline visuals, enlarged */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <Panel title="Global Manufacturing Footprint" action="All Facilities" className="min-h-[460px] xl:col-span-7">
          <ManufacturingFootprint facilities={data.facilities} />
        </Panel>
        <Panel title="Raw Materials Movement (30 Days)" action="View Trade & Shipments" className="min-h-[460px] xl:col-span-5">
          <RawMaterialsSankey data={data.sankey} compact />
        </Panel>
      </div>

      {/* Row: market / radar / news */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <Panel title="Market Snapshot (Top 10)" className="xl:col-span-5">
          <MarketSnapshot companies={data.companies} />
        </Panel>
        <Panel title="Supply Chain Risk Radar" action="View All Risks" className="xl:col-span-4">
          <RiskRadar data={data.radar} />
        </Panel>
        <Panel title="Latest News & Market Impact" action="View All" className="xl:col-span-3">
          <NewsFeed news={data.news} />
        </Panel>
      </div>

      {/* Row: deals / suppliers / research */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <Panel title="Recent Deals & Partnerships" action="View All" className="xl:col-span-5" bodyClassName="overflow-x-auto">
          <DealsTable deals={data.deals} />
        </Panel>
        <Panel title="Top Suppliers by Spend" action="View All" className="xl:col-span-4">
          <TopSuppliers suppliers={data.suppliers} />
        </Panel>
        <Panel title="Research & Innovation (TTM)" action="View All" className="xl:col-span-3">
          <ResearchInnovation rows={data.research} />
        </Panel>
      </div>

      {/* Financial performance — full width */}
      <Panel title="Financial Performance (TTM)" action="View Financial Details">
        <FinancialPerformance data={data.financials} />
      </Panel>

      <DataSourcesFooter />
    </div>
  );
}
