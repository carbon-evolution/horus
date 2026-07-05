import { CompaniesPatents } from "@/components/companies/CompaniesPatents";
import { getPatents } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const patents = await getPatents(industry);
  return <CompaniesPatents patents={patents} />;
}
