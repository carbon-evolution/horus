"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type MarketIntel } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";

function utilColor(pct: number) {
  return pct >= 95 ? "var(--risk-high)" : pct >= 80 ? "var(--risk-med)" : "var(--risk-low)";
}

function pctColor(v: number) {
  return v > 0 ? "var(--pos)" : v < 0 ? "var(--neg)" : "var(--text-faint)";
}
function fmtPct(v: number) {
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}

export function MarketIntelView({ marketIntel: m }: { marketIntel: MarketIntel }) {
  const industry = useIndustry();
  const snap = m.marketSnapshot;

  return (
    <div className="space-y-3">
      <PageHeader title="Market Intelligence" subtitle={`${INDUSTRY_LABEL[industry]} · live equity snapshot, inventories, lead times and capacity utilization`} />

      {snap && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <Panel title="Sector Snapshot (live quotes)">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--text-faint)]">Total Market Cap</div>
                <div className="text-2xl font-semibold tabular-nums">{snap.totalMarketCap}</div>
                <div className="text-[10px] text-[var(--text-faint)]">{snap.tracked} companies tracked</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--text-faint)]">Avg YTD</div>
                <div className="text-2xl font-semibold tabular-nums" style={{ color: pctColor(snap.avgYtdPct) }}>{fmtPct(snap.avgYtdPct)}</div>
                <div className="text-[10px] text-[var(--text-faint)]">across tracked names</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--text-faint)]">24h Breadth</div>
                <div className="text-sm tabular-nums">
                  <span style={{ color: "var(--pos)" }}>▲ {snap.advancers}</span>{" · "}
                  <span style={{ color: "var(--neg)" }}>▼ {snap.decliners}</span>
                </div>
                <div className="text-[10px] text-[var(--text-faint)]">advancers / decliners</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--text-faint)]">Top-3 Concentration</div>
                <div className="text-sm font-semibold tabular-nums" style={{ color: snap.top3ConcentrationPct >= 60 ? "var(--risk-high)" : snap.top3ConcentrationPct >= 40 ? "var(--risk-med)" : "var(--risk-low)" }}>{snap.top3ConcentrationPct}%</div>
                <div className="text-[10px] text-[var(--text-faint)]">of sector cap in 3 names</div>
              </div>
            </div>
          </Panel>

          <Panel title="Top Movers (24h)">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="mb-1 text-[10px] uppercase tracking-wide" style={{ color: "var(--pos)" }}>Gainers</div>
                <ul className="space-y-1.5">
                  {snap.topGainers.map((c) => (
                    <li key={c.id} className="flex justify-between">
                      <span className="text-[var(--text-dim)]">{c.ticker || c.name}</span>
                      <span className="tabular-nums" style={{ color: pctColor(c.changePct) }}>{fmtPct(c.changePct)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-1 text-[10px] uppercase tracking-wide" style={{ color: "var(--neg)" }}>Losers</div>
                <ul className="space-y-1.5">
                  {snap.topLosers.map((c) => (
                    <li key={c.id} className="flex justify-between">
                      <span className="text-[var(--text-dim)]">{c.ticker || c.name}</span>
                      <span className="tabular-nums" style={{ color: pctColor(c.changePct) }}>{fmtPct(c.changePct)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Panel>

          <Panel title="Market-Cap Leaders">
            <div className="space-y-2.5">
              {snap.leaders.map((c) => (
                <div key={c.id}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{c.name} <span className="text-[var(--text-faint)]">{c.ticker}</span></span>
                    <span className="tabular-nums text-[var(--text-dim)]">{c.marketCap} · {c.capSharePct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--panel-2)]">
                    <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${c.capSharePct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Panel title="Days of Inventory (industry avg)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={m.inventoryRatio} margin={{ top: 6, right: 10, bottom: 0, left: -16 }}>
              <XAxis dataKey="period" tick={{ fill: "#8695ab", fontSize: 10 }} />
              <YAxis tick={{ fill: "#5b6a80", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#0d1420", border: "1px solid #1e2a3d", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2.5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Delivery Lead Times">
          <ul className="space-y-2.5">
            {m.leadTimes.map((l) => (
              <li key={l.component} className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-dim)]">{l.component}</span>
                <span className="tabular-nums">
                  {l.weeks} wks{" "}
                  <span className="text-xs" style={{ color: l.delta > 0 ? "var(--neg)" : l.delta < 0 ? "var(--pos)" : "var(--text-faint)" }}>
                    {l.delta > 0 ? `▲ +${l.delta}` : l.delta < 0 ? `▼ ${l.delta}` : "—"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] text-[var(--text-faint)]">Delta vs prior quarter (weeks).</p>
        </Panel>

        <Panel title="Capacity Utilization">
          <div className="space-y-3">
            {m.utilization.map((u) => (
              <div key={u.segment}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{u.segment}</span>
                  <span className="tabular-nums" style={{ color: utilColor(u.pct) }}>{u.pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--panel-2)]">
                  <div className="h-full rounded-full" style={{ width: `${u.pct}%`, background: utilColor(u.pct) }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-[var(--text-faint)]">≥95% signals allocation risk; ≤70% signals oversupply.</p>
        </Panel>
      </div>
    </div>
  );
}
