"use client";
import Link from "next/link";
import { Star, Crosshair } from "lucide-react";
import { useApp } from "@/lib/store";
import { getCompanies, getCompanyMeta } from "@/lib/fixtures";
import { INDUSTRY_LABEL } from "@/lib/types";
import { useFocus, focusDim } from "@/lib/focus";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { RiskBadge } from "@/components/ui/RiskBadge";

export function WatchlistView() {
  const industry = useApp((s) => s.industry);
  const watchlist = useApp((s) => s.watchlist);
  const toggleWatch = useApp((s) => s.toggleWatch);
  const { focusId, active, toggleFocus } = useFocus();
  const companies = getCompanies(industry);
  const watched = companies.filter((c) => watchlist.includes(c.id));
  const rest = companies.filter((c) => !watchlist.includes(c.id));

  const Row = ({ id }: { id: string }) => {
    const c = companies.find((x) => x.id === id)!;
    const m = getCompanyMeta(industry, c.id);
    const on = watchlist.includes(c.id);
    const focused = c.id === focusId;
    return (
      <li className={`flex items-center justify-between gap-3 py-2.5 transition-opacity ${focusDim(active, focused)}`}>
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => toggleWatch(c.id)}
            title={on ? "Remove from watchlist" : "Add to watchlist"}
            className={on ? "text-[var(--risk-med)]" : "text-[var(--text-faint)] hover:text-[var(--text-dim)]"}
          >
            <Star size={16} fill={on ? "currentColor" : "none"} />
          </button>
          <button
            onClick={() => toggleFocus(c.id)}
            title={focused ? "Clear focus" : "Focus across all pages"}
            className={focused ? "text-[var(--accent)]" : "text-[var(--text-faint)] hover:text-[var(--text-dim)]"}
          >
            <Crosshair size={14} />
          </button>
          <div className="min-w-0">
            <Link href={`/companies/${c.id}`} className="text-sm font-medium text-[var(--accent)] hover:underline">{c.name}</Link>
            <div className="text-[11px] text-[var(--text-faint)]">{c.ticker} · {m.hq}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <span className="text-sm tabular-nums">{c.marketCap}</span>
          <span className="w-20 text-right text-sm tabular-nums" style={{ color: c.changeYtd >= 0 ? "var(--pos)" : "var(--neg)" }}>
            {c.changeYtd === 0 ? "—" : `${c.changeYtd > 0 ? "+" : ""}${c.changeYtd.toFixed(1)}%`}
          </span>
          <RiskBadge level={m.exposure} />
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-3">
      <PageHeader title="Watchlist" subtitle={`${INDUSTRY_LABEL[industry]} · pin companies to monitor — persists across sessions`} />

      <Panel title={`Watched (${watched.length})`}>
        {watched.length ? (
          <ul className="divide-y divide-[var(--panel-border)]">{watched.map((c) => <Row key={c.id} id={c.id} />)}</ul>
        ) : (
          <p className="py-4 text-center text-sm text-[var(--text-faint)]">Nothing pinned yet — star a company below.</p>
        )}
      </Panel>

      <Panel title="All Companies">
        <ul className="divide-y divide-[var(--panel-border)]">{rest.map((c) => <Row key={c.id} id={c.id} />)}</ul>
      </Panel>
    </div>
  );
}
