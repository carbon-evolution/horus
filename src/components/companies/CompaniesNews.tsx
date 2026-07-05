"use client";
import { useApp } from "@/lib/store";
import { getNews } from "@/lib/fixtures";
import { INDUSTRY_LABEL, type NewsItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { NewsFeed } from "@/components/dashboard/NewsFeed";

const NEG = /restrict|export control|tighten|concern|disruption|ban|tension|glut|risk/i;
const POS = /unveil|announce|invest|expand|partner|secure|deal|supply|launch|record|growth/i;

function sentiment(n: NewsItem): "positive" | "neutral" | "negative" {
  if (n.sentiment) return n.sentiment;
  if (NEG.test(n.headline)) return "negative";
  if (POS.test(n.headline)) return "positive";
  return "neutral";
}

export function CompaniesNews() {
  const industry = useApp((s) => s.industry);
  const news = getNews(industry);
  const counts = { positive: 0, neutral: 0, negative: 0 };
  for (const n of news) counts[sentiment(n)]++;

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
      <Panel title="Event Feed">
        <NewsFeed news={news} />
      </Panel>
    </div>
  );
}
