import type { SkipInterval, SkipTimes } from "@/hooks/use-aniskip";

export const SKIP_SEGMENT_TYPES = ["intro", "recap", "credits", "preview"] as const;
export type SkipSegmentType = (typeof SKIP_SEGMENT_TYPES)[number];

export function isSkipSegmentType(value: unknown): value is SkipSegmentType {
  return typeof value === "string" && (SKIP_SEGMENT_TYPES as readonly string[]).includes(value);
}

export function formatSkipSeconds(total: number): string {
  const sec = Math.max(0, Math.floor(total));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Accept ss, mm:ss, or hh:mm:ss. */
export function parseSkipTimeInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":").map((p) => p.trim());
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10);
      const secs = parseFloat(parts[1]);
      if (Number.isNaN(mins) || Number.isNaN(secs) || mins < 0 || secs < 0) return null;
      return mins * 60 + secs;
    }
    if (parts.length === 3) {
      const hours = parseInt(parts[0], 10);
      const mins = parseInt(parts[1], 10);
      const secs = parseFloat(parts[2]);
      if (
        Number.isNaN(hours) ||
        Number.isNaN(mins) ||
        Number.isNaN(secs) ||
        hours < 0 ||
        mins < 0 ||
        secs < 0
      ) {
        return null;
      }
      return hours * 3600 + mins * 60 + secs;
    }
    return null;
  }
  const n = parseFloat(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Parse AniList absolute episode lists: `1`, `1,3,5`, `5-8`, `1,3,5-8`.
 */
export function parseEpisodeList(raw: string): number[] {
  const out = new Set<number>();
  const chunks = raw.split(",").map((c) => c.trim()).filter(Boolean);
  for (const chunk of chunks) {
    if (chunk.includes("-")) {
      const [a, b] = chunk.split("-", 2).map((x) => parseInt(x.trim(), 10));
      if (!Number.isFinite(a) || !Number.isFinite(b) || a < 1 || b < 1) continue;
      const from = Math.min(a, b);
      const to = Math.max(a, b);
      if (to - from > 200) continue;
      for (let n = from; n <= to; n++) out.add(n);
    } else {
      const n = parseInt(chunk, 10);
      if (Number.isFinite(n) && n >= 1) out.add(n);
    }
  }
  return [...out].sort((x, y) => x - y);
}

export function validateSkipInterval(
  start: number | null,
  end: number | null,
): string | null {
  if (start == null && end == null) return null;
  if (end == null) return "End time is required";
  const s = start ?? 0;
  if (s < 0 || end < 0) return "Times cannot be negative";
  if (end <= s) return "End must be after start";
  if (end - s > 600) return "Skip segment seems too long (max 10 minutes)";
  return null;
}

/** IntroDB-style: start optional (defaults 0), end required unless noSegment. */
export function validateSkipSegment(opts: {
  start: number | null;
  end: number | null;
  duration?: number | null;
  noSegment?: boolean;
}): string | null {
  if (opts.noSegment) return null;
  const err = validateSkipInterval(opts.start ?? 0, opts.end);
  if (err) return err;
  if (opts.duration != null && opts.end != null && opts.end > opts.duration + 1) {
    return "End cannot be after the video duration";
  }
  const len = (opts.end ?? 0) - (opts.start ?? 0);
  if (len > 0 && len < 1) return "Segment is too short";
  return null;
}

export function rowToSkipTimes(row: {
  introStart: number | null;
  introEnd: number | null;
  outroStart: number | null;
  outroEnd: number | null;
}): SkipTimes {
  const out: SkipTimes = {};
  if (row.introStart != null && row.introEnd != null) {
    out.intro = { start: row.introStart, end: row.introEnd };
  }
  if (row.outroStart != null && row.outroEnd != null) {
    out.outro = { start: row.outroStart, end: row.outroEnd };
  }
  return out;
}

export function segmentsToSkipTimes(
  rows: Array<{
    segmentType: string;
    startSec: number | null;
    endSec: number | null;
    noSegment?: boolean | null;
  }>,
): SkipTimes {
  const out: SkipTimes = {};
  for (const row of rows) {
    if (row.noSegment) continue;
    if (row.startSec == null || row.endSec == null) continue;
    const iv: SkipInterval = { start: row.startSec, end: row.endSec };
    if (row.segmentType === "intro") out.intro = iv;
    else if (row.segmentType === "credits") out.outro = iv;
    else if (row.segmentType === "recap") out.recap = iv;
    else if (row.segmentType === "preview") out.preview = iv;
  }
  return out;
}

export function intervalLabel(
  start: number | null,
  end: number | null,
): string | null {
  if (start == null || end == null) return null;
  return `${formatSkipSeconds(start)} – ${formatSkipSeconds(end)}`;
}

export function segmentTypeLabel(type: string): string {
  switch (type) {
    case "intro":
      return "Intro";
    case "recap":
      return "Recap";
    case "credits":
      return "Credits";
    case "preview":
      return "Preview";
    default:
      return type;
  }
}

export function watchEpisodeUrl(anilistId: number, episode: number): string {
  const params = new URLSearchParams({
    anime: String(anilistId),
    episode: `ep-${episode}`,
  });
  return `/anime/watch?${params.toString()}`;
}

export function animeDetailUrl(anilistId: number): string {
  return `/anime/${anilistId}`;
}
