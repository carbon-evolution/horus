"use client";
import { createContext, useContext, useEffect } from "react";
import type { Company, Industry } from "@/lib/types";
import { useApp } from "@/lib/store";

interface IndustryCtx {
  industry: Industry;
  companies: Company[];
}
const Ctx = createContext<IndustryCtx | null>(null);

export function IndustryProvider({
  industry, companies, children,
}: IndustryCtx & { children: React.ReactNode }) {
  const setIndustry = useApp((s) => s.setIndustry);
  // Bridge: keep the Zustand store's industry in sync with the route so
  // not-yet-migrated views (which read useApp(s=>s.industry)) still work.
  useEffect(() => { setIndustry(industry); }, [industry, setIndustry]);
  return <Ctx.Provider value={{ industry, companies }}>{children}</Ctx.Provider>;
}

export function useIndustry(): Industry {
  const c = useContext(Ctx);
  if (!c) throw new Error("useIndustry must be used within IndustryProvider");
  return c.industry;
}
export function useCompanies(): Company[] {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCompanies must be used within IndustryProvider");
  return c.companies;
}
