import { TradeView } from "@/components/supply/TradeView";
import { getSankey, getShipments, getSupplierMaterialSankey, getMaterialLanes } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const [sankey, shipments, companySankey, materialLanes] = await Promise.all([
    getSankey(industry),
    getShipments(industry),
    getSupplierMaterialSankey(industry),
    getMaterialLanes(industry),
  ]);
  return <TradeView sankey={sankey} shipments={shipments} companySankey={companySankey} materialLanes={materialLanes} />;
}
