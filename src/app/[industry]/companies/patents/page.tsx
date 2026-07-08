import { CompaniesPatents } from "@/components/companies/CompaniesPatents";
import { getPatents, getResearch, getCompanies, getFacilities } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const [patents, research, companies, facilities] = await Promise.all([
    getPatents(industry),
    getResearch(industry),
    getCompanies(industry),
    getFacilities(industry),
  ]);
  return <CompaniesPatents patents={patents} research={research} companies={companies} facilities={facilities} />;
}
