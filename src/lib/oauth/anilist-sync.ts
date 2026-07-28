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

export type AniListScoreFormat =
  | "POINT_100"
  | "POINT_10"
  | "POINT_10_DECIMAL"
  | "POINT_5"
  | "POINT_3";

/** Snap UI scores to one decimal (0.5 steps), clamped 0.5–10. */
export function normalizeUiScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  const clamped = Math.min(10, Math.max(0.5, score));
  return Math.round(clamped * 2) / 2;
}

/** Format a 0–10 score for display (6.5, 7, …). */
export function formatUiScore(score: number): string {
  const n = normalizeUiScore(score);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Map AniKitty 0.5–10 UI score into the user's AniList scoring format. */
export function toAniListScore(
  uiScore: number,
  format: AniListScoreFormat | string | null | undefined,
): number {
  const n = normalizeUiScore(uiScore);
  switch (format) {
    case "POINT_10":
      return Math.round(n);
    case "POINT_10_DECIMAL":
      return n;
    case "POINT_5":
      return Math.max(0.5, Math.round(n) / 2);
    case "POINT_3":
      if (n <= 3.5) return 1;
      if (n <= 7) return 2;
      return 3;
    case "POINT_100":
    default:
      // 6.5 → 65 (AniList 100-point). Never send 1–10 as if it were /100.
      return Math.round(n * 10);
  }
}

/** Map AniList score (user format) back to a 0.5–10 UI value. */
export function fromAniListScore(
  score: number | null | undefined,
  format: AniListScoreFormat | string | null | undefined,
): number | null {
  if (score == null || !Number.isFinite(score) || score <= 0) return null;
  switch (format) {
    case "POINT_10":
      return normalizeUiScore(Math.round(score));
    case "POINT_10_DECIMAL":
      return normalizeUiScore(score);
    case "POINT_5":
      return normalizeUiScore(score * 2);
    case "POINT_3":
      if (score <= 1) return 3;
      if (score <= 2) return 6;
      return 9;
    case "POINT_100":
    default:
      return normalizeUiScore(score / 10);
  }
}

export async function getAniListScoreFormat(
  accessToken: string,
): Promise<AniListScoreFormat> {
  try {
    const data = await gql<{
      Viewer: { mediaListOptions?: { scoreFormat?: string | null } | null };
    }>(
      `query { Viewer { mediaListOptions { scoreFormat } } }`,
      {},
      accessToken,
    );
    const format = data.Viewer?.mediaListOptions?.scoreFormat;
    if (
      format === "POINT_100" ||
      format === "POINT_10" ||
      format === "POINT_10_DECIMAL" ||
      format === "POINT_5" ||
      format === "POINT_3"
    ) {
      return format;
    }
  } catch {
    /* default below */
  }
  return "POINT_100";
}

export type AniListMediaListScore = {
  score: number | null;
  status: string | null;
  scoreFormat: AniListScoreFormat;
  /** Normalized 1–10 for the AniKitty UI. */
  uiScore: number | null;
};

/** Read the user's list entry score for a media id (null score if not on list). */
export async function getAniListMediaScore(
  accessToken: string,
  mediaId: number,
): Promise<AniListMediaListScore | null> {
  try {
    const data = await gql<{
      Viewer: {
        id: number;
        mediaListOptions?: { scoreFormat?: string | null } | null;
      } | null;
    }>(
      `query {
        Viewer {
          id
          mediaListOptions { scoreFormat }
        }
      }`,
      {},
      accessToken,
    );
    const viewer = data.Viewer;
    if (!viewer?.id) return null;

    const rawFormat = viewer.mediaListOptions?.scoreFormat;
    const scoreFormat: AniListScoreFormat =
      rawFormat === "POINT_100" ||
      rawFormat === "POINT_10" ||
      rawFormat === "POINT_10_DECIMAL" ||
      rawFormat === "POINT_5" ||
      rawFormat === "POINT_3"
        ? rawFormat
        : "POINT_100";

    const listData = await gql<{
      MediaList: { score: number | null; status: string | null } | null;
    }>(
      `query ($userId: Int, $mediaId: Int) {
        MediaList(userId: $userId, mediaId: $mediaId) {
          score
          status
        }
      }`,
      { userId: viewer.id, mediaId },
      accessToken,
    );
    const entry = listData.MediaList;
    if (!entry) {
      return { score: null, status: null, scoreFormat, uiScore: null };
    }
    return {
      score: entry.score,
      status: entry.status,
      scoreFormat,
      uiScore: fromAniListScore(entry.score, scoreFormat),
    };
  } catch {
    return null;
  }
}

/**
 * Push a 1–10 rating to AniList (converted to the user's score format).
 * Optionally sets list status (e.g. COMPLETED) when provided.
 */
export async function updateAniListScore(
  accessToken: string,
  mediaId: number,
  uiScore: number,
  status?: "CURRENT" | "COMPLETED" | "PLANNING" | "PAUSED" | "DROPPED" | "REPEATING" | null,
): Promise<{ ok: boolean; uiScore: number; anilistScore: number }> {
  const scoreFormat = await getAniListScoreFormat(accessToken);
  const anilistScore = toAniListScore(uiScore, scoreFormat);
  const variables: Record<string, unknown> = {
    mediaId,
    score: anilistScore,
  };
  let mutation = `mutation ($mediaId: Int, $score: Float) {
    SaveMediaListEntry(mediaId: $mediaId, score: $score) {
      id score status
    }
  }`;
  if (status) {
    variables.status = status;
    mutation = `mutation ($mediaId: Int, $score: Float, $status: MediaListStatus) {
      SaveMediaListEntry(mediaId: $mediaId, score: $score, status: $status) {
        id score status
      }
    }`;
  }
  await gql(mutation, variables, accessToken);
  return {
    ok: true,
    uiScore: normalizeUiScore(uiScore),
    anilistScore,
  };
}

export async function getAniListMediaLists(accessToken: string) {
  const viewer = await getAniListViewer(accessToken);
  if (!viewer) return [];

  const data = await gql<{
    MediaListCollection: {
      lists: Array<{
        name: string;
        status: string;
        entries: Array<{
          media: {
            id: number;
            idMal?: number | null;
            bannerImage?: string | null;
            coverImage?: { large?: string | null } | null;
            title: { english?: string | null; romaji?: string | null };
          };
        }>;
      }>;
    } | null;
  }>(
    `query ($userId: Int, $type: MediaType) {
      MediaListCollection(userId: $userId, type: $type) {
        lists {
          name
          status
          entries {
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
    { userId: viewer.id, type: "ANIME" },
    accessToken,
  );
  return data.MediaListCollection?.lists ?? [];
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
