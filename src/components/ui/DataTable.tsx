"use client";
import { useMemo, useState } from "react";
import { ArrowUpDown, Search } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  render?: (row: T) => React.ReactNode;
  sortValue?: (row: T) => number | string;
  className?: string;
}

export function DataTable<T>({
  rows,
  columns,
  searchable,
  searchPlaceholder = "Search…",
  initialSort,
  rowKey,
  onRowClick,
}: {
  rows: T[];
  columns: Column<T>[];
  searchable?: (row: T) => string; // concatenated text to match against
  searchPlaceholder?: string;
  initialSort?: { key: string; dir: "asc" | "desc" };
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(initialSort ?? null);

  const view = useMemo(() => {
    let out = rows;
    if (query && searchable) {
      const q = query.toLowerCase();
      out = out.filter((r) => searchable(r).toLowerCase().includes(q));
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        const dir = sort.dir === "asc" ? 1 : -1;
        out = [...out].sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          if (av < bv) return -1 * dir;
          if (av > bv) return 1 * dir;
          return 0;
        });
      }
    }
    return out;
  }, [rows, query, sort, columns, searchable]);

  function toggleSort(key: string) {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }

  return (
    <div>
      {searchable && (
        <div className="relative mb-3 w-full max-w-xs">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--text-faint)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--panel-2)] py-1.5 pr-3 pl-8 text-sm placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-[var(--text-dim)]">
              {columns.map((c) => (
                <th key={c.key} className={`pb-2 font-medium ${c.align === "right" ? "text-right" : "text-left"}`}>
                  {c.sortValue ? (
                    <button onClick={() => toggleSort(c.key)} className={`inline-flex items-center gap-1 hover:text-[var(--text)] ${c.align === "right" ? "flex-row-reverse" : ""}`}>
                      {c.header}
                      <ArrowUpDown size={11} className={sort?.key === c.key ? "text-[var(--accent)]" : "opacity-40"} />
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((r) => (
              <tr
                key={rowKey(r)}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={`border-t border-[var(--panel-border)] ${onRowClick ? "cursor-pointer hover:bg-white/[0.03]" : ""}`}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`py-2 ${c.align === "right" ? "text-right tabular-nums" : "text-left"} ${c.className ?? ""}`}>
                    {c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
            {view.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-6 text-center text-sm text-[var(--text-faint)]">
                  No results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
