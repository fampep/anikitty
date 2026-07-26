/**
 * Minimal ASS/SSA → WebVTT for HTML5 `<track>` / TextTrack playback.
 * Strips override tags and keeps dialogue timing + plain text.
 */

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function pad3(n: number): string {
  if (n < 10) return `00${n}`;
  if (n < 100) return `0${n}`;
  return String(n);
}

/** ASS `H:MM:SS.CC` (centiseconds) → VTT `HH:MM:SS.mmm`. */
export function assTimeToVtt(raw: string): string | null {
  const m = raw.trim().match(/^(\d+):(\d{1,2}):(\d{1,2})[.:](\d{1,3})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const sec = Number(m[3]);
  let frac = m[4];
  // Centiseconds (2 digits) → milliseconds; keep 3-digit as-is.
  if (frac.length === 1) frac = `${frac}00`;
  else if (frac.length === 2) frac = `${frac}0`;
  else if (frac.length > 3) frac = frac.slice(0, 3);
  if (![h, min, sec].every((n) => Number.isFinite(n)) || min > 59 || sec > 59) {
    return null;
  }
  return `${pad2(h)}:${pad2(min)}:${pad2(sec)}.${pad3(Number(frac))}`;
}

/** Remove ASS override blocks and normalize line breaks. */
export function stripAssOverrides(text: string): string {
  return text
    .replace(/\{[^}]*\}/g, "")
    .replace(/\\[nN]/g, "\n")
    .replace(/\\h/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .trim();
}

/**
 * Convert ASS/SSA script body to WebVTT.
 * Returns null when no dialogue cues could be parsed.
 */
export function assToVtt(ass: string): string | null {
  const lines = ass.replace(/^\uFEFF/, "").split(/\r?\n/);
  const cues: string[] = [];
  let index = 0;

  for (const line of lines) {
    if (!/^Dialogue:/i.test(line)) continue;
    // Dialogue: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
    const body = line.replace(/^Dialogue:\s*/i, "");
    const parts = body.split(",");
    if (parts.length < 10) continue;
    const start = assTimeToVtt(parts[1] ?? "");
    const end = assTimeToVtt(parts[2] ?? "");
    if (!start || !end) continue;
    const text = stripAssOverrides(parts.slice(9).join(","));
    if (!text) continue;
    index += 1;
    cues.push(`${index}`, `${start} --> ${end}`, text, "");
  }

  if (cues.length === 0) return null;
  return ["WEBVTT", "", ...cues].join("\n");
}

/** Convert ASS/SSA to VTT when needed; pass through VTT/SRT (caller may sanitize). */
export function ensureWebVttForPlayback(opts: {
  content: string;
  url?: string;
  label?: string;
  format?: "ass" | "srt" | "vtt";
}): { content: string; format: "vtt" | "srt" | "ass" } {
  const format = opts.format;
  const looksAss =
    format === "ass" ||
    /^\[Script Info\]/im.test(opts.content) ||
    /^Dialogue:/m.test(opts.content);

  if (!looksAss) {
    return { content: opts.content, format: format ?? "vtt" };
  }

  const vtt = assToVtt(opts.content);
  if (!vtt) {
    // Keep original so download still works; playback may fail.
    return { content: opts.content, format: "ass" };
  }
  return { content: vtt, format: "vtt" };
}
