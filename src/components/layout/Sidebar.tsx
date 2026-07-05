"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { NAV, DATA_SOURCES } from "@/lib/nav";
import { INDUSTRIES, INDUSTRY_LABEL } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { useIndustry } from "@/lib/industry-context";

function IndustrySelector() {
  const industry = useIndustry();
  const router = useRouter();
  const pathname = usePathname();
  const switchTo = (i: string) => {
    const rest = pathname.replace(/^\/[^/]+/, ""); // strip current industry segment
    router.push(`/${i}${rest}`);
  };
  return (
    <div className="px-3">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">
        Industry Focus
      </div>
      <div className="grid grid-cols-3 gap-1 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-2)] p-1">
        {INDUSTRIES.map((i) => (
          <button
            key={i}
            onClick={() => switchTo(i)}
            className={`rounded-md px-1 py-1.5 text-[11px] font-medium transition-colors ${
              industry === i
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-dim)] hover:bg-white/5"
            }`}
          >
            {i === "semiconductor" ? "Semi" : i === "ai" ? "AI" : "Battery"}
          </button>
        ))}
      </div>
      <div className="mt-1 text-center text-[10px] text-[var(--text-faint)]">
        {INDUSTRY_LABEL[industry]}
      </div>
    </div>
  );
}

function DataSourceHealth() {
  return (
    <div className="px-3">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">
        Data Sources
      </div>
      <div className="grid grid-cols-2 gap-1">
        {DATA_SOURCES.slice(0, 6).map((s) => (
          <div key={s} className="flex items-center gap-1.5 rounded-md bg-[var(--panel-2)] px-2 py-1">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--pos)]" />
            <span className="truncate text-[10px] text-[var(--text-dim)]">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NavGroupItem({ group }: { group: (typeof NAV)[number] }) {
  const pathname = usePathname();
  const industry = useIndustry();
  const prefixed = (h: string) => `/${industry}${h === "/" ? "" : h}`;
  const childActive = group.children?.some((c) => pathname === prefixed(c.href));
  const [open, setOpen] = useState<boolean>(Boolean(childActive) || group.label === "Companies");

  if (!group.children) {
    const active = pathname === prefixed(group.href ?? "/");
    return (
      <Link
        href={group.href ? prefixed(group.href) : "#"}
        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          active ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--text-dim)] hover:bg-white/5 hover:text-[var(--text)]"
        }`}
      >
        <Icon name={group.icon} size={16} />
        {group.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          childActive ? "text-[var(--text)]" : "text-[var(--text-dim)] hover:bg-white/5 hover:text-[var(--text)]"
        }`}
      >
        <Icon name={group.icon} size={16} />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-0.5 mb-1 space-y-0.5 pl-9">
          {group.children.map((c) => {
            const active = pathname === prefixed(c.href);
            return (
              <Link
                key={c.href}
                href={prefixed(c.href)}
                className={`block rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
                  active ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--text-faint)] hover:bg-white/5 hover:text-[var(--text-dim)]"
                }`}
              >
                {c.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[var(--panel-border)] bg-[var(--bg-elevated)]">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)]/20 ring-1 ring-[var(--accent)]/40">
          <Icon name="Radar" size={20} className="text-[var(--accent)]" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold">Supply Chain</div>
          <div className="text-sm font-bold">Risk Radar</div>
          <div className="mt-0.5 text-[10px] text-[var(--text-faint)]">Semiconductor · AI · Battery</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
        {NAV.map((g) => (
          <NavGroupItem key={g.label} group={g} />
        ))}
      </nav>

      {/* Footer controls */}
      <div className="space-y-3 border-t border-[var(--panel-border)] py-3">
        <IndustrySelector />
        <DataSourceHealth />
      </div>
    </aside>
  );
}
