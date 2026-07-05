import { CompaniesFinancials } from "@/components/companies/CompaniesFinancials";
import { getCompanies, getFinancialsSnapshot, getFinancialsTTM } from "@/lib/provider";
import type { Industry, FinancialTTMPoint } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const [companies, financials] = await Promise.all([
    getCompanies(industry),
    getFinancialsSnapshot(industry),
  ]);
  const ttm: Record<string, FinancialTTMPoint[]> = Object.fromEntries(
    await Promise.all(companies.map(async (c) => [c.id, await getFinancialsTTM(industry, c.id)])),
  );
  return <CompaniesFinancials companies={companies} financials={financials} ttm={ttm} />;
}
