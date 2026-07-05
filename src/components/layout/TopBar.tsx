"use client";
import { Search, Star, Bell, Download, Settings, User } from "lucide-react";

export function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-[var(--panel-border)] bg-[var(--bg-elevated)] px-5">
      {/* Global search */}
      <div className="relative w-full max-w-md">
        <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-faint)]" />
        <input
          type="text"
          placeholder="Search companies, suppliers, materials, countries…"
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--panel-2)] py-2 pr-3 pl-9 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[var(--text-dim)] hover:bg-white/5 hover:text-[var(--text)]">
          <Star size={15} /> Watchlist
        </button>
        <button className="relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[var(--text-dim)] hover:bg-white/5 hover:text-[var(--text)]">
          <Bell size={15} /> Alerts
          <span className="ml-0.5 rounded-full bg-[var(--risk-high)] px-1.5 py-0.5 text-[10px] font-semibold text-white">12</span>
        </button>
        <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[var(--text-dim)] hover:bg-white/5 hover:text-[var(--text)]">
          <Download size={15} /> Downloads
        </button>
        <button className="rounded-lg p-2 text-[var(--text-dim)] hover:bg-white/5 hover:text-[var(--text)]">
          <Settings size={16} />
        </button>
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--panel)] ring-1 ring-[var(--panel-border)]">
          <User size={16} className="text-[var(--text-dim)]" />
        </button>
      </div>
    </header>
  );
}
