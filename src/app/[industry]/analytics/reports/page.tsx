import { ReportsView } from "@/components/analytics/ReportsView";
import { getAlerts, getCompanies, getMaterials, getPolicies } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const [alerts, companies, materials, policies] = await Promise.all([
    getAlerts(industry), getCompanies(industry), getMaterials(industry), getPolicies(industry),
  ]);
  return <ReportsView alerts={alerts} companies={companies} materials={materials} policies={policies} />;
}
