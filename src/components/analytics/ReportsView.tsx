"use client";
import { useState } from "react";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type AlertItem, type Company, type RawMaterial, type Policy } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { RiskBadge } from "@/components/ui/RiskBadge";

const SECTIONS = [
  { key: "exec", label: "Executive Summary" },
  { key: "companies", label: "Company Snapshot" },
  { key: "materials", label: "Raw Material Risk" },
  { key: "policies", label: "Regulatory Watch" },
  { key: "alerts", label: "Active Alerts" },
] as const;
type SectionKey = (typeof SECTIONS)[number]["key"];

export function ReportsView({
  alerts, companies: allCompanies, materials: allMaterials, policies: allPolicies,
}: { alerts: AlertItem[]; companies: Company[]; materials: RawMaterial[]; policies: Policy[] }) {
  const industry = useIndustry();
  const [picked, setPicked] = useState<SectionKey[]>(["exec", "companies", "alerts"]);
  const companies = allCompanies.slice(0, 5);
  const materials = allMaterials.slice(0, 5);
  const policies = allPolicies.slice(0, 4);
  const has = (k: SectionKey) => picked.includes(k);

  return (
    <div className="space-y-3">
      <PageHeader
        title="Reports"
        subtitle={`${INDUSTRY_LABEL[industry]} · compile an executive brief from live modules`}
        actions={
          <button onClick={() => window.print()} className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
            Export PDF
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
        <Panel title="Report Sections" className="print:hidden">
          <div className="space-y-1.5">
            {SECTIONS.map((s) => (
              <label key={s.key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/5">
                <input
                  type="checkbox"
                  checked={has(s.key)}
                  onChange={() => setPicked((p) => (p.includes(s.key) ? p.filter((x) => x !== s.key) : [...p, s.key]))}
                  className="accent-[var(--accent)]"
                />
                {s.label}
              </label>
            ))}
          </div>
        </Panel>

        {/* preview — also the print surface */}
        <Panel title={`${INDUSTRY_LABEL[industry]} Risk Brief — ${new Date().toISOString().slice(0, 10)}`} className="xl:col-span-3">
          <div className="space-y-5 text-sm">
            {has("exec") && (
              <section>
                <h3 className="mb-1 font-semibold">Executive Summary</h3>
                <p className="text-[var(--text-dim)]">
                  {INDUSTRY_LABEL[industry]} supply chain shows {alerts.filter((a) => a.severity === "high").length} high-severity
                  active alerts. Key concentrations remain in sourcing ({materials[0]?.name}: {materials[0]?.concentration}% top-3)
                  and policy exposure ({policies[0]?.title.slice(0, 60)}…).
                </p>
              </section>
            )}
            {has("companies") && (
              <section>
                <h3 className="mb-1 font-semibold">Company Snapshot</h3>
                <table className="w-full">
                  <tbody>
                    {companies.map((c) => (
                      <tr key={c.id} className="border-t border-[var(--panel-border)]">
                        <td className="py-1.5">{c.name}</td>
                        <td className="py-1.5 text-right tabular-nums">{c.marketCap}</td>
                        <td className="py-1.5 text-right tabular-nums" style={{ color: c.changeYtd >= 0 ? "var(--pos)" : "var(--neg)" }}>
                          {c.changeYtd === 0 ? "—" : `${c.changeYtd > 0 ? "+" : ""}${c.changeYtd.toFixed(1)}% YTD`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
            {has("materials") && (
              <section>
                <h3 className="mb-1 font-semibold">Raw Material Risk</h3>
                <table className="w-full">
                  <tbody>
                    {materials.map((mt) => (
                      <tr key={mt.id} className="border-t border-[var(--panel-border)]">
                        <td className="py-1.5">{mt.name}</td>
                        <td className="py-1.5 text-right tabular-nums">{mt.concentration}% conc.</td>
                        <td className="py-1.5 text-right"><RiskBadge level={mt.supplyRisk} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
            {has("policies") && (
              <section>
                <h3 className="mb-1 font-semibold">Regulatory Watch</h3>
                <ul className="space-y-1.5 text-[var(--text-dim)]">
                  {policies.map((p) => (
                    <li key={p.id}>• {p.title} <span className="text-[var(--text-faint)]">({p.authority}, {p.date})</span></li>
                  ))}
                </ul>
              </section>
            )}
            {has("alerts") && (
              <section>
                <h3 className="mb-1 font-semibold">Active Alerts</h3>
                <ul className="space-y-1.5">
                  {alerts.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2">
                      <span className="text-[var(--text-dim)]">{a.title}</span>
                      <RiskBadge level={a.severity} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {picked.length === 0 && <p className="text-[var(--text-faint)]">Select at least one section to build the report.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
