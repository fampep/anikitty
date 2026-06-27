import type { HlsConfig } from "hls.js";

/** hls.js settings tuned for Chrome / desktop browsers streaming VOD anime. */
export function createHlsConfig(): Partial<HlsConfig> {
  return {
    enableWorker: true,
    lowLatencyMode: false,
    backBufferLength: 90,
    maxBufferLength: 30,
    maxMaxBufferLength: 600,
    maxBufferSize: 60 * 1000 * 1000,
    maxBufferHole: 0.5,
    startLevel: -1,
    capLevelToPlayerSize: true,
    startFragPrefetch: true,
    testBandwidth: true,
    progressive: true,
    enableWebVTT: true,
    enableCEA708Captions: false,
    abrEwmaDefaultEstimate: 800_000,
    manifestLoadingMaxRetry: 4,
    manifestLoadingRetryDelay: 500,
    levelLoadingMaxRetry: 4,
    levelLoadingRetryDelay: 500,
    fragLoadingMaxRetry: 6,
    fragLoadingRetryDelay: 500,
  };
}
