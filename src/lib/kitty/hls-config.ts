import type { HlsConfig } from "hls.js";

/**
 * hls.js settings for AniKitty’s double-hop proxy path
 * (browser → /api/kitty/hls → KittyAPI /proxy → CDN).
 *
 * Conservative ABR defaults matter: an optimistic 2.5 Mbps start without a
 * bandwidth probe often starves through the proxy and looks like endless buffering.
 */
export function createHlsConfig(opts?: { enableWebVTT?: boolean }): Partial<HlsConfig> {
  return {
    enableWorker: true,
    lowLatencyMode: false,
    backBufferLength: 30,
    maxBufferLength: 45,
    maxMaxBufferLength: 120,
    // Keep enough ahead for proxy RTT without blowing mobile RAM on FHD.
    maxBufferSize: 60 * 1000 * 1000,
    maxBufferHole: 2.5,
    maxFragLookUpTolerance: 0.75,
    // Give slow proxy fragments longer before declaring starvation.
    maxStarvationDelay: 12,
    maxLoadingDelay: 10,
    nudgeOffset: 0.2,
    nudgeMaxRetry: 8,
    // Start at lowest level; climb after real throughput samples.
    startLevel: 0,
    capLevelToPlayerSize: true,
    startFragPrefetch: true,
    testBandwidth: true,
    progressive: false,
    enableWebVTT: opts?.enableWebVTT ?? true,
    enableCEA708Captions: false,
    // Assume ~1 Mbps through the proxy until measured — safer than 2.5 Mbps.
    abrEwmaDefaultEstimate: 1_000_000,
    abrEwmaFastLive: 3,
    abrEwmaSlowLive: 9,
    abrEwmaFastVoD: 3,
    abrEwmaSlowVoD: 9,
    abrBandWidthFactor: 0.8,
    abrBandWidthUpFactor: 0.6,
    manifestLoadingTimeOut: 20_000,
    manifestLoadingMaxRetry: 5,
    manifestLoadingRetryDelay: 800,
    levelLoadingTimeOut: 20_000,
    levelLoadingMaxRetry: 5,
    levelLoadingRetryDelay: 800,
    fragLoadingTimeOut: 30_000,
    fragLoadingMaxRetry: 8,
    fragLoadingRetryDelay: 750,
    // Ensure HttpOnly playback session cookie is sent on segment requests.
    xhrSetup: (xhr) => {
      xhr.withCredentials = true;
    },
  };
}
