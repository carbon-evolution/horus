import { EsgView } from "@/components/risk/EsgView";
import { getEsgProfiles } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const esg = await getEsgProfiles(industry);
  return <EsgView esg={esg} />;
}
