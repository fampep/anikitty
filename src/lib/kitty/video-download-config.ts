/** Flip to true when video downloads are ready for production again. */
export const VIDEO_DOWNLOAD_ENABLED = false;

export class VideoDownloadDisabledError extends Error {
  constructor() {
    super("VIDEO_DOWNLOAD_DISABLED");
    this.name = "VideoDownloadDisabledError";
  }
}

export function assertVideoDownloadEnabled(): void {
  if (!VIDEO_DOWNLOAD_ENABLED) {
    throw new VideoDownloadDisabledError();
  }
}
