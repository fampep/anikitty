import { queryAniList, toTitle } from "@/lib/oauth/anilist";

const QUERY = `
  query ($airingAt_greater: Int, $airingAt_lesser: Int) {
    Page(page: 1, perPage: 50) {
      airingSchedules(
        airingAt_greater: $airingAt_greater
        airingAt_lesser: $airingAt_lesser
        sort: TIME
      ) {
        episode
        airingAt
        media {
          id
          title { english romaji }
          coverImage { extraLarge large }
        }
      }
    }
  }
`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");

  const date = dateStr ? new Date(dateStr) : new Date();
  date.setHours(0, 0, 0, 0);
  const startOfDay = Math.floor(date.getTime() / 1000);
  const endOfDay = startOfDay + 86400;

  try {
    const raw = await queryAniList(QUERY, {
      airingAt_greater: startOfDay - 1,
      airingAt_lesser: endOfDay,
    });

    const now = Math.floor(Date.now() / 1000);
    const scheduledAnimes = (raw.Page?.airingSchedules ?? []).map((s: any) => ({
      id: String(s.media.id),
      name: toTitle(s.media.title),
      jname: s.media.title?.romaji ?? "",
      poster:
        s.media.coverImage?.extraLarge ??
        s.media.coverImage?.large ??
        null,
      time: new Date(s.airingAt * 1000).toISOString(),
      airingTimestamp: s.airingAt * 1000,
      secondsUntilAiring: s.airingAt - now,
      episode: s.episode,
    }));

    return Response.json({ data: { scheduledAnimes } });
  } catch (err) {
    console.error("AniList schedule error:", err);
    return Response.json({ data: { scheduledAnimes: [] } });
  }
}
