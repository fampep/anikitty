/**
 * Curated discovery collections — each maps to AniList search filters
 * plus editorial copy shown on /collections/[slug].
 */

export type CollectionFilters = {
  genres?: string;
  excludeGenres?: string;
  type?: string;
  status?: string;
  sort?: string;
  year?: string;
  source?: string;
  tags?: string;
  episodeMax?: string;
  episodeMin?: string;
  durationMax?: string;
  durationMin?: string;
  scoreMin?: string;
  country?: string;
};

export type CuratedCollection = {
  slug: string;
  title: string;
  description: string;
  filters: CollectionFilters;
  accent: string;
};

export const CURATED_COLLECTIONS: CuratedCollection[] = [
  {
    slug: "best-of-2026",
    title: "Best Anime of 2026",
    description: "The highest-scoring titles that premiered in 2026 — standouts from this year’s slate.",
    filters: { year: "2026", sort: "score" },
    accent: "from-amber-500/25 to-transparent",
  },
  {
    slug: "award-winners",
    title: "Award Winners",
    description: "Critically acclaimed anime with exceptional community scores and lasting reputations.",
    filters: { sort: "score", scoreMin: "85", status: "finished-airing" },
    accent: "from-yellow-500/20 to-transparent",
  },
  {
    slug: "beginner-friendly",
    title: "Beginner Friendly",
    description: "Approachable series with clear storytelling — great first stops if you’re new to anime.",
    filters: { genres: "slice-of-life,comedy,adventure", sort: "score", episodeMax: "26" },
    accent: "from-emerald-500/20 to-transparent",
  },
  {
    slug: "dark-fantasy",
    title: "Dark Fantasy",
    description: "Grim worlds, moral gray zones, and fantasy with teeth — not the lighthearted kind.",
    filters: { genres: "fantasy,horror", tags: "Tragedy,Gore", sort: "popularity" },
    accent: "from-violet-500/20 to-transparent",
  },
  {
    slug: "best-romance",
    title: "Best Romance",
    description: "The most loved romance anime — from slow-burn classics to modern favorites.",
    filters: { genres: "romance", sort: "score" },
    accent: "from-pink-500/25 to-transparent",
  },
  {
    slug: "movies-under-2-hours",
    title: "Movies Under 2 Hours",
    description: "Feature films you can finish in one sitting — under 120 minutes.",
    filters: { type: "movie", durationMax: "120", sort: "score" },
    accent: "from-sky-500/20 to-transparent",
  },
  {
    slug: "long-running",
    title: "Long Running Series",
    description: "Epic runs with 50+ episodes — series you can settle into for the long haul.",
    filters: { episodeMin: "50", type: "tv", sort: "popularity" },
    accent: "from-orange-500/20 to-transparent",
  },
  {
    slug: "hidden-gems",
    title: "Hidden Gems",
    description: "Highly rated but less mainstream titles worth discovering off the beaten path.",
    filters: { sort: "score", scoreMin: "78", excludeGenres: "harem,ecchi" },
    accent: "from-cyan-500/20 to-transparent",
  },
  {
    slug: "based-on-visual-novels",
    title: "Based on Visual Novels",
    description: "Anime adapted from visual novels — branching stories brought to the screen.",
    filters: { source: "visual_novel", sort: "score" },
    accent: "from-rose-500/20 to-transparent",
  },
  {
    slug: "based-on-manga",
    title: "Based on Manga",
    description: "Adaptations of manga series — from shōnen giants to quieter drama.",
    filters: { source: "manga", sort: "popularity" },
    accent: "from-lime-500/15 to-transparent",
  },
];

export function getCollection(slug: string): CuratedCollection | undefined {
  return CURATED_COLLECTIONS.find((c) => c.slug === slug);
}

export function collectionToSearchParams(collection: CuratedCollection): string {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(collection.filters)) {
    if (value) p.set(key, value);
  }
  return p.toString();
}
