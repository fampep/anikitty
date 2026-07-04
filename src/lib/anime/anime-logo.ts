import type { AnimeImages } from "@/query/anime/get-anime-mappings";

/** Prefer TVDB clearlogo PNG; fall back to any clear logo in merged artwork. */
export function pickAnimeClearLogo(images: AnimeImages | null | undefined): string | null {
  const logos = images?.artworks?.clearLogo ?? [];
  if (!logos.length) return null;
  const tvdb = logos.find((item) => item.title === "TVDB");
  return tvdb?.image ?? logos[0]?.image ?? null;
}
