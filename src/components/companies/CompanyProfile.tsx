"use client";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useApp } from "@/lib/store";
import {
  getCompany,
  getCompanyMeta,
  getFinancialsTTM,
  getFacilities,
  getNews,
  getPatents,
} from "@/lib/provider";
import { INDUSTRY_LABEL } from "@/lib/types";
import { Panel } from "@/components/ui/Panel";
import { StatTile } from "@/components/ui/StatTile";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { NewsFeed } from "@/components/dashboard/NewsFeed";

export function CompanyProfile({ id }: { id: string }) {
  const industry = useApp((s) => s.industry);
  const company = getCompany(industry, id);

  if (!company) {
    return (
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
        <p className="text-sm text-[var(--text-dim)]">
          <span className="font-medium text-[var(--text)]">{id}</span> is not tracked in {INDUSTRY_LABEL[industry]}. Switch
          the Industry Focus in the sidebar, or <Link href="/companies" className="text-[var(--accent)] hover:underline">browse companies</Link>.
        </p>
      </div>
    );
  }

  const m = getCompanyMeta(industry, id);
  const ttm = getFinancialsTTM(industry, id);
  const facilities = getFacilities(industry).filter((f) => f.companyId === id);
  const news = getNews(industry).filter((n) => n.company.toLowerCase() === company.name.toLowerCase()).slice(0, 4);
  const patent = getPatents(industry).find((p) => p.company.toLowerCase() === company.name.toLowerCase());

  return (
    <div className="space-y-3">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/companies" className="text-xs text-[var(--accent)] hover:underline">← Companies</Link>
          </div>
          <h1 className="mt-1 text-xl font-bold">{company.name}</h1>
          <p className="max-w-2xl text-xs text-[var(--text-dim)]">{m.description}</p>
        </div>
        <RiskBadge level={m.exposure} label={`Supply Exposure: ${m.exposure}`} />
      </div>

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
    </div>
  );
}
