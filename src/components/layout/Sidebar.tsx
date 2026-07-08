"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { NAV, DATA_SOURCES } from "@/lib/nav";
import { INDUSTRIES, INDUSTRY_LABEL } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { useIndustry } from "@/lib/industry-context";

const INDUSTRY_ICON: Record<string, string> = {
  semiconductor: "Cpu",
  ai: "BrainCircuit",
  battery: "BatteryCharging",
};

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
      <div className="flex flex-col gap-1 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-2)] p-1">
        {INDUSTRIES.map((i) => (
          <button
            key={i}
            onClick={() => switchTo(i)}
            aria-pressed={industry === i}
            className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12px] font-medium transition-colors ${
              industry === i
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-dim)] hover:bg-white/5 hover:text-[var(--text)]"
            }`}
          >
            <Icon name={INDUSTRY_ICON[i]} size={15} className="shrink-0" />
            {INDUSTRY_LABEL[i]}
          </button>
        ))}
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
      <div className="border-b border-[var(--panel-border)] bg-black px-3 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/horus-brand.png" alt="Horus" className="mx-auto w-full max-w-[210px]" />
        <div className="mt-1.5 text-center text-[10px] tracking-[0.15em] text-[var(--text-faint)]">SUPPLY-CHAIN RISK INTELLIGENCE</div>
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
