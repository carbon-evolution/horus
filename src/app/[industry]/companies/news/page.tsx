import { CompaniesNews } from "@/components/companies/CompaniesNews";
import { getNews } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const news = await getNews(industry);
  return <CompaniesNews news={news} />;
}
