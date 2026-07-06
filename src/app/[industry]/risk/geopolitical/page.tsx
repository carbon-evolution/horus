import { GeoRiskView } from "@/components/risk/GeoRiskView";
import { getGeoRisks, getChokepoints } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const [geo, chokepoints] = await Promise.all([getGeoRisks(industry), getChokepoints()]);
  return <GeoRiskView geo={geo} chokepoints={chokepoints} />;
}
