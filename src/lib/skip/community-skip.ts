import type { SkipInterval, SkipTimes } from "@/hooks/use-aniskip";

export function formatSkipSeconds(total: number): string {
  const sec = Math.max(0, Math.floor(total));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function parseSkipTimeInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const [m, s] = trimmed.split(":");
    const mins = parseInt(m, 10);
    const secs = parseInt(s ?? "0", 10);
    if (Number.isNaN(mins) || Number.isNaN(secs) || mins < 0 || secs < 0) return null;
    return mins * 60 + secs;
  }
  const n = parseFloat(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function validateSkipInterval(
  start: number | null,
  end: number | null,
): string | null {
  if (start == null && end == null) return null;
  if (start == null || end == null) return "Both start and end are required for a skip segment";
  if (start < 0 || end < 0) return "Times cannot be negative";
  if (end <= start) return "End must be after start";
  if (end - start > 600) return "Skip segment seems too long (max 10 minutes)";
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

export function intervalLabel(
  start: number | null,
  end: number | null,
): string | null {
  if (start == null || end == null) return null;
  return `${formatSkipSeconds(start)} – ${formatSkipSeconds(end)}`;
}

export function watchEpisodeUrl(anilistId: number, episode: number): string {
  const params = new URLSearchParams({
    anime: String(anilistId),
    episode: `ep-${episode}`,
  });
  return `/anime/watch?${params.toString()}`;
}
