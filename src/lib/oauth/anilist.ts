const ANILIST_ENDPOINT = "https://graphql.anilist.co";
const ANILIST_TIMEOUT_MS = 15_000;
const ANILIST_MAX_ATTEMPTS = 3;

function isRetryableAniListError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("rate") ||
    lower.includes("limit") ||
    lower.includes("timeout") ||
    lower.includes("internal")
  );
}

export async function queryAniList<T = any>(
  query: string,
  variables?: Record<string, any>,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < ANILIST_MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(ANILIST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query, variables }),
        cache: "no-store",
        signal: AbortSignal.timeout(ANILIST_TIMEOUT_MS),
      });

      const json = await res.json().catch(() => null);
      if (!json) throw new Error("Invalid AniList response");

      if (json.errors?.length) {
        const message = String(json.errors[0]?.message ?? "AniList GraphQL error");
        if (isRetryableAniListError(message) && attempt < ANILIST_MAX_ATTEMPTS - 1) {
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          continue;
        }
        throw new Error(message);
      }

      if (!res.ok) {
        const message = `AniList HTTP ${res.status}`;
        if (attempt < ANILIST_MAX_ATTEMPTS - 1) {
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          continue;
        }
        throw new Error(message);
      }

      return json.data as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < ANILIST_MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        continue;
      }
    }
  }

  throw lastError ?? new Error("AniList request failed");
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
