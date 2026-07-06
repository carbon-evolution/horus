import { SuppliersView } from "@/components/supply/SuppliersView";
import { getSupplierEdges } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const edges = await getSupplierEdges(industry);
  return <SuppliersView edges={edges} />;
}
