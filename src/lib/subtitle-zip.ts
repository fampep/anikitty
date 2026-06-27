import { strToU8, zipSync } from "fflate";
import { buildSubtitleFilename } from "@/lib/subtitle-track-utils";

export type SubtitleZipEntry = {
  anilistId: number;
  episode: number;
  label: string;
  content: string;
};

export function buildSubtitleZip(entries: SubtitleZipEntry[]): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  for (const entry of entries) {
    const name = buildSubtitleFilename(entry);
    files[name] = strToU8(entry.content);
  }
  return zipSync(files);
}

export function buildSubtitleZipFilename(anilistId: number, episodes: number[]): string {
  const sorted = [...episodes].sort((a, b) => a - b);
  if (sorted.length === 1) {
    return `${anilistId}-ep${sorted[0]}-subtitles.zip`;
  }
  return `${anilistId}-ep${sorted[0]}-ep${sorted[sorted.length - 1]}-subtitles.zip`;
}
