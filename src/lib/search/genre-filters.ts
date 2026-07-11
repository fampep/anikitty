/** Maps URL genre slugs to AniList genre names. */
const GENRE_SLUG_MAP: Record<string, string> = {
  "sci-fi": "Sci-Fi",
  "slice-of-life": "Slice of Life",
};

export function slugToAniListGenre(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed) return "";
  if (GENRE_SLUG_MAP[trimmed]) return GENRE_SLUG_MAP[trimmed];
  return trimmed
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function slugsToAniListGenres(slugs: string): string[] {
  return slugs
    .split(",")
    .map(slugToAniListGenre)
    .filter(Boolean);
}

export type GenreFilterMode = "include" | "exclude";

export function parseGenreFilterModes(
  genres?: string,
  excludeGenres?: string,
): Record<string, GenreFilterMode> {
  const modes: Record<string, GenreFilterMode> = {};
  for (const slug of genres?.split(",").filter(Boolean) ?? []) {
    modes[slug] = "include";
  }
  for (const slug of excludeGenres?.split(",").filter(Boolean) ?? []) {
    modes[slug] = "exclude";
  }
  return modes;
}

export function serializeGenreFilterModes(modes: Record<string, GenreFilterMode>): {
  genres?: string;
  excludeGenres?: string;
} {
  const include: string[] = [];
  const exclude: string[] = [];
  for (const [slug, mode] of Object.entries(modes)) {
    if (mode === "include") include.push(slug);
    if (mode === "exclude") exclude.push(slug);
  }
  return {
    genres: include.length ? include.join(",") : undefined,
    excludeGenres: exclude.length ? exclude.join(",") : undefined,
  };
}

/** neutral → include → exclude → neutral */
export function cycleGenreFilterMode(current?: GenreFilterMode): GenreFilterMode | undefined {
  if (!current) return "include";
  if (current === "include") return "exclude";
  return undefined;
}
