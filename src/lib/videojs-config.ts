/** Video.js VHS (@videojs/http-streaming) options for proxied anime HLS. */
export function createVideoJsVhsOptions() {
  return {
    overrideNative: true,
    enableLowInitialPlaylist: true,
    smoothQualityChange: true,
    bandwidth: 800_000,
    maxPlaylistRetries: 4,
    maxSegmentRetries: 6,
  };
}

export function createVideoJsHtml5Options() {
  return {
    vhs: createVideoJsVhsOptions(),
    nativeAudioTracks: false,
    nativeTextTracks: false,
  };
}
