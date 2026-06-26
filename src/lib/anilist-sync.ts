const ANILIST_GQL = "https://graphql.anilist.co";

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
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? "AniList API error");
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

export function parseEpisodeNumber(episodeId: string): number | null {
  // Tries "episode-5", "ep-5", "ep5", trailing number
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
