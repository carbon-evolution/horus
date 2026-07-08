import { CompaniesOverview } from "@/components/companies/CompaniesOverview";
import { getCompanies, getCompanyMeta, getScores, getFacilities, getAlerts } from "@/lib/provider";
import type { Industry, CompanyMeta, Scores } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const companies = await getCompanies(industry);
  const top = companies.slice(0, 10);
  const [metasEntries, scoreEntries, facilities, alerts] = await Promise.all([
    Promise.all(top.map(async (c) => [c.id, await getCompanyMeta(industry, c.id)] as const)),
    Promise.all(top.map(async (c) => [c.id, await getScores(industry, c.id)] as const)),
    getFacilities(industry),
    getAlerts(industry),
  ]);
  const metas: Record<string, CompanyMeta> = Object.fromEntries(metasEntries);
  const scores: Record<string, Scores | null> = Object.fromEntries(scoreEntries);
  return <CompaniesOverview companies={top} metas={metas} scores={scores} facilities={facilities} alerts={alerts} />;
}
