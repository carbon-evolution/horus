import { CompaniesNews } from "@/components/companies/CompaniesNews";
import { getNews, getCompanies, getFacilities } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const [news, companies, facilities] = await Promise.all([
    getNews(industry),
    getCompanies(industry),
    getFacilities(industry),
  ]);
  return <CompaniesNews news={news} companies={companies} facilities={facilities} />;
}
