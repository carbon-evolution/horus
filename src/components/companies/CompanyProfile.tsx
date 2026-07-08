"use client";
import Link from "next/link";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useIndustry } from "@/lib/industry-context";
import {
  INDUSTRY_LABEL,
  type Company,
  type CompanyMeta,
  type Facility,
  type FinancialTTMPoint,
  type NewsItem,
  type PatentRow,
  type Holdings,
  type Filing,
  type FinancialHistory,
  type Scores,
} from "@/lib/types";
import { Panel } from "@/components/ui/Panel";
import { StatTile } from "@/components/ui/StatTile";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { NewsFeed } from "@/components/dashboard/NewsFeed";
import { CompanyLink } from "@/components/ui/CompanyLink";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { CompanyScorecard } from "./CompanyScorecard";

export function CompanyProfile({
  id,
  company,
  meta: m,
  ttm,
  facilities: allFacilities,
  news: allNews,
  patents: allPatents,
  holdings,
  filings,
  history,
  scores,
  summary,
}: {
  id: string;
  company: Company;
  meta: CompanyMeta;
  ttm: FinancialTTMPoint[];
  facilities: Facility[];
  news: NewsItem[];
  patents: PatentRow[];
  holdings: Holdings | null;
  filings: Filing[];
  history: FinancialHistory | null;
  scores: Scores | null;
  summary: string | null;
}) {
  const industry = useIndustry();

  if (!company) {
    return (
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
        <p className="text-sm text-[var(--text-dim)]">
          <span className="font-medium text-[var(--text)]">{id}</span> is not tracked in {INDUSTRY_LABEL[industry]}. Switch
          the Industry Focus in the sidebar, or <Link href={`/${industry}/companies`} className="text-[var(--accent)] hover:underline">browse companies</Link>.
        </p>
      </div>
    );
  }

  const facilities = allFacilities.filter((f) => f.companyId === id);
  const news = allNews.filter((n) => n.company.toLowerCase() === company.name.toLowerCase()).slice(0, 4);
  const patent = allPatents.find((p) => p.company.toLowerCase() === company.name.toLowerCase());

  // Merge the SEC-filing annual series (R&D / capex / acquisitions) into one
  // year-indexed dataset for the grouped bar chart.
  const spendByYear = new Map<number, { year: number; rnd?: number; capex?: number; acquisitions?: number }>();
  for (const key of ["rnd", "capex", "acquisitions"] as const) {
    for (const p of history?.[key] ?? []) {
      const row = spendByYear.get(p.year) ?? { year: p.year };
      row[key] = p.val;
      spendByYear.set(p.year, row);
    }
  }
  const spendSeries = [...spendByYear.values()].sort((a, b) => a.year - b.year);
  const latestAcq = history?.acquisitions?.at(-1);

  return (
    <div className="space-y-3">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <CompanyLogo id={company.id} name={company.name} size={44} />
          <div>
            <div className="flex items-center gap-2">
              <Link href={`/${industry}/companies`} className="text-xs text-[var(--accent)] hover:underline">← Companies</Link>
            </div>
            <h1 className="mt-1 text-xl font-bold">{company.name}</h1>
            <p className="max-w-2xl text-xs text-[var(--text-dim)]">{m.description}</p>
          </div>
        </div>
        <RiskBadge level={m.exposure} label={`Supply Exposure: ${m.exposure}`} />
      </div>

      {/* AI executive summary */}
      {summary && (
        <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-2)] p-4">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">Executive Summary · AI-assisted</div>
          <p className="text-sm text-[var(--text-dim)]">{summary}</p>
        </div>
      )}

      {/* composite risk scorecard */}
      {scores && <CompanyScorecard scores={scores} />}

      {/* stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Market Cap" value={company.marketCap} icon="DollarSign" />
        <StatTile label="Ticker" value={company.ticker} icon="Hash" accent="#a78bfa" />
        <StatTile label="CEO" value={m.ceo} icon="User" accent="#22d3ee" />
        <StatTile label="Headquarters" value={m.hq} icon="MapPin" accent="#34d399" />
        <StatTile label="Employees" value={m.employees} icon="Users" accent="#f59e0b" />
        <StatTile label="Founded" value={m.founded} icon="Calendar" accent="#f472b6" />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {/* financials TTM */}
        <Panel title="Financial Trend (TTM, $B)" className="xl:col-span-2">
          {ttm.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={ttm} margin={{ top: 6, right: 12, bottom: 0, left: -14 }}>
                <XAxis dataKey="period" tick={{ fill: "#8695ab", fontSize: 10 }} />
                <YAxis tick={{ fill: "#5b6a80", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#0d1420", border: "1px solid #1e2a3d", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="profit" stroke="#34d399" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="rnd" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--text-faint)]">No financial series available.</p>
          )}
        </Panel>

        {/* segments */}
        <Panel title="Revenue by Segment">
          <div className="space-y-3">
            {m.segments.map((s) => (
              <div key={s.name}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{s.name}</span>
                  <span className="text-[var(--text-dim)]">{s.share}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--panel-2)]">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${s.share}%` }} />
                </div>
              </div>
            ))}
            <div className="mt-4 flex items-center justify-between border-t border-[var(--panel-border)] pt-3 text-xs">
              <span className="text-[var(--text-dim)]">Operational Health</span>
              <span className="font-semibold" style={{ color: m.healthScore >= 80 ? "var(--risk-low)" : m.healthScore >= 60 ? "var(--risk-med)" : "var(--risk-high)" }}>
                {m.healthScore}/100
              </span>
            </div>
          </div>
        </Panel>
      </div>

      {/* historical spending, R&D & acquisitions — parsed from SEC XBRL filings */}
      {spendSeries.length > 0 && (
        <Panel title="Historical Spending, R&D & Acquisitions ($B)">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr]">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={spendSeries} margin={{ top: 6, right: 12, bottom: 0, left: -14 }}>
                <XAxis dataKey="year" tick={{ fill: "#8695ab", fontSize: 10 }} />
                <YAxis tick={{ fill: "#5b6a80", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#0d1420", border: "1px solid #1e2a3d", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="rnd" name="R&D" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                <Bar dataKey="capex" name="Capex" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="acquisitions" name="Acquisitions" fill="#a78bfa" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-col justify-center gap-3 text-sm">
              {history?.rnd?.at(-1) && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-[var(--text-faint)]">Latest R&D ({history.rnd.at(-1)!.year})</div>
                  <div className="text-lg font-bold text-[#f59e0b]">${history.rnd.at(-1)!.val.toFixed(1)}B</div>
                </div>
              )}
              {history?.capex?.at(-1) && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-[var(--text-faint)]">Latest Capex ({history.capex.at(-1)!.year})</div>
                  <div className="text-lg font-bold text-[#3b82f6]">${history.capex.at(-1)!.val.toFixed(1)}B</div>
                </div>
              )}
              {latestAcq && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-[var(--text-faint)]">Latest Acquisitions ({latestAcq.year})</div>
                  <div className="text-lg font-bold text-[#a78bfa]">${latestAcq.val.toFixed(1)}B</div>
                </div>
              )}
              <p className="pt-1 text-[10px] text-[var(--text-faint)]">Annual figures from {history?.source ?? "company filings"}.</p>
            </div>
          </div>
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {/* facilities */}
        <Panel title={`Facilities (${facilities.length})`}>
          {facilities.length ? (
            <ul className="space-y-2 text-sm">
              {facilities.map((f) => (
                <li key={f.id} className="flex items-center justify-between">
                  <span>{f.name}</span>
                  <span className="text-[11px] capitalize text-[var(--text-dim)]">{f.type} · {f.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--text-faint)]">No tracked facilities.</p>
          )}
        </Panel>

        {/* patents */}
        <Panel title="Patents & Innovation">
          {patent ? (
            <div>
              <div className="flex items-baseline gap-4">
                <div><div className="text-xl font-bold">{patent.total.toLocaleString()}</div><div className="text-[10px] text-[var(--text-faint)]">Total</div></div>
                <div><div className="text-xl font-bold">{patent.pending.toLocaleString()}</div><div className="text-[10px] text-[var(--text-faint)]">Pending</div></div>
              </div>
              <div className="mt-3 space-y-2">
                {patent.categories.map((c) => {
                  const max = Math.max(...patent.categories.map((x) => x.count), 1);
                  return (
                    <div key={c.name}>
                      <div className="mb-0.5 flex justify-between text-[11px]"><span>{c.name}</span><span className="text-[var(--text-dim)]">{c.count}</span></div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--panel-2)]"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${(c.count / max) * 100}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-faint)]">No patent data.</p>
          )}
        </Panel>

        {/* news */}
        <Panel title="Recent News">
          {news.length ? <NewsFeed news={news} /> : <p className="text-sm text-[var(--text-faint)]">No recent company-specific news.</p>}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {/* corporate structure & investments (Wikidata) */}
        <Panel title="Corporate Structure & Investments">
          {holdings && (holdings.parent || holdings.subsidiaries.length || holdings.investments.length) ? (
            <div className="space-y-3 text-sm">
              {holdings.parent && (
                <div>
                  <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--text-faint)]">Parent</div>
                  <CompanyLink name={holdings.parent} />
                </div>
              )}
              {holdings.subsidiaries.length > 0 && (
                <div>
                  <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--text-faint)]">Subsidiaries ({holdings.subsidiaries.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {holdings.subsidiaries.map((s) => (
                      <span key={s} className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-2)] px-2 py-0.5 text-[12px]"><CompanyLink name={s} /></span>
                    ))}
                  </div>
                </div>
              )}
              {holdings.investments.length > 0 && (
                <div>
                  <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--text-faint)]">Holdings & Investments ({holdings.investments.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {holdings.investments.map((s) => (
                      <span key={s} className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-2)] px-2 py-0.5 text-[12px]"><CompanyLink name={s} /></span>
                    ))}
                  </div>
                </div>
              )}
              <p className="pt-1 text-[10px] text-[var(--text-faint)]">Ownership links via Wikidata (parent, subsidiaries, owned entities).</p>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-faint)]">No public ownership links recorded.</p>
          )}
        </Panel>

        {/* recent regulatory filings incl. M&A (SEC EDGAR 8-K items / Korea DART) */}
        <Panel title="Recent Filings & M&A">
          {filings.length ? (
            <ul className="divide-y divide-[var(--panel-border)] text-sm">
              {filings.map((f, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate">{f.label}</div>
                    <div className="text-[11px] text-[var(--text-faint)]">{f.form} · {f.date}</div>
                  </div>
                  {f.href && (
                    <Link href={f.href} target="_blank" className="shrink-0 text-xs text-[var(--accent)] hover:underline">{f.form === "DART" ? "DART" : "EDGAR"} →</Link>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--text-faint)]">No regulatory filings on record (private, or a jurisdiction not yet wired).</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
