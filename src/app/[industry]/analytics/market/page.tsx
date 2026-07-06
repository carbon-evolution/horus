import { MarketIntelView } from "@/components/analytics/MarketIntelView";
import { getMarketIntel } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const marketIntel = await getMarketIntel(industry);
  return <MarketIntelView marketIntel={marketIntel} />;
}
