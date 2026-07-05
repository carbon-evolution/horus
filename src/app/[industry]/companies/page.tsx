import { CompaniesOverview } from "@/components/companies/CompaniesOverview";
import { getCompanies, getCompanyMeta } from "@/lib/provider";
import type { Industry, CompanyMeta } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const companies = await getCompanies(industry);
  const metas: Record<string, CompanyMeta> = Object.fromEntries(
    await Promise.all(companies.map(async (c) => [c.id, await getCompanyMeta(industry, c.id)])),
  );
  return <CompaniesOverview companies={companies} metas={metas} />;
}
