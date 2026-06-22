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
  // Split on blank lines to get individual cue blocks
  const blocks = text.split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split("\n").map((l) => l.trim());
    // Find the timing line "HH:MM:SS.mmm --> HH:MM:SS.mmm"
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

/**
 * Reads skip times from the chapter/metadata track files that the Kitty API
 * already includes in the stream response — no external API needed.
 */
export function useSkipTimes(tracks: KittyTrack[] | undefined) {
  const chapterTrack = tracks?.find(
    (t) =>
      t.kind === "chapters" ||
      t.kind === "metadata" ||
      t.label?.toLowerCase().includes("chapter") ||
      t.label?.toLowerCase().includes("skip") ||
      t.label?.toLowerCase().includes("intro"),
  );

  return useQuery<SkipTimes>({
    queryKey: ["chapters", chapterTrack?.file],
    queryFn: () => parseChapterVtt(chapterTrack!.file),
    enabled: !!chapterTrack?.file,
    staleTime: Infinity,
    retry: false,
  });
}
