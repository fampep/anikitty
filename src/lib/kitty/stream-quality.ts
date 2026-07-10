export type KittyStreamQuality = {
  quality: string;
  file: string;
};

export function parseKittyStreamQualities(raw: unknown): KittyStreamQuality[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: KittyStreamQuality[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const file =
      typeof row.file === "string"
        ? row.file.trim()
        : typeof row.url === "string"
          ? row.url.trim()
          : "";
    if (!file) continue;
    const quality =
      (typeof row.quality === "string" && row.quality.trim()) ||
      (typeof row.name === "string" && row.name.trim()) ||
      "Auto";
    out.push({ quality, file });
  }
  return out.length > 0 ? out : undefined;
}

function qualityRank(label: string): number {
  const n = parseInt(label.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

export function sortStreamQualities(qualities: KittyStreamQuality[]): KittyStreamQuality[] {
  return [...qualities].sort((a, b) => qualityRank(b.quality) - qualityRank(a.quality));
}

export function formatStreamQualityLabel(quality: string): string {
  const trimmed = quality.trim();
  if (!trimmed) return "Auto";
  const height = qualityRank(trimmed);
  if (height > 0) {
    const tier = height <= 480 ? "SD" : height <= 720 ? "HD" : "FHD";
    return `${tier} ${height}P`;
  }
  return trimmed.toUpperCase();
}

export function dedupeStreamQualities(qualities: KittyStreamQuality[]): KittyStreamQuality[] {
  const seen = new Set<string>();
  const out: KittyStreamQuality[] = [];
  for (const q of sortStreamQualities(qualities)) {
    const key = q.file.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}
