"use client";
import { useMemo, useState } from "react";
import { COMPANY_DOMAIN, DOMAIN_BY_NAME, SIMPLE_ICON } from "@/lib/company-domains";

// Renders a company's brand logo, sharpest source first:
//   1) simple-icons vector SVG (crisp at any size) where available
//   2) Google favicon at 128px
//   3) initials badge
// All keyless. Falls through gracefully on any load error.
export function CompanyLogo({ id, name, size = 20 }: { id?: string; name: string; size?: number }) {
  const [step, setStep] = useState(0);
  const domain = (id && COMPANY_DOMAIN[id]) || DOMAIN_BY_NAME[name];
  const slug = id ? SIMPLE_ICON[id] : undefined;

  const sources = useMemo(() => {
    const s: string[] = [];
    if (slug) s.push(`https://cdn.simpleicons.org/${slug}`);
    if (domain) s.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
    return s;
  }, [slug, domain]);

  const src = sources[step];
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setStep((s) => s + 1)}
        className="shrink-0 rounded-[4px] bg-white object-contain p-[2px]"
        style={{ width: size, height: size }}
      />
    );
  }

  const initials = name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[4px] bg-[var(--panel-2)] font-bold text-[var(--text-dim)] ring-1 ring-[var(--panel-border)]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {initials}
    </span>
  );
}
