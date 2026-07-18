/** WebVTT storyboard / seek-preview cues (JW Player style with `#xywh=` sprites). */

export type StoryboardCue = {
  start: number;
  end: number;
  /** Absolute image URL (sprite sheet or single frame). */
  src: string;
  /** Sprite crop; null when the cue points at a full image. */
  x: number | null;
  y: number | null;
  w: number | null;
  h: number | null;
};

const XYWH_RE = /#?xywh[=:]?\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)/i;

function vttTimeToSeconds(ts: string): number {
  const cleaned = ts.trim().replace(",", ".");
  const parts = cleaned.split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}

function resolveMediaUrl(raw: string, baseUrl?: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    if (baseUrl) return new URL(trimmed, baseUrl).toString();
    return new URL(trimmed).toString();
  } catch {
    return trimmed;
  }
}

function parseCueBody(
  bodyLines: string[],
  baseUrl?: string,
): Omit<StoryboardCue, "start" | "end"> | null {
  const joined = bodyLines.map((l) => l.trim()).filter(Boolean).join("\n");
  if (!joined) return null;

  const xywhMatch = joined.match(XYWH_RE);
  const urlPart = joined
    .replace(XYWH_RE, "")
    .split(/\n/)
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("NOTE")) ?? "";

  // Some VTTs put only `#xywh=…` on a second line with the URL on the first.
  const srcRaw = urlPart || (xywhMatch ? joined.slice(0, xywhMatch.index).trim() : "");
  const src = resolveMediaUrl(srcRaw.replace(XYWH_RE, "").trim(), baseUrl);
  if (!src) return null;

  if (xywhMatch) {
    return {
      src: src.replace(XYWH_RE, ""),
      x: Number(xywhMatch[1]),
      y: Number(xywhMatch[2]),
      w: Number(xywhMatch[3]),
      h: Number(xywhMatch[4]),
    };
  }

  // Full-image cue (no sprite region).
  return { src, x: null, y: null, w: null, h: null };
}

/** Parse a storyboard WebVTT into timed image cues. */
export function parseStoryboardVtt(content: string, baseUrl?: string): StoryboardCue[] {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) return [];

  const blocks = normalized.split(/\n\n+/);
  const cues: StoryboardCue[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trimEnd());
    if (lines.length === 0) continue;
    if (/^WEBVTT/i.test(lines[0] ?? "")) continue;
    if (/^NOTE\b/i.test(lines[0] ?? "")) continue;
    if (/^STYLE\b/i.test(lines[0] ?? "")) continue;
    if (/^REGION\b/i.test(lines[0] ?? "")) continue;

    const timeIdx = lines.findIndex((l) => l.includes("-->"));
    if (timeIdx < 0) continue;

    const [startRaw, endRaw] = lines[timeIdx].split("-->").map((s) => s.trim());
    const start = vttTimeToSeconds((startRaw ?? "").split(/\s/)[0] ?? "");
    const end = vttTimeToSeconds((endRaw ?? "").split(/\s/)[0] ?? "");
    if (!(end > start)) continue;

    const body = parseCueBody(lines.slice(timeIdx + 1), baseUrl);
    if (!body) continue;

    cues.push({ start, end, ...body });
  }

  cues.sort((a, b) => a.start - b.start);
  return cues;
}

/** Binary-search the cue covering `time` (seconds). */
export function findStoryboardCue(
  cues: readonly StoryboardCue[],
  time: number,
): StoryboardCue | null {
  if (!cues.length || !Number.isFinite(time)) return null;
  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const cue = cues[mid]!;
    if (time < cue.start) hi = mid - 1;
    else if (time >= cue.end) lo = mid + 1;
    else return cue;
  }
  // Prefer nearest previous frame when scrubbing between sparse cues.
  if (hi >= 0) {
    const prev = cues[hi]!;
    if (time >= prev.start) return prev;
  }
  return cues[0] ?? null;
}

/** Pull a storyboard VTT URL from top-level stream fields or tracks. */
export function pickStoryboardUrl(opts: {
  thumbnails?: string | null;
  thumbnails_vtt?: string | null;
  tracks?: Array<{ file?: string; url?: string; kind?: string; label?: string }> | null;
}): string | null {
  for (const candidate of [opts.thumbnails, opts.thumbnails_vtt]) {
    const trimmed = typeof candidate === "string" ? candidate.trim() : "";
    if (trimmed) return trimmed;
  }

  if (!Array.isArray(opts.tracks)) return null;
  for (const track of opts.tracks) {
    const kind = (track.kind ?? "").toLowerCase();
    const label = (track.label ?? "").toLowerCase();
    const isThumb =
      kind === "thumbnails" ||
      kind === "thumbnail" ||
      kind === "metadata" && label.includes("thumb") ||
      label.includes("thumbnail") ||
      label.includes("storyboard");
    if (!isThumb) continue;
    const file = (track.file ?? track.url)?.trim();
    if (file) return file;
  }
  return null;
}
