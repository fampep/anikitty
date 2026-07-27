import type { KittyStreamQuality } from "@/lib/kitty/stream-quality";

export function parseHeight(quality: string): number | undefined {
  const n = parseInt(quality.replace(/\D/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function isResolutionQualityLadder(qualities: KittyStreamQuality[]): boolean {
  return qualities.some((entry) => Boolean(parseHeight(entry.quality)));
}

export function resolveTrackSrc(file: string): string {
  if (!file) return file;
  if (/^https?:\/\//i.test(file)) return file;
  if (typeof window !== "undefined" && file.startsWith("/")) {
    return `${window.location.origin}${file}`;
  }
  return file;
}
