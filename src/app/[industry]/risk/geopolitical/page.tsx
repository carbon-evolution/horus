import { GeoRiskView } from "@/components/risk/GeoRiskView";
import { getGeoRisks, getChokepoints, getMaterialLanes, getMaterials, getSupplierEdges } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const [geo, chokepoints, materialLanes, materials, edges] = await Promise.all([
    getGeoRisks(industry),
    getChokepoints(),
    getMaterialLanes(industry),
    getMaterials(industry),
    getSupplierEdges(industry),
  ]);
  return <GeoRiskView geo={geo} chokepoints={chokepoints} shipments={materialLanes} materials={materials} edges={edges} />;
}
