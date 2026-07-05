import { CompaniesDeals } from "@/components/companies/CompaniesDeals";
import { getDeals } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const deals = await getDeals(industry);
  return <CompaniesDeals deals={deals} />;
}
