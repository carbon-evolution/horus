"use client";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { getCompanies, getCompanyMeta } from "@/lib/provider";
import { INDUSTRY_LABEL } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { RiskBadge } from "@/components/ui/RiskBadge";

function healthColor(n: number) {
  return n >= 80 ? "var(--risk-low)" : n >= 60 ? "var(--risk-med)" : "var(--risk-high)";
}

export function CompaniesOverview() {
  const industry = useApp((s) => s.industry);
  const companies = getCompanies(industry).slice(0, 10);

  return (
    <div>
      <PageHeader title="Top 10 Overview" subtitle={`${INDUSTRY_LABEL[industry]} · leading companies at a glance`} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {companies.map((c) => {
          const m = getCompanyMeta(industry, c.id);
          const up = c.changeYtd >= 0;
          return (
            <Link
              key={c.id}
              href={`/companies/${c.id}`}
              className="flex flex-col rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4 transition-colors hover:border-[var(--accent)]/50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-[10px] text-[var(--text-faint)]">{c.ticker} · {m.hq}</div>
                </div>
                <RiskBadge level={m.exposure} label={`${m.exposure[0].toUpperCase()}${m.exposure.slice(1)} exp.`} />
              </div>

              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-lg font-bold">{c.marketCap}</div>
                  <div className="text-[10px] text-[var(--text-faint)]">Market Cap</div>
                </div>
                <div className="text-right">
                  <div className="text-sm tabular-nums" style={{ color: up ? "var(--pos)" : "var(--neg)" }}>
                    {c.changeYtd === 0 ? "Private" : `${up ? "+" : ""}${c.changeYtd.toFixed(1)}% YTD`}
                  </div>
                  <div className="text-[10px] text-[var(--text-faint)]">{c.price === "—" ? "—" : `$${c.price}`}</div>
                </div>
              </div>

              {/* health */}
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--text-dim)]">
                  <span>Operational Health</span>
                  <span style={{ color: healthColor(m.healthScore) }}>{m.healthScore}/100</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--panel-2)]">
                  <div className="h-full rounded-full" style={{ width: `${m.healthScore}%`, background: healthColor(m.healthScore) }} />
                </div>
              </div>

              {/* segments */}
              <div className="mt-3 flex flex-wrap gap-1">
                {m.segments.slice(0, 3).map((s) => (
                  <span key={s.name} className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-2)] px-2 py-0.5 text-[10px] text-[var(--text-dim)]">
                    {s.name} {s.share}%
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
