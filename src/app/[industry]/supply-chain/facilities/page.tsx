import { FacilitiesView } from "@/components/supply/FacilitiesView";
import { getCompanies, getFacilities } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const [companies, facilities] = await Promise.all([getCompanies(industry), getFacilities(industry)]);
  return <FacilitiesView companies={companies} facilities={facilities} />;
}
