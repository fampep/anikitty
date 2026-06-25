import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { skipCache } from "@/db/schema";
import { eq } from "drizzle-orm";

const ANIME_SKIP_API = "https://api.anime-skip.com/graphql";
const ANIME_SKIP_KEY = "sVGouiJe0dwZGFMDoKLm5rFAkVcvZEPI";

// Timestamp type names from anime-skip that map to intro / outro
const INTRO_TYPES  = new Set(["intro", "new-intro", "mixed-intro"]);
const OUTRO_TYPES  = new Set(["credits", "new-credits", "mixed-credits", "outro"]);

interface AnimeSkipTimestamp { at: number; type: { name: string } }

async function fetchFromAnimeSkip(
  showName: string,
  episodeNumber: number,
): Promise<{ introStart: number | null; introEnd: number | null; outroStart: number | null; outroEnd: number | null }> {
  const query = `
    query FindEpisodes($showName: String!, $episodeNumber: Float!) {
      findEpisodesByShowName(showName: $showName, episodeNumber: $episodeNumber) {
        timestamps {
          at
          type { name }
        }
      }
    }
  `;

  const res = await fetch(ANIME_SKIP_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Client-ID": ANIME_SKIP_KEY,
    },
    body: JSON.stringify({ query, variables: { showName, episodeNumber } }),
    next: { revalidate: 0 },
  });

  if (!res.ok) throw new Error(`anime-skip ${res.status}`);

  const json = await res.json();
  const episodes: { timestamps: AnimeSkipTimestamp[] }[] =
    json?.data?.findEpisodesByShowName ?? [];

  // Pick the first episode result that has any timestamps
  const ep = episodes.find((e) => e.timestamps?.length > 0);
  if (!ep) return { introStart: null, introEnd: null, outroStart: null, outroEnd: null };

  // Sort timestamps ascending by time
  const sorted = [...ep.timestamps].sort((a, b) => a.at - b.at);

  let introStart: number | null = null;
  let introEnd:   number | null = null;
  let outroStart: number | null = null;
  let outroEnd:   number | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const ts = sorted[i];
    const nextAt = sorted[i + 1]?.at ?? ts.at + 90; // 90s fallback for last segment

    if (INTRO_TYPES.has(ts.type.name) && introStart === null) {
      introStart = ts.at;
      introEnd   = nextAt;
    }
    if (OUTRO_TYPES.has(ts.type.name) && outroStart === null) {
      outroStart = ts.at;
      outroEnd   = nextAt;
    }
  }

  return { introStart, introEnd, outroStart, outroEnd };
}

// ── Route ────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title   = searchParams.get("title")?.trim();
  const episode = searchParams.get("episode");

  if (!title || !episode) return NextResponse.json({});

  const epNum    = parseFloat(episode);
  if (isNaN(epNum)) return NextResponse.json({});

  const cacheKey = `${title.toLowerCase()}:${epNum}`;

  const db = getDb();

  // 1 — Check cache
  const [cached] = await db
    .select()
    .from(skipCache)
    .where(eq(skipCache.cacheKey, cacheKey))
    .limit(1);

  if (cached) {
    return NextResponse.json({
      intro: cached.introStart !== null && cached.introEnd !== null
        ? { start: cached.introStart, end: cached.introEnd }
        : undefined,
      outro: cached.outroStart !== null && cached.outroEnd !== null
        ? { start: cached.outroStart, end: cached.outroEnd }
        : undefined,
      cached: true,
    });
  }

  // 2 — Fetch from anime-skip.com
  let row: { introStart: number | null; introEnd: number | null; outroStart: number | null; outroEnd: number | null };
  try {
    row = await fetchFromAnimeSkip(title, epNum);
  } catch {
    return NextResponse.json({});
  }

  // 3 — Persist (even a null result, so we don't keep hitting the API)
  await db
    .insert(skipCache)
    .values({ cacheKey, ...row })
    .onConflictDoUpdate({
      target: skipCache.cacheKey,
      set: { ...row, fetchedAt: new Date() },
    })
    .catch(() => {}); // non-fatal

  return NextResponse.json({
    intro: row.introStart !== null && row.introEnd !== null
      ? { start: row.introStart, end: row.introEnd }
      : undefined,
    outro: row.outroStart !== null && row.outroEnd !== null
      ? { start: row.outroStart, end: row.outroEnd }
      : undefined,
    cached: false,
  });
}
