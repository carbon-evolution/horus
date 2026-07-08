"use client";
import { useMemo, useState } from "react";
import { COMPANY_DOMAIN, DOMAIN_BY_NAME, SIMPLE_ICON, LOCAL_LOGO } from "@/lib/company-domains";

// A short brand label for the monogram fallback: keep whole short acronyms
// (TSMC, CATL, NXP), the leading short token (SK, LG, EVE), else two initials.
function monogram(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  if (words[0].length <= 3 && words[0] === words[0].toUpperCase()) return words[0];
  return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// Renders a company's brand logo, sharpest source first:
//   1) simple-icons vector SVG (crisp at any size) where available
//   2) Google favicon at 128px — but only if the site actually serves a
//      reasonable-resolution icon; tiny 16px favicons are rejected on load
//   3) a clean monogram badge
export function CompanyLogo({ id, name, size = 20 }: { id?: string; name: string; size?: number }) {
  const [step, setStep] = useState(0);
  const domain = (id && COMPANY_DOMAIN[id]) || DOMAIN_BY_NAME[name];
  const slug = id ? SIMPLE_ICON[id] : undefined;
  const local = id ? LOCAL_LOGO[id] : undefined;

  // Each source: { url, gate } — gate=true rejects low-res icons (favicons).
  const sources = useMemo(() => {
    const s: { url: string; gate: boolean }[] = [];
    if (local) s.push({ url: local, gate: false });
    if (slug) s.push({ url: `https://cdn.simpleicons.org/${slug}`, gate: false });
    if (domain) s.push({ url: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`, gate: true });
    return s;
  }, [local, slug, domain]);

  const cur = sources[step];
  if (cur) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={cur.url}
        alt=""
        onError={() => setStep((s) => s + 1)}
        // reject tiny favicons so we show a crisp monogram instead of a blurry
        // upscaled icon (local/vector logos are trusted and not gated)
        onLoad={(e) => { if (cur.gate && e.currentTarget.naturalWidth < 48) setStep((s) => s + 1); }}
        className="shrink-0 rounded-[4px] bg-white object-contain p-[2px]"
        style={{ width: size, height: size }}
      />
    );
  }

  const label = monogram(name);
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[4px] bg-[var(--accent)]/12 font-bold uppercase tracking-tight text-[var(--accent)] ring-1 ring-[var(--accent)]/30"
      style={{ width: size, height: size, fontSize: Math.round(size * (label.length >= 4 ? 0.3 : label.length === 3 ? 0.36 : 0.44)) }}
    >
      {label}
    </span>
  );
}
