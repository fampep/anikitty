import type { PlayerSrc } from "@vidstack/react";
import { buildKittyHlsUrl } from "@/lib/kitty/kitty-hls-url";
import type { KittyApiNodeId } from "@/lib/kitty/kitty-api-nodes";
import { resolveKittyStreamType } from "@/lib/kitty/stream-format";
import {
  dedupeStreamQualities,
  formatStreamQualityLabel,
  type KittyStreamQuality,
} from "@/lib/kitty/stream-quality";

function parseHeight(quality: string): number | undefined {
  const n = parseInt(quality.replace(/\D/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function mimeForStream(type: "m3u8" | "mp4") {
  return type === "m3u8" ? "application/x-mpegurl" : "video/mp4";
}

export function buildVidstackPlayerSrc(
  src: string,
  qualities: KittyStreamQuality[],
  headers: Record<string, string>,
  nodeId?: KittyApiNodeId,
): PlayerSrc {
  const deduped = dedupeStreamQualities(qualities);
  const primaryType = resolveKittyStreamType(src, deduped);

  if (deduped.length > 1) {
    return deduped.map((entry) => {
      const entryType = resolveKittyStreamType(entry.file, [entry]);
      const height = parseHeight(entry.quality);
      return {
        src: buildKittyHlsUrl(entry.file, headers, nodeId),
        type: mimeForStream(entryType),
        ...(height ? { height } : {}),
        label: formatStreamQualityLabel(entry.quality),
      };
    });
  }

  return {
    src: buildKittyHlsUrl(src, headers, nodeId),
    type: mimeForStream(primaryType),
  };
}
