export type AniListSeason = "WINTER" | "SPRING" | "SUMMER" | "FALL";

const SEASONS: AniListSeason[] = ["WINTER", "SPRING", "SUMMER", "FALL"];

/** AniList seasons: Winter=Jan–Mar, Spring=Apr–Jun, Summer=Jul–Sep, Fall=Oct–Dec. */
export function getAniListSeason(date = new Date()): { season: AniListSeason; year: number } {
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month <= 2) return { season: "WINTER", year };
  if (month <= 5) return { season: "SPRING", year };
  if (month <= 8) return { season: "SUMMER", year };
  return { season: "FALL", year };
}

export function getNextAniListSeason(
  season: AniListSeason,
  year: number,
): { season: AniListSeason; year: number } {
  const idx = SEASONS.indexOf(season);
  if (idx === 3) return { season: "WINTER", year: year + 1 };
  return { season: SEASONS[idx + 1], year };
}

export function seasonLabel(season: AniListSeason): string {
  return season.charAt(0) + season.slice(1).toLowerCase();
}

export function seasonSearchParams(season: AniListSeason, year: number): string {
  return `season=${season.toLowerCase()}&year=${year}`;
}
