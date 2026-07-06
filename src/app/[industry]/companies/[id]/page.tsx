import { notFound } from "next/navigation";
import { CompanyProfile } from "@/components/companies/CompanyProfile";
import {
  getCompany,
  getCompanyMeta,
  getFacilities,
  getFinancialsTTM,
  getNews,
  getPatents,
  getHoldings,
  getFilings,
} from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry; id: string }> }) {
  const { industry, id } = await params;
  const company = await getCompany(industry, id);
  if (!company) notFound();
  const [meta, ttm, facilities, news, patents, holdings, filings] = await Promise.all([
    getCompanyMeta(industry, id),
    getFinancialsTTM(industry, id),
    getFacilities(industry),
    getNews(industry),
    getPatents(industry),
    getHoldings(industry, id),
    getFilings(industry, id),
  ]);
  return (
    <CompanyProfile
      id={id}
      company={company}
      meta={meta}
      ttm={ttm}
      facilities={facilities}
      news={news}
      patents={patents}
      holdings={holdings}
      filings={filings}
    />
  );
}
