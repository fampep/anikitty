/** Likely animated — use <img> so GIF/WebP animations play. */
export function isLikelyAnimatedMediaUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes(".gif") ||
    lower.includes("giphy.com") ||
    lower.includes("klipy.com") ||
    lower.includes("tenor.com") ||
    lower.includes("media.tenor.com") ||
    lower.includes(".webp")
  );
}

export const MEDIA_URL_HINT =
  "Direct HTTPS image or GIF URL (KLIPY, Giphy, Tenor, Imgur, etc.)";

export const BANNER_EXAMPLE_HINT =
  "Wide banner works best — anime scenery or looping GIFs look great";

export const AVATAR_EXAMPLE_HINT =
  "Square images or animated GIF avatars";
