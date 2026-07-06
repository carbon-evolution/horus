import { SuppliersView } from "@/components/supply/SuppliersView";
import { getSupplierEdges, getSupplierProfiles } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const [edges, profiles] = await Promise.all([
    getSupplierEdges(industry),
    getSupplierProfiles(industry),
  ]);
  return <SuppliersView edges={edges} profiles={profiles} />;
}
