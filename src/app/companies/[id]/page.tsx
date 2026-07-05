import { CompanyProfile } from "@/components/companies/CompanyProfile";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CompanyProfile id={id} />;
}
