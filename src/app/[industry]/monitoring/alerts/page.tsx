import { AlertsView } from "@/components/monitoring/AlertsView";
import { getAlerts } from "@/lib/provider";
import type { Industry } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ industry: Industry }> }) {
  const { industry } = await params;
  const alerts = await getAlerts(industry);
  return <AlertsView alerts={alerts} />;
}
