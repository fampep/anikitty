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

export function getPrevAniListSeason(
  season: AniListSeason,
  year: number,
): { season: AniListSeason; year: number } {
  const idx = SEASONS.indexOf(season);
  if (idx === 0) return { season: "FALL", year: year - 1 };
  return { season: SEASONS[idx - 1], year };
}

export function seasonLabel(season: AniListSeason | string): string {
  const s = String(season).toUpperCase() as AniListSeason;
  if (!SEASONS.includes(s)) return String(season);
  return s.charAt(0) + s.slice(1).toLowerCase();
}

export function parseSeasonParam(value: string): AniListSeason | null {
  const s = value.toUpperCase() as AniListSeason;
  return SEASONS.includes(s) ? s : null;
}

export function seasonSearchParams(season: AniListSeason, year: number): string {
  return `season=${season.toLowerCase()}&year=${year}`;
}

export { SEASONS };
