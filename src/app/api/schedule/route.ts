import { queryAniList, toTitle } from "@/lib/oauth/anilist";
import { fetchMalScheduleForDate } from "@/lib/anime/mal-fallback";
import { resolveScheduleAudio } from "@/lib/anime/schedule-format";
import { getAudioAvailability } from "@/lib/providers/anikoto-availability";
import { getBatchStoredAudioAvailability } from "@/lib/watch/anime-audio-store";

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
          idMal
          status
          title { english romaji }
          coverImage { extraLarge large }
        }
      }
    }
  }
`;

const AUDIO_REFRESH_BUDGET = 8;

type ScheduleRawItem = {
  id: string;
  name: string;
  jname: string;
  malId: number | null;
  status: string | null;
  poster: string | null;
  time: string;
  airingTimestamp: number;
  secondsUntilAiring: number;
  episode: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");

  const date = dateStr ? new Date(dateStr) : new Date();
  date.setHours(0, 0, 0, 0);
  const startOfDay = Math.floor(date.getTime() / 1000);
  const endOfDay = startOfDay + 86400;

  try {
    let schedules: any[];
    try {
      const raw = await queryAniList(QUERY, {
        airingAt_greater: startOfDay - 1,
        airingAt_lesser: endOfDay,
      });
      schedules = raw.Page?.airingSchedules ?? [];
    } catch (err) {
      // AniList is down — rebuild the day from MAL broadcast slots. Episode
      // numbers aren't recoverable that way, so they come back as 0.
      console.error("[schedule] AniList query failed, falling back to MAL:", err);
      const slots = await fetchMalScheduleForDate(date);
      if (slots.length === 0) throw err;
      schedules = slots.map(({ media, airingAt }) => ({
        episode: 0,
        airingAt,
        media: {
          id: media.id,
          idMal: media.idMal,
          status: media.status,
          title: { english: media.title.english, romaji: media.title.romaji },
          coverImage: media.coverImage,
        },
      }));
    }

    const now = Math.floor(Date.now() / 1000);
    const rawItems: ScheduleRawItem[] = schedules.map((s: any) => ({
      id: String(s.media.id),
      name: toTitle(s.media.title),
      jname: s.media.title?.romaji ?? "",
      malId: s.media.idMal as number | null,
      status: s.media.status as string | null,
      poster:
        s.media.coverImage?.extraLarge ??
        s.media.coverImage?.large ??
        null,
      time: new Date(s.airingAt * 1000).toISOString(),
      airingTimestamp: s.airingAt * 1000,
      secondsUntilAiring: s.airingAt - now,
      episode: s.episode,
    }));

    const anilistIds = rawItems
      .map((item) => parseInt(item.id, 10))
      .filter((id) => !Number.isNaN(id) && id > 0);
    const audioBatch = await getBatchStoredAudioAvailability(anilistIds);

    let refreshBudget = AUDIO_REFRESH_BUDGET;
    const scheduledAnimes = rawItems.map((item) => {
      const anilistId = parseInt(item.id, 10);
      const row = audioBatch.get(anilistId);
      const dubCount = row?.dubCount ?? 0;

      if (refreshBudget > 0 && !row) {
        refreshBudget -= 1;
        void getAudioAvailability({
          anilistId,
          malId: item.malId,
          titles: [item.name, item.jname],
          fallbackSub: item.episode,
          status: item.status,
        }).catch(() => {});
      }

      const { malId: _malId, status: _status, ...rest } = item;
      return {
        ...rest,
        audio: resolveScheduleAudio(item.episode, item.secondsUntilAiring, dubCount),
      };
    });

    return Response.json({ data: { scheduledAnimes } });
  } catch (err) {
    console.error("AniList schedule error:", err);
    return Response.json({ data: { scheduledAnimes: [] } });
  }
}
