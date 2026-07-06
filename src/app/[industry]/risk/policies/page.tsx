import { PoliciesView } from "@/components/risk/PoliciesView";
import { getPolicies } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const policies = await getPolicies(industry);
  return <PoliciesView policies={policies} />;
}
