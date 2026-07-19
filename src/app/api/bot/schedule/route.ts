import { authorizeBot } from "@/lib/bot/authorize-bot";
import { queryAniList, toTitle } from "@/lib/oauth/anilist";
import { animeLinks, siteBase } from "@/lib/bot/bot-anime-payload";

export const dynamic = "force-dynamic";

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
          coverImage { large }
          isAdult
        }
      }
    }
  }
`;

/**
 * GET /api/bot/schedule?limit=8
 * Today's upcoming (or recently aired) episode schedule for Discord.
 */
export async function GET(req: Request) {
  if (!authorizeBot(req)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limitRaw = Number.parseInt(searchParams.get("limit") || "8", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(20, Math.max(1, limitRaw))
    : 8;

  const date = new Date();
  date.setHours(0, 0, 0, 0);
  const startOfDay = Math.floor(date.getTime() / 1000);
  const endOfDay = startOfDay + 86400;
  const now = Math.floor(Date.now() / 1000);

  try {
    const raw = await queryAniList(QUERY, {
      airingAt_greater: startOfDay - 1,
      airingAt_lesser: endOfDay,
    });

    const schedules = (raw?.Page?.airingSchedules ?? []).filter(
      (s: any) => !s.media?.isAdult,
    );

    // Prefer upcoming; if none left today, show the most recent aired.
    const upcoming = schedules.filter((s: any) => s.airingAt >= now);
    const pool = upcoming.length ? upcoming : [...schedules].reverse();

    const items = pool.slice(0, limit).map((s: any) => {
      const id = String(s.media.id);
      const links = animeLinks(id);
      const title = toTitle(s.media.title);
      return {
        id,
        title,
        romaji: s.media.title?.romaji ?? null,
        poster: s.media.coverImage?.large ?? null,
        episode: s.episode as number,
        airingAt: s.airingAt as number,
        airingAtMs: (s.airingAt as number) * 1000,
        secondsUntilAiring: (s.airingAt as number) - now,
        url: links.primary,
        watchUrl: `${siteBase()}/anime/watch?anime=${id}`,
      };
    });

    return Response.json({
      date: date.toISOString().slice(0, 10),
      count: items.length,
      items,
      scheduleUrl: `${siteBase()}/schedule`,
    });
  } catch (err) {
    console.error("Bot schedule error:", err);
    return Response.json({
      date: date.toISOString().slice(0, 10),
      count: 0,
      items: [],
      scheduleUrl: `${siteBase()}/schedule`,
    });
  }
}
