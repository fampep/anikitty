import SeasonPageClient from "@/components/discovery/season-page-client";

export default async function SeasonPage({
  params,
}: {
  params: Promise<{ season: string; year: string }>;
}) {
  const { season, year } = await params;
  return <SeasonPageClient season={season} year={year} />;
}
