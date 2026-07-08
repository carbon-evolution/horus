"use client";
import { useState } from "react";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type NewsItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { AiInsight } from "@/components/ui/AiInsight";
import { NewsFeed } from "@/components/dashboard/NewsFeed";

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
