import FranchisePageClient from "@/components/discovery/franchise-page-client";

export default async function FranchisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FranchisePageClient id={id} />;
}
