"use client";
import Link from "next/link";
import { useIndustry, useCompanies } from "@/lib/industry-context";

// Render a company name as a link to its detail page when the name matches a
// tracked company in the current industry; otherwise plain text. This is the
// shared interlink used across tables/feeds so any company is one click away.
export function CompanyLink({ name, className = "" }: { name: string; className?: string }) {
  const industry = useIndustry();
  const companies = useCompanies();
  const key = name.trim().toLowerCase();
  const match = companies.find((c) => c.name.trim().toLowerCase() === key);
  if (!match) return <span className={className}>{name}</span>;
  return (
    <Link
      href={`/${industry}/companies/${match.id}`}
      className={`text-[var(--accent)] hover:underline ${className}`}
    >
      {name}
    </Link>
  );
}
