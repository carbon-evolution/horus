"use client";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import type { FinancialSeriesPoint } from "@/lib/types";

const TABS = [
  { key: "revenue", label: "Revenue" },
  { key: "profit", label: "Profit" },
  { key: "rnd", label: "R&D Expense" },
  { key: "capex", label: "CapEx" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function FinancialPerformance({ data }: { data: FinancialSeriesPoint[] }) {
  const [tab, setTab] = useState<TabKey>("revenue");
  const rows = data.map((d) => ({ company: d.company, value: d[tab] }));
  return (
    <div>
      <div className="mb-3 inline-flex rounded-lg border border-[var(--panel-border)] bg-[var(--panel-2)] p-0.5 text-xs">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              tab === t.key ? "bg-[var(--accent)] text-white" : "text-[var(--text-dim)] hover:text-[var(--text)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={rows} margin={{ top: 4, right: 8, bottom: 4, left: -12 }}>
          <XAxis dataKey="company" tick={{ fill: "#8695ab", fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={54} />
          <YAxis tick={{ fill: "#5b6a80", fontSize: 10 }} tickFormatter={(v) => `$${v}B`} />
          <Tooltip
            cursor={{ fill: "#ffffff", fillOpacity: 0.04 }}
            contentStyle={{ background: "#0d1420", border: "1px solid #1e2a3d", borderRadius: 8, fontSize: 12 }}
            formatter={(v) => [`$${v}B`, TABS.find((t) => t.key === tab)?.label ?? ""]}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {rows.map((r, i) => (
              <Cell key={i} fill={r.value < 0 ? "#ef4444" : "#3b82f6"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
