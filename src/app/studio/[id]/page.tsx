import StudioPageClient from "@/components/discovery/studio-page-client";

export default async function StudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StudioPageClient id={id} />;
}
