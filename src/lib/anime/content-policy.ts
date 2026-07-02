/** Genres we never surface on the site. */
export const BLOCKED_ANIME_GENRES = ["Hentai"] as const;

/**
 * GraphQL args for AniList `media()` list queries — excludes adult titles at the source.
 * Usage: `media(type: ANIME, ${ANILIST_SFW_MEDIA_FILTER}, sort: ...)`
 */
export const ANILIST_SFW_MEDIA_FILTER =
  'isAdult: false, genre_not_in: ["Hentai"], format_not_in: [HENTAI]';

export type SfwAnimeFields = {
  genres?: string[] | null;
  isAdult?: boolean | null;
  format?: string | null;
};

export function isBlockedAnime(media: SfwAnimeFields | null | undefined): boolean {
  if (!media) return false;
  if (media.isAdult) return true;
  if (media.format === "HENTAI") return true;
  const genres = media.genres ?? [];
  return BLOCKED_ANIME_GENRES.some((genre) => genres.includes(genre));
}

export function filterBlockedAnime<T extends SfwAnimeFields>(items: T[]): T[] {
  return items.filter((item) => !isBlockedAnime(item));
}

/** Remove blocked genre slugs from user-supplied search filters. */
export function stripBlockedGenreSlugs(slugs: string[]): string[] {
  return slugs.filter((slug) => slug.toLowerCase().replace(/-/g, " ") !== "hentai");
}
