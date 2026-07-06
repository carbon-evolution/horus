import { RiskRadarCompare, type CompareRadarSeries } from "@/components/risk/RiskRadarCompare";
import { RiskRegister } from "@/components/risk/RiskRegister";
import { getCompareRadar, getAllRisks, getCompanies } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const [compareRadar, risks, companies] = await Promise.all([
    getCompareRadar(industry) as Promise<CompareRadarSeries[]>,
    getAllRisks(industry),
    getCompanies(industry),
  ]);
  const nameById = Object.fromEntries(companies.map((c) => [c.id, c.name]));
  const byCompany = Object.fromEntries(
    Object.entries(risks)
      .filter(([, rs]) => rs.length > 0)
      .map(([id, rs]) => [id, { name: nameById[id] ?? id, risks: rs }]),
  );
  return (
    <div className="space-y-3">
      <RiskRadarCompare compareRadar={compareRadar ?? []} />
      <RiskRegister byCompany={byCompany} />
    </div>
  );
}
