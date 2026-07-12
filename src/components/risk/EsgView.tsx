"use client";
import { Crosshair } from "lucide-react";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type EsgProfile } from "@/lib/types";
import { useFocus, focusDim } from "@/lib/focus";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { CompanyLink } from "@/components/ui/CompanyLink";

// Emissions cell shaded relative to the column max (simple heatmap).
function heat(value: number, max: number) {
  const t = max ? value / max : 0;
  const bg = `rgba(239, 68, 68, ${0.08 + t * 0.4})`;
  return (
    <div className="rounded px-2 py-1 text-right tabular-nums" style={{ background: bg }}>
      {value.toFixed(1)}
    </div>
  );
}

const total = (e: EsgProfile) => e.scope1 + e.scope2 + e.scope3;

export function EsgView({ esg }: { esg: EsgProfile[] }) {
  const industry = useIndustry();
  const { active, matchesText, toggleFocus, nameToId } = useFocus();
  // Rank the heatmap by total footprint so the worst emitters surface first.
  const rows = [...esg].sort((a, b) => total(b) - total(a));
  const max = {
    s1: Math.max(...esg.map((e) => e.scope1), 0.1),
    s2: Math.max(...esg.map((e) => e.scope2), 0.1),
    s3: Math.max(...esg.map((e) => e.scope3), 0.1),
    tot: Math.max(...esg.map(total), 0.1),
  };

  return (
    <div className="space-y-3">
      <PageHeader title="Environmental ESG" subtitle={`${INDUSTRY_LABEL[industry]} · emissions heatmap, water risk and sourcing ethics`} />
      <Panel title="Scope 1–3 Emissions Heatmap (MtCO2e, TTM)" bodyClassName="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-[var(--text-dim)]">
              <th className="pb-2 font-medium">Company</th>
              <th className="pb-2 text-right font-medium">Scope 1</th>
              <th className="pb-2 text-right font-medium">Scope 2</th>
              <th className="pb-2 text-right font-medium">Scope 3</th>
              <th className="pb-2 text-right font-medium">Total</th>
              <th className="pb-2 text-right font-medium">Water Risk</th>
              <th className="pb-2 text-right font-medium">Ethical Sourcing</th>
              <th className="pb-2 text-right font-medium">Net-Zero Target</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const matched = matchesText(e.company);
              const id = nameToId(e.company);
              return (
              <tr key={e.company} className={`border-t border-[var(--panel-border)] transition-opacity ${focusDim(active, matched)}`}>
                <td className="py-2 font-medium">
                  <span className="inline-flex items-center gap-2">
                    {id && (
                      <button
                        onClick={() => toggleFocus(id)}
                        title={matched ? "Clear focus" : "Focus across all pages"}
                        className={matched ? "text-[var(--accent)]" : "text-[var(--text-faint)] hover:text-[var(--text-dim)]"}
                      >
                        <Crosshair size={13} />
                      </button>
                    )}
                    <CompanyLink name={e.company} className="font-medium" />
                  </span>
                </td>
                <td className="py-1.5">{heat(e.scope1, max.s1)}</td>
                <td className="py-1.5">{heat(e.scope2, max.s2)}</td>
                <td className="py-1.5">{heat(e.scope3, max.s3)}</td>
                <td className="py-1.5 text-right font-semibold tabular-nums">{total(e).toFixed(1)}</td>
                <td className="py-2 text-right"><RiskBadge level={e.waterRisk} /></td>
                <td className="py-2 text-right"><RiskBadge level={e.ethicalSourcing} /></td>
                <td className="py-2 text-right tabular-nums text-[var(--text-dim)]">{e.netZeroTarget}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-3 text-[11px] text-[var(--text-faint)]">
          Cell shading is relative to the column maximum. Water risk reflects scarcity exposure at production sites; ethical
          sourcing reflects mineral supply-loop compliance risk.
        </p>
      </Panel>
    </div>
  );
}
