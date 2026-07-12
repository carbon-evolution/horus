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

const SEV_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

export function ReportsView({
  alerts, companies: allCompanies, materials: allMaterials, policies: allPolicies,
}: { alerts: AlertItem[]; companies: Company[]; materials: RawMaterial[]; policies: Policy[] }) {
  const industry = useIndustry();
  const [picked, setPicked] = useState<SectionKey[]>(["exec", "companies", "alerts"]);
  // Companies arrive pre-sorted by market cap; surface the top risks for the
  // rest so the brief highlights the worst offenders, not an arbitrary first N.
  const companies = allCompanies.slice(0, 5);
  const materials = [...allMaterials]
    .sort((a, b) => b.concentration - a.concentration || SEV_RANK[b.supplyRisk] - SEV_RANK[a.supplyRisk])
    .slice(0, 5);
  const policies = [...allPolicies]
    .sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity] || b.date.localeCompare(a.date))
    .slice(0, 4);
  const has = (k: SectionKey) => picked.includes(k);

  const highAlerts = alerts.filter((a) => a.severity === "high").length;
  const highRiskMaterials = allMaterials.filter((m) => m.supplyRisk === "high").length;
  const topMaterial = materials[0];
  const topPolicy = policies[0];

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
                  The {INDUSTRY_LABEL[industry]} supply chain shows {highAlerts} high-severity active alert{highAlerts === 1 ? "" : "s"}
                  {highRiskMaterials > 0 && <> and {highRiskMaterials} raw material{highRiskMaterials === 1 ? "" : "s"} at high supply risk</>}.
                  {topMaterial && <> The tightest sourcing concentration is <strong>{topMaterial.name}</strong> at {topMaterial.concentration}% (top-3).</>}
                  {topPolicy && <> The most significant regulatory exposure is <strong>{topPolicy.title}</strong> ({topPolicy.severity} severity — {topPolicy.authority}).</>}
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
