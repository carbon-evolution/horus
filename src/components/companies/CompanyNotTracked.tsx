import Link from "next/link";
import { INDUSTRY_LABEL, type Industry } from "@/lib/types";

// Shown when a company deep-link is opened under an industry it isn't tracked in
// — e.g. switching Industry Focus while viewing SK hynix (a semiconductor
// company) to AI or Battery. Offers a direct jump to its real industry instead
// of a dead 404.
export function CompanyNotTracked({
  id,
  industry,
  home,
  name,
}: {
  id: string;
  industry: Industry;
  home: Industry;
  name: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
      <h1 className="text-lg font-bold">{name}</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        <span className="font-medium text-[var(--text)]">{name}</span> is tracked in{" "}
        <span className="font-medium text-[var(--text)]">{INDUSTRY_LABEL[home]}</span>, not{" "}
        {INDUSTRY_LABEL[industry]}.
      </p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link
          href={`/${home}/companies/${id}`}
          className="rounded-md bg-[var(--accent)] px-3 py-1.5 font-medium text-white hover:opacity-90"
        >
          View {name} in {INDUSTRY_LABEL[home]} →
        </Link>
        <Link
          href={`/${industry}/companies`}
          className="rounded-md border border-[var(--panel-border)] px-3 py-1.5 text-[var(--text-dim)] hover:text-[var(--text)]"
        >
          Browse {INDUSTRY_LABEL[industry]} companies
        </Link>
      </div>
    </div>
  );
}
