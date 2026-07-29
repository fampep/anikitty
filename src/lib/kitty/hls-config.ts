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
  /**
   * EarnVids / StreamHG (AniVibe): prefetch the start fragment before play()
   * so we don't wait forever for FRAG_BUFFERED with startFragPrefetch off.
   */
  prefetchStartFrag?: boolean;
}): Partial<HlsConfig> {
  const lite = Boolean(opts?.lite);
  const prefetchStartFrag = Boolean(opts?.prefetchStartFrag);
  return {
    enableWorker: true,
    lowLatencyMode: false,
    backBufferLength: lite ? 4 : 8,
    // EarnVids: smaller forward target so we declare "enough buffer" sooner.
    maxBufferLength: prefetchStartFrag ? (lite ? 8 : 10) : lite ? 12 : 18,
    maxMaxBufferLength: prefetchStartFrag ? (lite ? 14 : 18) : lite ? 20 : 28,
    // Cap forward media buffer so watch tabs stay lighter on phones/desktops.
    maxBufferSize: (lite ? 10 : 16) * 1000 * 1000,
    maxBufferHole: 2.5,
    maxFragLookUpTolerance: 0.75,
    maxStarvationDelay: prefetchStartFrag ? 8 : 12,
    maxLoadingDelay: prefetchStartFrag ? 6 : 10,
    nudgeOffset: 0.2,
    nudgeMaxRetry: 8,
    startLevel: 0,
    capLevelToPlayerSize: true,
    // Default false elsewhere (saves bandwidth). AniVibe needs true so the
    // first fragment arrives before/without waiting on play().
    startFragPrefetch: prefetchStartFrag,
    autoStartLoad: true,
    testBandwidth: !prefetchStartFrag,
    progressive: false,
    enableWebVTT: opts?.enableWebVTT ?? true,
    // KittyPlayer paints cues in HTML (PlayerSubtitleOverlay). Native TextTrack
    // rendering + hls.js subtitleDisplay:"showing" fights our CC toggle and
    // leaves captions stuck on (especially with external <track> softsubs).
    renderTextTracksNatively: false,
    enableCEA708Captions: false,
    abrEwmaDefaultEstimate: prefetchStartFrag ? 1_200_000 : 800_000,
    abrEwmaFastLive: 3,
    abrEwmaSlowLive: 9,
    abrEwmaFastVoD: 3,
    abrEwmaSlowVoD: 9,
    abrBandWidthFactor: 0.75,
    abrBandWidthUpFactor: 0.55,
    manifestLoadingTimeOut: prefetchStartFrag ? 12_000 : 20_000,
    manifestLoadingMaxRetry: prefetchStartFrag ? 3 : 5,
    manifestLoadingRetryDelay: 600,
    levelLoadingTimeOut: prefetchStartFrag ? 12_000 : 20_000,
    levelLoadingMaxRetry: prefetchStartFrag ? 3 : 5,
    levelLoadingRetryDelay: 600,
    fragLoadingTimeOut: prefetchStartFrag ? 20_000 : 30_000,
    fragLoadingMaxRetry: prefetchStartFrag ? 5 : 8,
    fragLoadingRetryDelay: 500,
    xhrSetup: (xhr) => {
      xhr.withCredentials = true;
    },
  };
}
