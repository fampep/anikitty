const VTT_TIMESTAMP_TAG = /<\d{1,2}:?\d{0,2}:?\d{1,2}[.\d]*>/g;

/** Strip WebVTT/SRT inline tags so plain-text renderers don't show raw markup. */
export function stripVttInlineMarkup(text: string): string {
  return text
    .replace(VTT_TIMESTAMP_TAG, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .trim();
}

function dedupeAdjacentCueLines(lines: string[]): string[] {
  const out: string[] = [];
  let prev = "";
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t === prev) continue;
    out.push(t);
    prev = t;
  }
  return out;
}

/** Sanitize VTT/SRT file content before serving to the player. */
export function sanitizeVttOrSrtContent(content: string): string {
  const normalized = content.replace(/\r\n/g, "\n").trimEnd();
  if (!normalized) return content;

  const blocks = normalized.split(/\n\n+/);
  const out = blocks.map((block) => {
    const lines = block.split("\n");
    const timeIdx = lines.findIndex((l) => l.includes("-->"));
    if (timeIdx === -1) return block;

    const head = lines.slice(0, timeIdx + 1);
    const cleaned = dedupeAdjacentCueLines(
      lines.slice(timeIdx + 1).map(stripVttInlineMarkup).filter(Boolean),
    );
    return [...head, ...cleaned].join("\n");
  });

  return out.length ? `${out.join("\n\n")}\n` : content;
}

export type VttCue = {
  start: string;
  end: string;
  text: string;
};

/** Parse WEBVTT / SRT-style content into display cues (first N for preview). */
export function parseVttCues(content: string, limit = 12): VttCue[] {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const blocks = normalized.split(/\n\n+/);
  const cues: VttCue[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const timeLineIdx = lines.findIndex((l) => l.includes("-->"));
    if (timeLineIdx === -1) continue;

    const [startRaw, endRaw] = lines[timeLineIdx].split("-->").map((s) => s.trim());
    const start = startRaw.split(/\s/)[0] ?? startRaw;
    const end = (endRaw ?? "").split(/\s/)[0] ?? endRaw ?? "";
    const text = dedupeAdjacentCueLines(
      lines.slice(timeLineIdx + 1).map(stripVttInlineMarkup).filter(Boolean),
    ).join("\n");

    if (text) cues.push({ start, end, text });
    if (cues.length >= limit) break;
  }

  return cues;
}

/** Strip leading hours when zero: 00:01:23.000 → 01:23 */
export function formatCueTime(raw: string): string {
  const parts = raw.split(":");
  if (parts.length === 3 && parts[0] === "00") {
    return `${parts[1]}:${parts[2].slice(0, 5)}`;
  }
  if (parts.length >= 2) {
    return parts.slice(-2).join(":").slice(0, 8);
  }
  return raw.slice(0, 8);
}
