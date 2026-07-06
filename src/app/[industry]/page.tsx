import { Dashboard } from "@/components/dashboard/Dashboard";
import { getIndustryBundle } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const data = await getIndustryBundle(industry);
  return <Dashboard data={data} />;
}
