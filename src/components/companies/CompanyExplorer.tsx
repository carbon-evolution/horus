"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Crosshair } from "lucide-react";
import { useFocus } from "@/lib/focus";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type Company, type CompanyMeta, type RiskLevel } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { StatTile } from "@/components/ui/StatTile";
import { AiInsight } from "@/components/ui/AiInsight";

function capNum(s: string): number {
  const n = parseFloat(s.replace(/[$,]/g, ""));
  if (Number.isNaN(n)) return 0;
  return /T/i.test(s) ? n * 1000 : n;
}

// $B total → display string
function fmtCap(b: number): string {
  return b >= 1000 ? `$${(b / 1000).toFixed(2)}T` : `$${Math.round(b)}B`;
}

const EXPOSURE_FILTERS: { label: string; value: RiskLevel | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

export function CompanyExplorer({ companies, metas }: { companies: Company[]; metas: Record<string, CompanyMeta> }) {
  const industry = useIndustry();
  const router = useRouter();
  const { focusId, toggleFocus } = useFocus();
  const [exposure, setExposure] = useState<RiskLevel | "all">("all");

  const { combinedCap, avgHealth, highExposure, leader, insight } = useMemo(() => {
    const combinedCap = companies.reduce((s, c) => s + capNum(c.marketCap), 0);
    const avgHealth = Math.round(companies.reduce((s, c) => s + metas[c.id].healthScore, 0) / Math.max(companies.length, 1));
    const highExposure = companies.filter((c) => metas[c.id].exposure === "high");
    const leader = [...companies].sort((a, b) => capNum(b.marketCap) - capNum(a.marketCap))[0];
    const weakest = [...companies].sort((a, b) => metas[a.id].healthScore - metas[b.id].healthScore)[0];
    const insight =
      `${companies.length} companies tracked in ${INDUSTRY_LABEL[industry]} with ${fmtCap(combinedCap)} combined market capitalization, led by ${leader?.name} (${leader?.marketCap}). ` +
      `Average operational health is ${avgHealth}/100; the weakest link is ${weakest?.name} at ${metas[weakest?.id]?.healthScore}/100. ` +
      (highExposure.length
        ? `${highExposure.length} compan${highExposure.length === 1 ? "y carries" : "ies carry"} HIGH supply exposure (${highExposure.slice(0, 4).map((c) => c.name).join(", ")}${highExposure.length > 4 ? ", …" : ""}) — prioritize these for mitigation and alternate sourcing.`
        : `No company currently carries high supply exposure.`);
    return { combinedCap, avgHealth, highExposure, leader, insight };
  }, [companies, metas, industry]);

  const rows = exposure === "all" ? companies : companies.filter((c) => metas[c.id].exposure === exposure);

  const columns: Column<Company>[] = [
    {
      key: "name",
      header: "Company",
      sortValue: (r) => r.name,
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <CompanyLogo id={r.id} name={r.name} size={24} />
          <div>
            <div className="font-medium text-[var(--accent)]">{r.name}</div>
            <div className="text-[10px] text-[var(--text-faint)]">{r.ticker}</div>
          </div>
        </div>
      ),
    },
    { key: "hq", header: "HQ", render: (r) => metas[r.id].hq, sortValue: (r) => metas[r.id].hq },
    { key: "marketCap", header: "Market Cap", align: "right", sortValue: (r) => capNum(r.marketCap), render: (r) => r.marketCap },
    {
      key: "changeYtd",
      header: "YTD %",
      align: "right",
      sortValue: (r) => r.changeYtd,
      render: (r) =>
        r.changeYtd === 0 ? (
          <span className="text-[var(--text-faint)]">Private</span>
        ) : (
          <span style={{ color: r.changeYtd >= 0 ? "var(--pos)" : "var(--neg)" }}>{`${r.changeYtd >= 0 ? "+" : ""}${r.changeYtd.toFixed(1)}%`}</span>
        ),
    },
    { key: "health", header: "Health", align: "right", sortValue: (r) => metas[r.id].healthScore, render: (r) => `${metas[r.id].healthScore}/100` },
    { key: "exposure", header: "Exposure", align: "right", sortValue: (r) => metas[r.id].exposure, render: (r) => <RiskBadge level={metas[r.id].exposure} /> },
    {
      key: "focus",
      header: "",
      align: "right",
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFocus(r.id);
          }}
          title={r.id === focusId ? "Clear focus" : "Focus across all pages"}
          className={r.id === focusId ? "text-[var(--accent)]" : "text-[var(--text-faint)] hover:text-[var(--text-dim)]"}
        >
          <Crosshair size={14} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader title="Company Explorer" subtitle={`${INDUSTRY_LABEL[industry]} · full tracked universe — sort and filter`} />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile label="Companies Tracked" value={String(companies.length)} icon="Building2" />
        <StatTile label="Combined Market Cap" value={fmtCap(combinedCap)} icon="DollarSign" accent="#34d399" sub={leader ? `Leader: ${leader.name}` : undefined} />
        <StatTile label="Avg Operational Health" value={`${avgHealth}/100`} icon="Activity" accent="#22d3ee" />
        <StatTile label="High Supply Exposure" value={String(highExposure.length)} icon="TriangleAlert" accent="#f87171" sub={highExposure.length ? highExposure.slice(0, 2).map((c) => c.name).join(", ") + (highExposure.length > 2 ? " …" : "") : "none"} />
      </div>

      <AiInsight text={insight} title="AI Insight · Tracked Universe" />

      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
        {/* exposure filter chips */}
        <div className="mb-3 flex items-center gap-1.5">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">Exposure</span>
          {EXPOSURE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setExposure(f.value)}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
                exposure === f.value
                  ? "border-[var(--accent)]/60 bg-[var(--accent)]/15 text-[var(--accent)]"
                  : "border-[var(--panel-border)] text-[var(--text-dim)] hover:text-[var(--text)]"
              }`}
            >
              {f.label}
              {f.value !== "all" && <span className="ml-1 text-[var(--text-faint)]">{companies.filter((c) => metas[c.id].exposure === f.value).length}</span>}
            </button>
          ))}
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          searchable={(r) => `${r.name} ${r.ticker} ${metas[r.id].hq}`}
          searchPlaceholder="Search companies…"
          initialSort={{ key: "marketCap", dir: "desc" }}
          onRowClick={(r) => router.push(`/${industry}/companies/${r.id}`)}
        />
      </section>
    </div>
  );
}
