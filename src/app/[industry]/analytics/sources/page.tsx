import { SourcesView } from "@/components/analytics/SourcesView";
import { getDataSources } from "@/lib/provider";

export default async function Page() {
  const sources = await getDataSources();
  return <SourcesView sources={sources} />;
}
