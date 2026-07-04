import type { HlsConfig } from "hls.js";

/** hls.js settings tuned for Chrome / desktop browsers streaming VOD anime. */
export function createHlsConfig(opts?: { enableWebVTT?: boolean }): Partial<HlsConfig> {
  return {
    enableWorker: true,
    lowLatencyMode: false,
    backBufferLength: 30,
    maxBufferLength: 60,
    maxMaxBufferLength: 600,
    maxBufferSize: 80 * 1000 * 1000,
    maxBufferHole: 1,
    maxFragLookUpTolerance: 0.5,
    maxStarvationDelay: 4,
    maxLoadingDelay: 4,
    nudgeOffset: 0.1,
    nudgeMaxRetry: 5,
    startLevel: -1,
    capLevelToPlayerSize: true,
    startFragPrefetch: true,
    testBandwidth: false,
    progressive: false,
    enableWebVTT: opts?.enableWebVTT ?? true,
    enableCEA708Captions: false,
    abrEwmaDefaultEstimate: 2_500_000,
    manifestLoadingMaxRetry: 4,
    manifestLoadingRetryDelay: 500,
    levelLoadingMaxRetry: 4,
    levelLoadingRetryDelay: 500,
    fragLoadingMaxRetry: 6,
    fragLoadingRetryDelay: 500,
  };
}
