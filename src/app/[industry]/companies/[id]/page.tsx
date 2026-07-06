import { notFound } from "next/navigation";
import { CompanyProfile } from "@/components/companies/CompanyProfile";
import { CompanyNotTracked } from "@/components/companies/CompanyNotTracked";
import {
  getCompany,
  findCompanyHome,
  getCompanyMeta,
  getFacilities,
  getFinancialsTTM,
  getNews,
  getPatents,
  getHoldings,
  getFilings,
  getFinancialHistory,
} from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry; id: string }> }) {
  const { industry, id } = await params;
  const company = await getCompany(industry, id);
  if (!company) {
    // The id may be a real company tracked under a different Industry Focus
    // (deep link + industry switch). Offer a cross-link instead of a 404;
    // only a genuinely unknown id 404s.
    const home = await findCompanyHome(id);
    if (!home) notFound();
    return <CompanyNotTracked id={id} industry={industry} home={home.industry} name={home.company.name} />;
  }
  const [meta, ttm, facilities, news, patents, holdings, filings, history] = await Promise.all([
    getCompanyMeta(industry, id),
    getFinancialsTTM(industry, id),
    getFacilities(industry),
    getNews(industry),
    getPatents(industry),
    getHoldings(industry, id),
    getFilings(industry, id),
    getFinancialHistory(industry, id),
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
      history={history}
    />
  );
}
