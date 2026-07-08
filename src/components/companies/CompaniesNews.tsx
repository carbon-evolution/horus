"use client";
import { useState } from "react";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type NewsItem, type RiskLevel } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { AiInsight } from "@/components/ui/AiInsight";
import { NewsFeed } from "@/components/dashboard/NewsFeed";
import { COUNTRY_COORD } from "@/lib/maritime";
import { WORLD_LAND_PATH } from "@/lib/world-land-path";

const W = 720, H = 360;
const mx = (lng: number) => ((lng + 180) / 360) * W;
const my = (lat: number) => ((90 - lat) / 180) * H;
const IMPACT_COLOR: Record<RiskLevel, string> = { low: "#34d399", medium: "#f59e0b", high: "#f87171" };
const IMPACT_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };

// News items carry a country-level geo hint (news_enrich). Cluster events per
// country and plot them; "Global" items have no anchor and stay off-map.
function EventMap({ news }: { news: NewsItem[] }) {
  const byGeo = new Map<string, { count: number; worst: RiskLevel; heads: string[] }>();
  let global = 0;
  for (const n of news) {
    const geo = n.geo === "United States" ? "USA" : n.geo;
    if (!geo || geo === "Global" || !COUNTRY_COORD[geo]) { global++; continue; }
    const g = byGeo.get(geo) ?? { count: 0, worst: "low" as RiskLevel, heads: [] };
    g.count++;
    if (IMPACT_RANK[n.impact] > IMPACT_RANK[g.worst]) g.worst = n.impact;
    if (g.heads.length < 4) g.heads.push(n.headline);
    byGeo.set(geo, g);
  }
  const spots = [...byGeo.entries()];
  const max = Math.max(...spots.map(([, g]) => g.count), 1);
  return (
    <div>
      <div className="relative mx-auto aspect-[2/1] w-full overflow-hidden rounded-lg border border-[var(--panel-border)] bg-[var(--panel-2)]">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
          <path d={WORLD_LAND_PATH} fill="#1b2740" fillOpacity={0.85} stroke="#2b3b5a" strokeWidth={0.4} />
          {spots.map(([geo, g]) => {
            const [lat, lng] = COUNTRY_COORD[geo];
            const x = mx(lng), y = my(lat);
            const r = 5 + Math.sqrt(g.count / max) * 13;
            const color = IMPACT_COLOR[g.worst];
            return (
              <g key={geo}>
                <circle cx={x} cy={y} r={r} fill={color} fillOpacity={0.18} stroke={color} strokeOpacity={0.7} strokeWidth={0.8}>
                  <title>{`${geo === "USA" ? "United States" : geo} — ${g.count} event${g.count > 1 ? "s" : ""} (worst impact: ${g.worst})\n• ${g.heads.join("\n• ")}`}</title>
                </circle>
                <text x={x} y={y + 2.5} textAnchor="middle" fontSize={8} fontWeight={600} fill="#e2e8f0">{g.count}</text>
                <text x={x} y={y - r - 3} textAnchor="middle" fontSize={9} fill="#8695ab">{geo === "USA" ? "United States" : geo}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[var(--text-dim)]">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#f87171]" />High impact</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#f59e0b]" />Medium</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#34d399]" />Low</span>
        <span className="ml-auto text-[var(--text-faint)]">Bubble = events per country (worst impact colors it){global ? ` · ${global} global/unlocated events not shown` : ""}</span>
      </div>
    </div>
  );
}

const NEG = /restrict|export control|tighten|concern|disruption|ban|tension|glut|risk/i;
const POS = /unveil|announce|invest|expand|partner|secure|deal|supply|launch|record|growth/i;

function sentiment(n: NewsItem): "positive" | "neutral" | "negative" {
  if (n.sentiment) return n.sentiment;
  if (NEG.test(n.headline)) return "negative";
  if (POS.test(n.headline)) return "positive";
  return "neutral";
}

export function CompaniesNews({ news }: { news: NewsItem[] }) {
  const industry = useIndustry();
  const [cat, setCat] = useState("all");
  const counts = { positive: 0, neutral: 0, negative: 0 };
  for (const n of news) counts[sentiment(n)]++;

  const categories = ["all", ...Array.from(new Set(news.map((n) => n.category ?? "general"))).sort()];
  const shown = cat === "all" ? news : news.filter((n) => (n.category ?? "general") === cat);

  const highImpact = news.filter((n) => n.impact === "high").length;
  const topCat = Object.entries(news.reduce<Record<string, number>>((a, n) => ((a[n.category ?? "general"] = (a[n.category ?? "general"] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1])[0];
  const summary =
    `${news.length} tracked events in ${INDUSTRY_LABEL[industry]}: ${counts.negative} negative vs ${counts.positive} positive in sentiment, with ${highImpact} rated high market/policy impact. ` +
    (topCat ? `${topCat[0]} dominates the current cycle (${topCat[1]} events). ` : "") +
    (counts.negative > counts.positive ? "Net-negative sentiment warrants closer monitoring of affected suppliers and facilities." : "Sentiment skews constructive, but export-control and disruption headlines remain the key risks to watch.");

  return (
    <div className="space-y-3">
      <PageHeader title="News & Events" subtitle={`${INDUSTRY_LABEL[industry]} · real-time risk-tagged event feed`} />
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3">
          <div className="text-lg font-bold" style={{ color: "var(--pos)" }}>{counts.positive}</div>
          <div className="text-[11px] text-[var(--text-dim)]">Positive</div>
        </div>
        <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3">
          <div className="text-lg font-bold text-[var(--text-dim)]">{counts.neutral}</div>
          <div className="text-[11px] text-[var(--text-dim)]">Neutral</div>
        </div>
        <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3">
          <div className="text-lg font-bold" style={{ color: "var(--neg)" }}>{counts.negative}</div>
          <div className="text-[11px] text-[var(--text-dim)]">Negative</div>
        </div>
      </div>
      <AiInsight text={summary} />
      <Panel title="World Event Map">
        <EventMap news={news} />
      </Panel>
      <Panel title="Event Feed">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                cat === c
                  ? "border-transparent bg-[var(--accent)] text-white"
                  : "border-[var(--panel-border)] text-[var(--text-dim)] hover:text-[var(--text)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        {shown.length ? <NewsFeed news={shown} /> : <p className="text-sm text-[var(--text-faint)]">No events in this category.</p>}
      </Panel>
    </div>
  );
}
