/** Editorial copy for dedicated genre hub pages. */

export type GenreMeta = {
  slug: string;
  name: string;
  description: string;
};

export const GENRE_META: Record<string, GenreMeta> = {
  action: {
    slug: "action",
    name: "Action",
    description:
      "High-stakes fights, chase sequences, and kinetic storytelling — from shōnen battles to sleek crime thrillers.",
  },
  adventure: {
    slug: "adventure",
    name: "Adventure",
    description:
      "Journeys across worlds and seas — exploration, quests, and the thrill of the unknown.",
  },
  comedy: {
    slug: "comedy",
    name: "Comedy",
    description:
      "Laugh-out-loud sitcoms, parody, and slice-of-life humor that keeps the tone light.",
  },
  drama: {
    slug: "drama",
    name: "Drama",
    description:
      "Character-driven stories about relationships, loss, ambition, and the weight of choices.",
  },
  fantasy: {
    slug: "fantasy",
    name: "Fantasy",
    description:
      "Magic systems, mythical creatures, and worlds beyond our own — epic and intimate alike.",
  },
  horror: {
    slug: "horror",
    name: "Horror",
    description:
      "Dread, the uncanny, and things that go bump in the night — psychological and supernatural scares.",
  },
  mystery: {
    slug: "mystery",
    name: "Mystery",
    description:
      "Whodunits, conspiracies, and puzzles that reward careful attention.",
  },
  romance: {
    slug: "romance",
    name: "Romance",
    description:
      "Falling in love, first crushes, and relationships that reshape everything.",
  },
  "sci-fi": {
    slug: "sci-fi",
    name: "Sci-Fi",
    description:
      "Futures, technology, and speculative ideas — space opera to near-future dystopia.",
  },
  "slice-of-life": {
    slug: "slice-of-life",
    name: "Slice of Life",
    description:
      "Everyday moments, quiet growth, and the beauty of ordinary days.",
  },
  sports: {
    slug: "sports",
    name: "Sports",
    description:
      "Competition, teamwork, and the grind toward greatness on the field or court.",
  },
  supernatural: {
    slug: "supernatural",
    name: "Supernatural",
    description:
      "Ghosts, spirits, and powers that bend the rules of the natural world.",
  },
  thriller: {
    slug: "thriller",
    name: "Thriller",
    description:
      "Tension, suspense, and stories that keep you on edge until the last beat.",
  },
  mecha: {
    slug: "mecha",
    name: "Mecha",
    description:
      "Giant robots, pilots, and the clash of machines — classic and deconstructed.",
  },
  psychological: {
    slug: "psychological",
    name: "Psychological",
    description:
      "Mind games, unreliable narrators, and stories that dig into motive and identity.",
  },
  isekai: {
    slug: "isekai",
    name: "Isekai",
    description:
      "Transported to another world — reincarnation, game-like systems, and second chances.",
  },
};

export function getGenreMeta(slug: string): GenreMeta {
  const key = slug.toLowerCase();
  if (GENRE_META[key]) return GENRE_META[key];
  const name = key
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return {
    slug: key,
    name,
    description: `Explore ${name} anime — trending titles, top-rated classics, new releases, and hidden gems.`,
  };
}
