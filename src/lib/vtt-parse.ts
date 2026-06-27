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
    const text = lines.slice(timeLineIdx + 1).join("\n").replace(/<[^>]+>/g, "");

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
