"use client";
import { useRouter } from "next/navigation";
import { Crosshair } from "lucide-react";
import { useFocus } from "@/lib/focus";
import { useIndustry } from "@/lib/industry-context";
import { INDUSTRY_LABEL, type Company, type CompanyMeta } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { CompanyLogo } from "@/components/ui/CompanyLogo";

function capNum(s: string): number {
  const n = parseFloat(s.replace(/[$,]/g, ""));
  if (Number.isNaN(n)) return 0;
  return /T/i.test(s) ? n * 1000 : n;
}

export function CompanyExplorer({ companies, metas }: { companies: Company[]; metas: Record<string, CompanyMeta> }) {
  const industry = useIndustry();
  const router = useRouter();
  const { focusId, toggleFocus } = useFocus();

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
    <div>
      <PageHeader title="Company Explorer" subtitle={`${INDUSTRY_LABEL[industry]} · full tracked universe — sort and filter`} />
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
        <DataTable
          rows={companies}
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
