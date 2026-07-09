const ALLOWED_HOSTS = new Set(["v.animethemes.moe", "animethemes.moe"]);

/** Only AnimeThemes CDN .webm files may be proxied. */
export function isAllowedThemeVideoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      ALLOWED_HOSTS.has(parsed.hostname) &&
      /\.webm$/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

export function proxiedThemeVideoUrl(videoUrl: string): string {
  return `/api/anime/theme-video?src=${encodeURIComponent(videoUrl)}`;
}
