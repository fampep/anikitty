import type { SkipTimes } from "@/hooks/use-aniskip";

export type SkipSegmentKind = "intro" | "outro" | "recap";

export type SkipSegment = {
  kind: SkipSegmentKind;
  start: number;
  end: number;
};

export function buildSkipSegments(skipTimes?: SkipTimes | null): SkipSegment[] {
  if (!skipTimes) return [];
  const out: SkipSegment[] = [];
  if (
    skipTimes.recap &&
    Number.isFinite(skipTimes.recap.start) &&
    Number.isFinite(skipTimes.recap.end) &&
    skipTimes.recap.end > skipTimes.recap.start
  ) {
    out.push({ kind: "recap", start: skipTimes.recap.start, end: skipTimes.recap.end });
  }
  if (
    skipTimes.intro &&
    Number.isFinite(skipTimes.intro.start) &&
    Number.isFinite(skipTimes.intro.end) &&
    skipTimes.intro.end > skipTimes.intro.start
  ) {
    out.push({ kind: "intro", start: skipTimes.intro.start, end: skipTimes.intro.end });
  }
  if (
    skipTimes.outro &&
    Number.isFinite(skipTimes.outro.start) &&
    Number.isFinite(skipTimes.outro.end) &&
    skipTimes.outro.end > skipTimes.outro.start
  ) {
    out.push({ kind: "outro", start: skipTimes.outro.start, end: skipTimes.outro.end });
  }
  return out;
}

export function skipKindLabel(kind: SkipSegmentKind): string {
  if (kind === "intro") return "Intro";
  if (kind === "recap") return "Recap";
  return "Credits";
}

export function segmentAtTime(
  segments: SkipSegment[],
  time: number,
): SkipSegment | undefined {
  return segments.find((seg) => time >= seg.start && time < seg.end);
}
