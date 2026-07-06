"use client";
import { createContext, useContext } from "react";
import type { Company, Industry } from "@/lib/types";

interface IndustryCtx {
  industry: Industry;
  companies: Company[];
}
const Ctx = createContext<IndustryCtx | null>(null);

export function IndustryProvider({
  industry, companies, children,
}: IndustryCtx & { children: React.ReactNode }) {
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
