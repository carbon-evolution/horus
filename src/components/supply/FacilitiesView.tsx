"use client";
import { Crosshair } from "lucide-react";
import { useApp } from "@/lib/store";
import { getFacilities, getCompanies } from "@/lib/fixtures";
import { INDUSTRY_LABEL, type FacilityStatus } from "@/lib/types";
import { useFocus, focusDim } from "@/lib/focus";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { StatTile } from "@/components/ui/StatTile";
import { ManufacturingFootprint } from "@/components/dashboard/ManufacturingFootprint";

const STATUS_LABEL: Record<FacilityStatus, string> = {
  operating: "Operating",
  planned: "Planned",
  construction: "Under Construction",
  risk: "Risk Detected",
};
const STATUS_COLOR: Record<FacilityStatus, string> = {
  operating: "var(--risk-low)",
  planned: "var(--accent)",
  construction: "var(--risk-med)",
  risk: "var(--risk-high)",
};

export function FacilitiesView() {
  const industry = useApp((s) => s.industry);
  const { focusId, active, toggleFocus } = useFocus();
  const facilities = getFacilities(industry);
  const companyName = new Map(getCompanies(industry).map((c) => [c.id, c.name]));
  const count = (s: FacilityStatus) => facilities.filter((f) => f.status === s).length;

  return (
    <div className="space-y-3">
      <PageHeader title="Manufacturing Facilities" subtitle={`${INDUSTRY_LABEL[industry]} · global production footprint and site risk`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Operating" value={count("operating")} icon="CheckCircle2" accent="#34d399" />
        <StatTile label="Under Construction" value={count("construction")} icon="Hammer" accent="#f59e0b" />
        <StatTile label="Planned" value={count("planned")} icon="Clock" accent="#3b82f6" />
        <StatTile label="Risk Detected" value={count("risk")} icon="AlertTriangle" accent="#ef4444" />
      </div>

      <Panel title="Global Footprint">
        <ManufacturingFootprint facilities={facilities} />
      </Panel>

      <Panel title="Site Register" bodyClassName="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-[var(--text-dim)]">
              <th className="pb-2 font-medium">Facility</th>
              <th className="pb-2 font-medium">Company</th>
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 font-medium">Coordinates</th>
              <th className="pb-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {facilities.map((f) => {
              const focused = f.companyId === focusId;
              return (
              <tr key={f.id} className={`border-t border-[var(--panel-border)] transition-opacity ${focusDim(active, focused)}`}>
                <td className="py-2 font-medium">{f.name}</td>
                <td className="py-2 text-[var(--text-dim)]">
                  <span className="inline-flex items-center gap-2">
                    <button
                      onClick={() => toggleFocus(f.companyId)}
                      title={focused ? "Clear focus" : "Focus this company across all pages"}
                      className={focused ? "text-[var(--accent)]" : "text-[var(--text-faint)] hover:text-[var(--text-dim)]"}
                    >
                      <Crosshair size={13} />
                    </button>
                    {companyName.get(f.companyId) ?? f.companyId}
                  </span>
                </td>
                <td className="py-2 capitalize text-[var(--text-dim)]">{f.type}</td>
                <td className="py-2 tabular-nums text-[var(--text-faint)]">{f.lat.toFixed(2)}, {f.lng.toFixed(2)}</td>
                <td className="py-2 text-right">
                  <span className="rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ color: STATUS_COLOR[f.status], background: `${STATUS_COLOR[f.status]}1f` }}>
                    {STATUS_LABEL[f.status]}
                  </span>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
