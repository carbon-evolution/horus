import { TradeView } from "@/components/supply/TradeView";
import { getSankey, getShipments } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const [sankey, shipments] = await Promise.all([getSankey(industry), getShipments(industry)]);
  return <TradeView sankey={sankey} shipments={shipments} />;
}
