"use client";
import { useState } from "react";
import { COMPANY_DOMAIN, DOMAIN_BY_NAME } from "@/lib/company-domains";

// Renders a company's brand logo (via Google's favicon service, no key needed),
// falling back to a tidy initials badge when there's no domain or the fetch fails.
export function CompanyLogo({ id, name, size = 20 }: { id?: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const domain = (id && COMPANY_DOMAIN[id]) || DOMAIN_BY_NAME[name];

  if (domain && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt=""
        onError={() => setFailed(true)}
        className="shrink-0 rounded-[3px] bg-white object-contain p-[1px]"
        style={{ width: size, height: size }}
      />
    );
  }

  const initials = name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[3px] bg-[var(--panel-2)] font-bold text-[var(--text-dim)] ring-1 ring-[var(--panel-border)]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {initials}
    </span>
  );
}
