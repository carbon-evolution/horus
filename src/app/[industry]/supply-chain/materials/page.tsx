import { MaterialsView } from "@/components/supply/MaterialsView";
import { getMaterials } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const materials = await getMaterials(industry);
  return <MaterialsView materials={materials} />;
}
