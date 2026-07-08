"use client";
import { useMemo, useState } from "react";
import { Crosshair, X } from "lucide-react";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type FacilityStatus, type FacilityType, type Company, type Facility } from "@/lib/types";
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
const TYPE_LABEL: Record<FacilityType, string> = {
  fab: "Fab / Plant",
  backend: "Backend / DC",
  rnd: "R&D",
  hq: "HQ",
  refinery: "Refinery",
};

const ALL = "all";
const selectCls = "rounded-md border border-[var(--panel-border)] bg-[var(--panel-2)] px-2 py-1 text-sm";

export function FacilitiesView({ companies, facilities }: { companies: Company[]; facilities: Facility[] }) {
  const industry = useIndustry();
  const { focusId, active, toggleFocus } = useFocus();
  const companyName = new Map(companies.map((c) => [c.id, c.name]));

  const [companyFilter, setCompanyFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [countryFilter, setCountryFilter] = useState(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (selectedId) return facilities.filter((f) => f.id === selectedId);
    return facilities.filter(
      (f) =>
        (companyFilter === ALL || f.companyId === companyFilter) &&
        (typeFilter === ALL || f.type === typeFilter) &&
        (statusFilter === ALL || f.status === statusFilter) &&
        (countryFilter === ALL || f.country === countryFilter),
    );
  }, [facilities, selectedId, companyFilter, typeFilter, statusFilter, countryFilter]);

  const selected = selectedId ? facilities.find((f) => f.id === selectedId) : undefined;
  const filtersActive =
    selectedId !== null || companyFilter !== ALL || typeFilter !== ALL || statusFilter !== ALL || countryFilter !== ALL;
  const clearAll = () => {
    setSelectedId(null);
    setCompanyFilter(ALL);
    setTypeFilter(ALL);
    setStatusFilter(ALL);
    setCountryFilter(ALL);
  };
  // Clicking a dot isolates that unit; clicking the isolated dot again releases it.
  const onSelect = (f: Facility) => setSelectedId((cur) => (cur === f.id ? null : f.id));

  const count = (s: FacilityStatus) => filtered.filter((f) => f.status === s).length;
  const companyIds = [...new Set(facilities.map((f) => f.companyId))].sort((a, b) =>
    (companyName.get(a) ?? a).localeCompare(companyName.get(b) ?? b),
  );
  const countries = [...new Set(facilities.map((f) => f.country).filter(Boolean))].sort();

  return (
    <div className="space-y-3">
      <PageHeader title="Manufacturing Facilities" subtitle={`${INDUSTRY_LABEL[industry]} · global production footprint and site risk`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Operating" value={count("operating")} icon="CheckCircle2" accent="#34d399" />
        <StatTile label="Under Construction" value={count("construction")} icon="Hammer" accent="#f59e0b" />
        <StatTile label="Planned" value={count("planned")} icon="Clock" accent="#3b82f6" />
        <StatTile label="Risk Detected" value={count("risk")} icon="TriangleAlert" accent="#ef4444" />
      </div>

      <Panel title="Global Footprint">
        <ManufacturingFootprint facilities={filtered} onSelectAction={onSelect} />
      </Panel>

      <Panel title="Site Register" bodyClassName="overflow-x-auto">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <select value={companyFilter} onChange={(e) => { setCompanyFilter(e.target.value); setSelectedId(null); }} className={selectCls}>
            <option value={ALL}>All companies</option>
            {companyIds.map((id) => (
              <option key={id} value={id}>{companyName.get(id) ?? id}</option>
            ))}
          </select>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setSelectedId(null); }} className={selectCls}>
            <option value={ALL}>All types</option>
            {(Object.keys(TYPE_LABEL) as FacilityType[]).map((t) => (
              <option key={t} value={t}>{TYPE_LABEL[t]}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setSelectedId(null); }} className={selectCls}>
            <option value={ALL}>All statuses</option>
            {(Object.keys(STATUS_LABEL) as FacilityStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          <select value={countryFilter} onChange={(e) => { setCountryFilter(e.target.value); setSelectedId(null); }} className={selectCls}>
            <option value={ALL}>All countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {selected && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)] px-2.5 py-0.5 text-xs text-[var(--accent)]">
              {selected.name} · {companyName.get(selected.companyId) ?? selected.companyId}
              <button onClick={() => setSelectedId(null)} title="Clear selection"><X size={12} /></button>
            </span>
          )}
          <span className="text-xs text-[var(--text-faint)]">
            Showing {filtered.length} of {facilities.length} sites
          </span>
          {filtersActive && (
            <button onClick={clearAll} className="text-xs text-[var(--text-dim)] underline underline-offset-2 hover:text-[var(--text)]">
              Reset
            </button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-[var(--text-dim)]">
              <th className="pb-2 font-medium">Facility</th>
              <th className="pb-2 font-medium">Company</th>
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 font-medium">Location</th>
              <th className="pb-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => {
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
                <td className="py-2 text-[var(--text-dim)]" title={`${f.lat.toFixed(2)}, ${f.lng.toFixed(2)}`}>{f.city}, {f.country}</td>
                <td className="py-2 text-right">
                  <span className="rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ color: STATUS_COLOR[f.status], background: `${STATUS_COLOR[f.status]}1f` }}>
                    {STATUS_LABEL[f.status]}
                  </span>
                </td>
              </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr className="border-t border-[var(--panel-border)]">
                <td colSpan={5} className="py-6 text-center text-[var(--text-faint)]">No sites match the current filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
