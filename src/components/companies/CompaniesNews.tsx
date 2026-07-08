"use client";
import { useState } from "react";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type NewsItem, type RiskLevel, type Company, type Facility } from "@/lib/types";
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

// Display name + one alias pass so geo hints and facility country strings
// land in the same cluster ("USA" / "United States", "UK" / "United Kingdom").
const COUNTRY_ALIAS: Record<string, string> = { "United States": "USA", "United Kingdom": "UK" };

type HqLookup = Record<string, { country: string; lat: number; lng: number }>;

// Country anchor for an event: the enrichment geo hint (news_enrich) wins,
// else the story's company HQ country. Null = unlocatable (stays off-map).
function anchorOf(n: NewsItem, hqByCompany: HqLookup): { key: string; coord: [number, number] } | null {
  const geo = n.geo && n.geo !== "Global" ? (COUNTRY_ALIAS[n.geo] ?? n.geo) : undefined;
  if (geo && COUNTRY_COORD[geo]) return { key: geo, coord: COUNTRY_COORD[geo] };
  const hq = hqByCompany[n.company.toLowerCase()];
  if (hq) {
    const key = COUNTRY_ALIAS[hq.country] ?? hq.country;
    return { key, coord: COUNTRY_COORD[key] ?? [hq.lat, hq.lng] };
  }
  return null;
}

const displayName = (key: string) => (key === "USA" ? "United States" : key === "UK" ? "United Kingdom" : key);

// Clickable event map: one bubble per country, clicking filters the feed below.
function EventMap({
  news,
  hqByCompany,
  selected,
  onSelectAction,
}: {
  news: NewsItem[];
  hqByCompany: HqLookup;
  selected: string | null;
  onSelectAction: (key: string | null) => void;
}) {
  const byGeo = new Map<string, { count: number; worst: RiskLevel; lat: number; lng: number }>();
  let global = 0;
  for (const n of news) {
    const a = anchorOf(n, hqByCompany);
    if (!a) { global++; continue; }
    const g = byGeo.get(a.key) ?? { count: 0, worst: "low" as RiskLevel, lat: a.coord[0], lng: a.coord[1] };
    g.count++;
    if (IMPACT_RANK[n.impact] > IMPACT_RANK[g.worst]) g.worst = n.impact;
    byGeo.set(a.key, g);
  }
  const spots = [...byGeo.entries()];
  const max = Math.max(...spots.map(([, g]) => g.count), 1);
  return (
    <div>
      {/* deliberately narrow so the filtered feed stays visible below the map */}
      <div className="relative mx-auto aspect-[2/1] w-full max-w-2xl overflow-hidden rounded-lg border border-[var(--panel-border)] bg-[var(--panel-2)]">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
          <path d={WORLD_LAND_PATH} fill="#1b2740" fillOpacity={0.85} stroke="#2b3b5a" strokeWidth={0.4} />
          {spots.map(([geo, g]) => {
            const x = mx(g.lng), y = my(g.lat);
            const r = 6 + Math.sqrt(g.count / max) * 13;
            const color = IMPACT_COLOR[g.worst];
            const isSel = geo === selected;
            const dim = selected !== null && !isSel;
            return (
              <g
                key={geo}
                opacity={dim ? 0.35 : 1}
                className="cursor-pointer"
                onClick={() => onSelectAction(isSel ? null : geo)}
              >
                <circle cx={x} cy={y} r={r + 6} fill="transparent" />
                {isSel && <circle cx={x} cy={y} r={r + 3} fill="none" stroke="#e2e8f0" strokeWidth={1} strokeDasharray="2 2" />}
                <circle cx={x} cy={y} r={r} fill={color} fillOpacity={0.18} stroke={color} strokeOpacity={0.7} strokeWidth={isSel ? 1.6 : 0.8}>
                  <title>{`${displayName(geo)} — ${g.count} event${g.count > 1 ? "s" : ""} (worst impact: ${g.worst}) — click to filter the feed`}</title>
                </circle>
                <text x={x} y={y + 2.5} textAnchor="middle" fontSize={8} fontWeight={600} fill="#e2e8f0" pointerEvents="none">{g.count}</text>
                <text x={x} y={y - r - 3} textAnchor="middle" fontSize={9} fill={isSel ? "#e2e8f0" : "#8695ab"} pointerEvents="none">{displayName(geo)}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[var(--text-dim)]">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#f87171]" />High impact</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#f59e0b]" />Medium</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#34d399]" />Low</span>
        <span className="ml-auto text-[var(--text-faint)]">Click a bubble to filter the feed{global ? ` · ${global} global/unlocated events` : ""}</span>
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

export function CompaniesNews({ news, companies, facilities }: { news: NewsItem[]; companies: Company[]; facilities: Facility[] }) {
  const industry = useIndustry();
  const [cat, setCat] = useState("all");
  const [geoSel, setGeoSel] = useState<string | null>(null);

  // company name (lowercased) → HQ country + coords, for events without a geo hint
  const hqByCompany: HqLookup = {};
  for (const c of companies) {
    const hq = facilities.find((f) => f.companyId === c.id && f.type === "hq") ?? facilities.find((f) => f.companyId === c.id);
    if (hq) hqByCompany[c.name.toLowerCase()] = { country: hq.country, lat: hq.lat, lng: hq.lng };
  }
  const counts = { positive: 0, neutral: 0, negative: 0 };
  for (const n of news) counts[sentiment(n)]++;

  const categories = ["all", ...Array.from(new Set(news.map((n) => n.category ?? "general"))).sort()];
  const shown = news.filter(
    (n) =>
      (cat === "all" || (n.category ?? "general") === cat) &&
      (geoSel === null || anchorOf(n, hqByCompany)?.key === geoSel),
  );

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
        <EventMap news={news} hqByCompany={hqByCompany} selected={geoSel} onSelectAction={setGeoSel} />
      </Panel>
      <Panel title={`Event Feed${geoSel ? ` — ${displayName(geoSel)}` : ""}`}>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {geoSel && (
            <button
              onClick={() => setGeoSel(null)}
              className="rounded-full border border-[var(--accent)]/60 bg-[var(--accent)]/15 px-2.5 py-1 text-xs text-[var(--accent)]"
              title="Clear country filter"
            >
              {displayName(geoSel)} ✕
            </button>
          )}
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
        {shown.length ? <NewsFeed news={shown} /> : <p className="text-sm text-[var(--text-faint)]">No events match the current filters.</p>}
      </Panel>
    </div>
  );
}
