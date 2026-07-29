import CollectionDetailClient from "@/components/discovery/collection-detail-client";

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CollectionDetailClient slug={decodeURIComponent(slug)} />;
}
