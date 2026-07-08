"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { INDUSTRIES } from "@/lib/types";

interface Hit { type: string; label: string; sub: string; href: string }
interface Group { name: string; items: Hit[] }

export function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const industry = pathname.split("/")[1];
  const valid = (INDUSTRIES as readonly string[]).includes(industry);

  const [q, setQ] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // debounced fetch
  useEffect(() => {
    if (!valid || q.trim().length < 1) { setGroups([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?industry=${industry}&q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        setGroups(data.groups ?? []);
      } catch { setGroups([]); }
      setLoading(false);
    }, 180);
    return () => clearTimeout(t);
  }, [q, industry, valid]);

  // close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (href: string) => { setOpen(false); setQ(""); router.push(href); };
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-faint)]" />
      <input
        type="text"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search companies, materials, chokepoints, revenue, trade…"
        className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--panel-2)] py-2 pr-8 pl-9 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none"
      />
      {q && (
        <button onClick={() => { setQ(""); setOpen(false); }} className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[var(--text-faint)] hover:text-[var(--text)]">
          <X size={14} />
        </button>
      )}

      {open && q.trim().length > 0 && (
        <div className="absolute left-0 z-50 mt-1.5 max-h-[70vh] w-[26rem] overflow-y-auto rounded-lg border border-[var(--panel-border)] bg-[var(--bg-elevated)] p-1.5 shadow-2xl">
          {loading && total === 0 && <div className="px-3 py-4 text-xs text-[var(--text-faint)]">Searching…</div>}
          {!loading && total === 0 && <div className="px-3 py-4 text-xs text-[var(--text-faint)]">No matches for &ldquo;{q}&rdquo;.</div>}
          {groups.map((g) => (
            <div key={g.name} className="mb-1">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">{g.name}</div>
              {g.items.map((h, i) => (
                <button
                  key={i}
                  onClick={() => go(h.href)}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left hover:bg-[var(--accent)]/10"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm text-[var(--text)]">{h.label}</div>
                    <div className="truncate text-[11px] text-[var(--text-dim)]">{h.sub}</div>
                  </div>
                  <span className="shrink-0 rounded bg-[var(--panel-2)] px-1.5 py-0.5 text-[9px] text-[var(--text-faint)]">{h.type}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
