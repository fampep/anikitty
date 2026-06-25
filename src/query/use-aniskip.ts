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

/** Parse WebVTT timestamp "HH:MM:SS.mmm" or "MM:SS.mmm" → seconds */
function vttTimeToSeconds(ts: string): number {
  const parts = ts.trim().split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}

const INTRO_RE  = /^(op|intro|opening|op\s*credits?|opening\s*credits?)$/i;
const OUTRO_RE  = /^(ed|ending|outro|credits?|end\s*credits?|closing)$/i;

async function parseChapterVtt(url: string): Promise<SkipTimes> {
  const res = await fetch(url);
  if (!res.ok) return {};
  const text = await res.text();

  const out: SkipTimes = {};
  const blocks = text.split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split("\n").map((l) => l.trim());
    const timingIdx = lines.findIndex((l) => l.includes("-->"));
    if (timingIdx < 0) continue;

    const [startStr, endStr] = lines[timingIdx].split("-->").map((s) => s.trim());
    const label = lines.slice(timingIdx + 1).join(" ").trim();

    if (!startStr || !endStr || !label) continue;

    const start = vttTimeToSeconds(startStr);
    const end   = vttTimeToSeconds(endStr);

    if (INTRO_RE.test(label))  out.intro = { start, end };
    if (OUTRO_RE.test(label))  out.outro = { start, end };
  }

  return out;
}

/** AniSkip.com API — returns intro/outro times by MAL ID + episode number */
async function fetchAniSkipTimes(malId: number, episode: number): Promise<SkipTimes> {
  const url = `https://api.aniskip.com/v2/skip-times/${malId}/${episode}?types[]=op&types[]=ed&episodeLength=0`;
  const res = await fetch(url);
  if (!res.ok) return {};
  const json = await res.json();
  if (!json?.found || !Array.isArray(json.results)) return {};

  const out: SkipTimes = {};
  for (const r of json.results) {
    const start: number = r?.interval?.start_time ?? 0;
    const end: number   = r?.interval?.end_time   ?? 0;
    if (end <= start) continue;
    if (r.skip_type === "op")  out.intro = { start, end };
    if (r.skip_type === "ed")  out.outro = { start, end };
  }
  return out;
}

/**
 * Reads skip times: tries the chapter/metadata VTT track first,
 * then falls back to AniSkip.com if malId + episode are available.
 */
export function useSkipTimes(
  tracks: KittyTrack[] | undefined,
  malId?: number,
  episode?: number,
) {
  const chapterTrack = tracks?.find(
    (t) =>
      t.kind === "chapters" ||
      t.kind === "metadata" ||
      t.label?.toLowerCase().includes("chapter") ||
      t.label?.toLowerCase().includes("skip") ||
      t.label?.toLowerCase().includes("intro"),
  );

  // Primary: chapter VTT from stream
  const vttQuery = useQuery<SkipTimes>({
    queryKey: ["chapters", chapterTrack?.file],
    queryFn: () => parseChapterVtt(chapterTrack!.file),
    enabled: !!chapterTrack?.file,
    staleTime: Infinity,
    retry: false,
  });

  // Fallback: AniSkip.com
  const vttHasData = !!(vttQuery.data?.intro || vttQuery.data?.outro);
  const aniskipQuery = useQuery<SkipTimes>({
    queryKey: ["aniskip", malId, episode],
    queryFn: () => fetchAniSkipTimes(malId!, episode!),
    enabled: !!malId && !!episode && vttQuery.isFetched && !vttHasData,
    staleTime: Infinity,
    retry: false,
  });

  // Return VTT data if it has something, otherwise AniSkip
  const data = vttHasData ? vttQuery.data : (aniskipQuery.data ?? vttQuery.data);
  const isLoading = vttQuery.isLoading || (!vttHasData && aniskipQuery.isLoading);

  return { data, isLoading };
}
