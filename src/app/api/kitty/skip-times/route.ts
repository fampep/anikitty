import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { skipCache } from "@/db/schema";
import { eq } from "drizzle-orm";

const INTRODB_BASE   = "https://introdb.app";
const ANILIST_GQL    = "https://graphql.anilist.co";

// ── AniList → IMDB ID ────────────────────────────────────────────────

async function getImdbId(anilistId: number): Promise<string | null> {
  const res = await fetch(ANILIST_GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query ($id: Int!) {
        Media(id: $id, type: ANIME) {
          externalLinks { url site }
        }
      }`,
      variables: { id: anilistId },
    }),
    next: { revalidate: 86400 }, // AniList data rarely changes
  });

  if (!res.ok) return null;
  const json = await res.json();
  const links: { url: string; site: string }[] =
    json?.data?.Media?.externalLinks ?? [];

  const imdbLink = links.find((l) =>
    l.site?.toLowerCase() === "imdb" ||
    l.url?.includes("imdb.com/title/"),
  );

  if (!imdbLink) return null;
  const match = imdbLink.url.match(/\/title\/(tt\d+)/);
  return match?.[1] ?? null;
}

// ── IntroDB segments ──────────────────────────────────────────────────

interface IntroDbSegment {
  segment_type: string;
  start_sec: number | string;
  end_sec: number | string;
}

function toSec(v: number | string): number {
  if (typeof v === "number") return v;
  // clock string: mm:ss or hh:mm:ss
  const parts = String(v).split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(v) || 0;
}

async function fetchIntroDb(
  imdbId: string,
  episode: number,
  season = 1,
): Promise<{ introStart: number | null; introEnd: number | null; outroStart: number | null; outroEnd: number | null }> {
  const url = `${INTRODB_BASE}/segments?imdb_id=${imdbId}&season=${season}&episode=${episode}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return { introStart: null, introEnd: null, outroStart: null, outroEnd: null };

  const json = await res.json();
  const segments: IntroDbSegment[] = json?.segments ?? [];

  let introStart: number | null = null;
  let introEnd:   number | null = null;
  let outroStart: number | null = null;
  let outroEnd:   number | null = null;

  for (const seg of segments) {
    const type = seg.segment_type?.toLowerCase();
    if (type === "intro" && introStart === null) {
      introStart = toSec(seg.start_sec);
      introEnd   = toSec(seg.end_sec);
    }
    if ((type === "outro" || type === "credits") && outroStart === null) {
      outroStart = toSec(seg.start_sec);
      outroEnd   = toSec(seg.end_sec);
    }
  }

  return { introStart, introEnd, outroStart, outroEnd };
}

// ── Route ────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const anilistId = parseInt(searchParams.get("anilistId") ?? "");
  const episode   = parseFloat(searchParams.get("episode") ?? "");
  const season    = parseInt(searchParams.get("season") ?? "1") || 1;

  if (!anilistId || isNaN(episode)) return NextResponse.json({});

  const cacheKey = `introdb:${anilistId}:${season}:${episode}`;
  const db = getDb();

  // 1 — Cache hit
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

  // 2 — Get IMDB ID from AniList
  const imdbId = await getImdbId(anilistId).catch(() => null);

  let row = { introStart: null as number | null, introEnd: null as number | null,
              outroStart: null as number | null, outroEnd: null as number | null };

  if (imdbId) {
    row = await fetchIntroDb(imdbId, episode, season).catch(() => row);
  }

  // 3 — Cache (including empty results so we don't hammer the APIs again)
  await db
    .insert(skipCache)
    .values({ cacheKey, ...row })
    .onConflictDoUpdate({
      target: skipCache.cacheKey,
      set: { ...row, fetchedAt: new Date() },
    })
    .catch(() => {});

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
