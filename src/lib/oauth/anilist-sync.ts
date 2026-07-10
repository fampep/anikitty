const ANILIST_GQL = "https://graphql.anilist.co";

const MEDIA_LIST_STATUSES = [
  "CURRENT",
  "PLANNING",
  "COMPLETED",
  "DROPPED",
  "PAUSED",
  "REPEATING",
] as const;

const ENTRIES_PER_PAGE = 50;
const MAX_PAGES_PER_STATUS = 40;

export type AniListMediaListEntry = {
  media: {
    id: number;
    idMal?: number | null;
    bannerImage?: string | null;
    coverImage?: { large?: string | null } | null;
    title: { english?: string | null; romaji?: string | null };
  };
};

export type AniListMediaListGroup = {
  name: string;
  status: string;
  entries: AniListMediaListEntry[];
};

async function gql<T = any>(
  query: string,
  variables: Record<string, unknown>,
  accessToken: string,
): Promise<T> {
  const res = await fetch(ANILIST_GQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(20_000),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      json?.errors?.[0]?.message ?? `AniList API HTTP ${res.status}`,
    );
  }
  if (json.errors?.length) {
    const message = json.errors[0]?.message ?? "AniList API error";
    if (/invalid token|not authenticated|unauthorized/i.test(message)) {
      throw new Error(`ANI_LIST_UNAUTHORIZED: ${message}`);
    }
    throw new Error(message);
  }
  return json.data;
}

export async function getAniListViewer(
  accessToken: string,
): Promise<{ id: number; name: string } | null> {
  try {
    const data = await gql<{ Viewer: { id: number; name: string } }>(
      `query { Viewer { id name } }`,
      {},
      accessToken,
    );
    return data.Viewer ?? null;
  } catch {
    return null;
  }
}

export async function updateAniListProgress(
  accessToken: string,
  mediaId: number,
  progress: number,
  status: "CURRENT" | "COMPLETED" | "REPEATING" = "CURRENT",
): Promise<boolean> {
  try {
    await gql(
      `mutation ($mediaId: Int, $status: MediaListStatus, $progress: Int) {
        SaveMediaListEntry(mediaId: $mediaId, status: $status, progress: $progress) {
          id status progress
        }
      }`,
      { mediaId, status, progress },
      accessToken,
    );
    return true;
  } catch {
    return false;
  }
}

async function fetchStatusEntries(
  accessToken: string,
  userId: number,
  status: string,
): Promise<AniListMediaListEntry[]> {
  const entries: AniListMediaListEntry[] = [];

  for (let page = 1; page <= MAX_PAGES_PER_STATUS; page++) {
    const data = await gql<{
      MediaListCollection: {
        lists: Array<{
          status: string;
          entries: AniListMediaListEntry[];
        }>;
      } | null;
    }>(
      `query ($userId: Int, $type: MediaType, $status: MediaListStatus, $page: Int, $perPage: Int) {
        MediaListCollection(userId: $userId, type: $type, status: $status) {
          lists {
            status
            entries(page: $page, perPage: $perPage) {
              media {
                id
                idMal
                bannerImage
                coverImage { large }
                title { english romaji }
              }
            }
          }
        }
      }`,
      { userId, type: "ANIME", status, page, perPage: ENTRIES_PER_PAGE },
      accessToken,
    );

    const batch = data.MediaListCollection?.lists?.[0]?.entries ?? [];
    entries.push(...batch);
    if (batch.length < ENTRIES_PER_PAGE) break;
  }

  return entries;
}

export async function getAniListMediaLists(
  accessToken: string,
): Promise<AniListMediaListGroup[]> {
  const viewer = await getAniListViewer(accessToken);
  if (!viewer) {
    throw new Error("ANI_LIST_UNAUTHORIZED");
  }

  const lists: AniListMediaListGroup[] = [];

  for (const status of MEDIA_LIST_STATUSES) {
    const entries = await fetchStatusEntries(accessToken, viewer.id, status);
    if (entries.length > 0) {
      lists.push({ name: status, status, entries });
    }
  }

  return lists;
}

export function parseEpisodeNumber(episodeId: string): number | null {
  const patterns = [
    /(?:episode|ep)[- _]?(\d+)/i,
    /[- _](\d+)$/,
    /(\d+)$/,
  ];
  for (const re of patterns) {
    const m = episodeId.match(re);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}
