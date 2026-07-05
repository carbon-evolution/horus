import { notFound } from "next/navigation";
import { INDUSTRIES, type Industry } from "@/lib/types";
import { getCompanies } from "@/lib/provider";
import { IndustryProvider } from "@/lib/industry-context";
import { AppShell } from "@/components/layout/AppShell";

// No generateStaticParams: these routes read the live DB, so they render
// dynamically on demand. notFound() below rejects unknown industries.

export default async function IndustryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ industry: string }>;
}) {
  const { industry } = await params;
  if (!INDUSTRIES.includes(industry as Industry)) notFound();
  const companies = await getCompanies(industry as Industry);
  return (
    <IndustryProvider industry={industry as Industry} companies={companies}>
      <AppShell>{children}</AppShell>
    </IndustryProvider>
  );
}
