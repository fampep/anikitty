import GenrePageClient from "@/components/discovery/genre-page-client";

export default async function GenrePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <GenrePageClient slug={decodeURIComponent(slug)} />;
}
