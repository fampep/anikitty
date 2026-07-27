import type { HlsConfig } from "hls.js";

/**
 * hls.js settings for AniKitty’s double-hop proxy path
 * (browser → /api/kitty/hls → KittyAPI /proxy → CDN).
 *
 * Keep buffers modest — every second of FHD ahead is megabytes of RAM in the tab.
 */
export function createHlsConfig(opts?: {
  enableWebVTT?: boolean;
  /** Smaller forward/back buffers for low-memory / Save-Data devices. */
  lite?: boolean;
}): Partial<HlsConfig> {
  const lite = Boolean(opts?.lite);
  return {
    enableWorker: true,
    lowLatencyMode: false,
    backBufferLength: lite ? 4 : 8,
    maxBufferLength: lite ? 12 : 18,
    maxMaxBufferLength: lite ? 20 : 28,
    // Cap forward media buffer so watch tabs stay lighter on phones/desktops.
    maxBufferSize: (lite ? 10 : 16) * 1000 * 1000,
    maxBufferHole: 2.5,
    maxFragLookUpTolerance: 0.75,
    maxStarvationDelay: 12,
    maxLoadingDelay: 10,
    nudgeOffset: 0.2,
    nudgeMaxRetry: 8,
    startLevel: 0,
    capLevelToPlayerSize: true,
    startFragPrefetch: false,
    testBandwidth: true,
    progressive: false,
    enableWebVTT: opts?.enableWebVTT ?? true,
    enableCEA708Captions: false,
    abrEwmaDefaultEstimate: 800_000,
    abrEwmaFastLive: 3,
    abrEwmaSlowLive: 9,
    abrEwmaFastVoD: 3,
    abrEwmaSlowVoD: 9,
    abrBandWidthFactor: 0.75,
    abrBandWidthUpFactor: 0.55,
    manifestLoadingTimeOut: 20_000,
    manifestLoadingMaxRetry: 5,
    manifestLoadingRetryDelay: 800,
    levelLoadingTimeOut: 20_000,
    levelLoadingMaxRetry: 5,
    levelLoadingRetryDelay: 800,
    fragLoadingTimeOut: 30_000,
    fragLoadingMaxRetry: 8,
    fragLoadingRetryDelay: 750,
    xhrSetup: (xhr) => {
      xhr.withCredentials = true;
    },
  };
}
