import { useQuery } from "react-query";
import type { KittyTrack } from "./get-kitty-stream";

export interface SkipInterval {
  start: number; // seconds
  end: number;
}

export interface SkipTimes {
  intro?: SkipInterval;
  outro?: SkipInterval;
}

// ── 1. Chapter VTT from stream tracks ────────────────────────────────

function vttTimeToSeconds(ts: string): number {
  const parts = ts.trim().split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}

const INTRO_RE = /^(op|intro|opening|op\s*credits?|opening\s*credits?)$/i;
const OUTRO_RE = /^(ed|ending|outro|credits?|end\s*credits?|closing)$/i;

async function parseChapterVtt(url: string): Promise<SkipTimes> {
  const res = await fetch(url);
  if (!res.ok) return {};
  const text = await res.text();
  const out: SkipTimes = {};

  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.trim().split("\n").map((l) => l.trim());
    const timingIdx = lines.findIndex((l) => l.includes("-->"));
    if (timingIdx < 0) continue;

    const [startStr, endStr] = lines[timingIdx].split("-->").map((s) => s.trim());
    const label = lines.slice(timingIdx + 1).join(" ").trim();
    if (!startStr || !endStr || !label) continue;

    const start = vttTimeToSeconds(startStr);
    const end   = vttTimeToSeconds(endStr);
    if (INTRO_RE.test(label)) out.intro = { start, end };
    if (OUTRO_RE.test(label)) out.outro = { start, end };
  }

  return out;
}

// ── 2. anime-skip.com via server-side cached route ────────────────────

async function fetchAnimeSkipTimes(title: string, episode: number): Promise<SkipTimes> {
  const url = `/api/kitty/skip-times?title=${encodeURIComponent(title)}&episode=${episode}`;
  const res = await fetch(url);
  if (!res.ok) return {};
  return res.json() as Promise<SkipTimes>;
}

// ── 3. M3U8 #EXT-X-DATERANGE parsing (last resort) ───────────────────

function parseHlsAttrs(attrStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([A-Z0-9-]+)=("(?:[^"\\]|\\.)*"|[^,\s]+)/g;
  let m;
  while ((m = re.exec(attrStr)) !== null) {
    attrs[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return attrs;
}

function parseMediaPlaylistText(text: string): SkipTimes {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const out: SkipTimes = {};
  let programDateTimeMs: number | null = null;

  for (const line of lines) {
    if (line.startsWith("#EXT-X-PROGRAM-DATE-TIME:")) {
      programDateTimeMs = new Date(line.slice(25).trim()).getTime();
      continue;
    }
    if (line.startsWith("#EXT-X-DATERANGE:")) {
      if (programDateTimeMs === null) continue;
      const attrs = parseHlsAttrs(line.slice(17));
      const id    = (attrs.ID ?? "").toLowerCase();
      const startDate = attrs["START-DATE"];
      const dur   = parseFloat(attrs.DURATION ?? "0");
      if (!startDate || isNaN(dur) || dur <= 0) continue;
      const offsetSec = (new Date(startDate).getTime() - programDateTimeMs) / 1000;
      if (offsetSec < 0) continue;
      const interval: SkipInterval = { start: offsetSec, end: offsetSec + dur };
      if (INTRO_RE.test(id)) out.intro = interval;
      if (OUTRO_RE.test(id)) out.outro = interval;
    }
  }

  return out;
}

async function parseM3u8SkipTimes(src: string, referer: string): Promise<SkipTimes> {
  const toProxy = (u: string) =>
    `/api/kitty/hls?url=${encodeURIComponent(u)}${referer ? `&referer=${encodeURIComponent(referer)}` : ""}`;

  try {
    const masterRes = await fetch(toProxy(src));
    if (!masterRes.ok) return {};
    const masterText = await masterRes.text();

    if (!masterText.includes("#EXT-X-STREAM-INF:")) {
      return parseMediaPlaylistText(masterText);
    }

    const lines = masterText.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith("#EXT-X-STREAM-INF:")) {
        for (let j = i + 1; j < lines.length; j++) {
          const next = lines[j].trim();
          if (next && !next.startsWith("#")) {
            const mediaRes = await fetch(next);
            if (!mediaRes.ok) return {};
            return parseMediaPlaylistText(await mediaRes.text());
          }
        }
      }
    }
  } catch {
    // silently fail
  }

  return {};
}

// ── Combined hook ─────────────────────────────────────────────────────

export function useSkipTimes(
  tracks: KittyTrack[] | undefined,
  m3u8Src?: string,
  referer?: string,
  animeName?: string,
  episodeNumber?: number,
) {
  const chapterTrack = tracks?.find(
    (t) =>
      t.kind === "chapters" ||
      t.kind === "metadata" ||
      t.label?.toLowerCase().includes("chapter") ||
      t.label?.toLowerCase().includes("skip") ||
      t.label?.toLowerCase().includes("intro"),
  );

  // 1 — Chapter VTT from the stream (best source)
  const vttQuery = useQuery<SkipTimes>({
    queryKey: ["chapters", chapterTrack?.file],
    queryFn: () => parseChapterVtt(chapterTrack!.file),
    enabled: !!chapterTrack?.file,
    staleTime: Infinity,
    retry: false,
  });
  const vttHasData = !!(vttQuery.data?.intro || vttQuery.data?.outro);

  // 2 — anime-skip.com API with server-side DB cache
  const animeSkipQuery = useQuery<SkipTimes>({
    queryKey: ["anime-skip", animeName, episodeNumber],
    queryFn: () => fetchAnimeSkipTimes(animeName!, episodeNumber!),
    enabled: !!animeName && !!episodeNumber && vttQuery.isFetched && !vttHasData,
    staleTime: Infinity,
    retry: false,
  });
  const animeSkipHasData = !!(animeSkipQuery.data?.intro || animeSkipQuery.data?.outro);

  // 3 — m3u8 DATERANGE markers (last resort)
  const m3u8Query = useQuery<SkipTimes>({
    queryKey: ["m3u8-chapters", m3u8Src],
    queryFn: () => parseM3u8SkipTimes(m3u8Src!, referer ?? ""),
    enabled: !!m3u8Src && animeSkipQuery.isFetched && !animeSkipHasData && !vttHasData,
    staleTime: Infinity,
    retry: false,
  });

  const data = vttHasData
    ? vttQuery.data
    : animeSkipHasData
      ? animeSkipQuery.data
      : (m3u8Query.data ?? vttQuery.data);

  const isLoading =
    vttQuery.isLoading ||
    (!vttHasData && animeSkipQuery.isLoading) ||
    (!vttHasData && !animeSkipHasData && m3u8Query.isLoading);

  return { data, isLoading };
}
