"use client";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type GeoRisk, type Chokepoint } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { RiskBadge } from "@/components/ui/RiskBadge";

function tensionColor(t: number) {
  return t >= 70 ? "var(--risk-high)" : t >= 45 ? "var(--risk-med)" : "var(--risk-low)";
}

export function GeoRiskView({ geo: allGeo, chokepoints }: { geo: GeoRisk[]; chokepoints: Chokepoint[] }) {
  const industry = useIndustry();
  const geo = [...allGeo].sort((a, b) => b.tension - a.tension);

  return (
    <div className="space-y-3">
      <PageHeader title="Geopolitical Risk" subtitle={`${INDUSTRY_LABEL[industry]} · sovereign tension, chokepoints and localization`} />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Panel title="Country Exposure" className="xl:col-span-2" bodyClassName="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-[var(--text-dim)]">
                <th className="pb-2 font-medium">Country</th>
                <th className="pb-2 font-medium">Strategic Role</th>
                <th className="pb-2 font-medium">Tension</th>
                <th className="pb-2 text-right font-medium">Localization</th>
                <th className="pb-2 font-medium">Chokepoints</th>
              </tr>
            </thead>
            <tbody>
              {geo.map((g) => (
                <tr key={g.country} className="border-t border-[var(--panel-border)] align-top">
                  <td className="py-2.5 whitespace-nowrap font-medium">{g.flag} {g.country}</td>
                  <td className="max-w-xs py-2.5 text-[var(--text-dim)]">{g.role}</td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--panel-2)]">
                        <div className="h-full rounded-full" style={{ width: `${g.tension}%`, background: tensionColor(g.tension) }} />
                      </div>
                      <span className="text-xs tabular-nums" style={{ color: tensionColor(g.tension) }}>{g.tension}</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-[var(--text-dim)]">{g.localization}%</td>
                  <td className="py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {g.chokepoints.length ? g.chokepoints.map((c) => (
                        <span key={c} className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-2)] px-2 py-0.5 text-[10px] text-[var(--text-dim)]">{c}</span>
                      )) : <span className="text-[10px] text-[var(--text-faint)]">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Global Shipping Chokepoints">
          <ul className="space-y-3">
            {chokepoints.map((c) => (
              <li key={c.name} className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-[11px] text-[var(--text-dim)]">{c.share}</div>
                </div>
                <RiskBadge level={c.risk} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
