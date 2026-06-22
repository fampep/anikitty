const ANILIST_ENDPOINT = "https://graphql.anilist.co";

export async function queryAniList<T = any>(
  query: string,
  variables?: Record<string, any>,
): Promise<T> {
  const res = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

export function toTitle(t: { english?: string | null; romaji?: string | null }): string {
  return t.english || t.romaji || "Unknown";
}

export function toFormat(format: string | null | undefined): string {
  if (!format) return "TV";
  const map: Record<string, string> = {
    TV: "TV",
    TV_SHORT: "TV",
    MOVIE: "Movie",
    OVA: "OVA",
    ONA: "ONA",
    SPECIAL: "Special",
    MUSIC: "Music",
  };
  return map[format] ?? format;
}

export function toStatus(status: string | null | undefined): string {
  const map: Record<string, string> = {
    FINISHED: "Finished Airing",
    RELEASING: "Currently Airing",
    NOT_YET_RELEASED: "Not yet aired",
    CANCELLED: "Cancelled",
    HIATUS: "On Hiatus",
  };
  return map[status ?? ""] ?? "Unknown";
}

export function formatPartialDate(d: { year?: number | null; month?: number | null; day?: number | null } | null | undefined): string {
  if (!d?.year) return "N/A";
  const parts = [d.year];
  if (d.month) parts.push(d.month);
  if (d.day) parts.push(d.day);
  return new Date(d.year, (d.month ?? 1) - 1, d.day ?? 1)
    .toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
