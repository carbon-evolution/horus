import { RiskRadarCompare, type CompareRadarSeries } from "@/components/risk/RiskRadarCompare";
import { getCompareRadar } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const compareRadar = (await getCompareRadar(industry)) as CompareRadarSeries[];
  return <RiskRadarCompare compareRadar={compareRadar ?? []} />;
}
