import { GeoRiskView } from "@/components/risk/GeoRiskView";
import { getGeoRisks, getChokepoints, getShipments, getMaterials, getSupplierEdges } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const [geo, chokepoints, shipments, materials, edges] = await Promise.all([
    getGeoRisks(industry),
    getChokepoints(),
    getShipments(industry),
    getMaterials(industry),
    getSupplierEdges(industry),
  ]);
  return <GeoRiskView geo={geo} chokepoints={chokepoints} shipments={shipments} materials={materials} edges={edges} />;
}
