import { SupplyChainMapClient } from "@/components/supply/SupplyChainMapClient";
import { getSupplyGraph } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const graph = await getSupplyGraph(industry);
  return <SupplyChainMapClient graph={graph} />;
}
