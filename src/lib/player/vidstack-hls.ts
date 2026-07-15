import Hls, { ErrorDetails, ErrorTypes, type ErrorData } from "hls.js";
import {
  isHLSProvider,
  type MediaErrorDetail,
  type MediaProviderAdapter,
  type PlayerSrc,
} from "@vidstack/react";
import { createHlsConfig } from "@/lib/kitty/hls-config";

export function configureVidstackHlsProvider(provider: MediaProviderAdapter | null) {
  if (!isHLSProvider(provider)) return;
  provider.library = Hls;
  provider.config = createHlsConfig();
}

export function playerSrcUsesHls(src: PlayerSrc): boolean {
  if (typeof src === "string") {
    return /\.m3u8(?:\?|$)/i.test(src);
  }
  if (Array.isArray(src)) {
    return src.some((entry) => playerSrcUsesHls(entry));
  }
  if (src && typeof src === "object" && "src" in src) {
    const type = "type" in src ? String(src.type ?? "") : "";
    if (type.includes("mpegurl") || type.includes("m3u8")) return true;
    return /\.m3u8(?:\?|$)/i.test(String(src.src));
  }
  return false;
}

/** Mirror legacy Artplayer HLS fatal detection — ignore recoverable media errors. */
export function isFatalHlsError(data: ErrorData, networkRecoveries: number): boolean {
  if (!data.fatal) return false;

  if (data.type === ErrorTypes.MEDIA_ERROR) {
    return false;
  }

  if (data.type === ErrorTypes.NETWORK_ERROR) {
    const status = (data.response as { code?: number } | undefined)?.code;
    const isManifestOr404 =
      status === 404 ||
      data.details === ErrorDetails.MANIFEST_LOAD_ERROR ||
      data.details === ErrorDetails.MANIFEST_LOAD_TIMEOUT ||
      data.details === ErrorDetails.MANIFEST_PARSING_ERROR ||
      data.details === ErrorDetails.LEVEL_LOAD_ERROR;
    return isManifestOr404 || networkRecoveries >= 3;
  }

  return true;
}

/** Only report native `<video>` errors for non-HLS sources (mp4 direct play). */
export function isFatalNativeMediaError(
  detail: MediaErrorDetail,
  src: PlayerSrc,
): boolean {
  if (playerSrcUsesHls(src)) return false;
  // 2 = network, 4 = unsupported / bad resource
  return detail.code === 2 || detail.code === 4;
}
