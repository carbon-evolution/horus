"use client";
import type { NewsItem, RiskLevel } from "@/lib/types";
import { useFocus, focusDim } from "@/lib/focus";
import { relativeAgo } from "@/lib/relative-time";

const IMPACT_BG: Record<RiskLevel, string> = {
  high: "var(--risk-high)",
  medium: "var(--risk-med)",
  low: "var(--risk-low)",
};

export function NewsFeed({ news }: { news: NewsItem[] }) {
  const { active, matchesText } = useFocus();
  return (
    <div className="space-y-3">
      {news.map((n) => (
        <div key={n.id} className={`flex gap-3 transition-opacity ${focusDim(active, matchesText(n.company) || matchesText(n.headline))}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--panel-2)] text-[10px] font-semibold text-[var(--text-dim)]">
            {n.company.slice(0, 3).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] leading-snug">{n.headline}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                style={{ background: IMPACT_BG[n.impact] }}
              >
                {n.impactLabel}
              </span>
              {n.category && (
                <span className="rounded border border-[var(--panel-border)] px-1.5 py-0.5 text-[10px] text-[var(--text-dim)]">
                  {n.category}{typeof n.impactScore === "number" ? ` · ${n.impactScore}` : ""}
                </span>
              )}
              {n.geo && n.geo !== "Global" && (
                <span className="text-[10px] text-[var(--text-faint)]">{n.geo}</span>
              )}
              <span className="text-[10px] text-[var(--text-faint)]" title={n.date} suppressHydrationWarning>
                {n.date ? relativeAgo(n.date) : n.ago}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
