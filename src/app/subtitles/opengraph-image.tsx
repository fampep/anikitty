import { createOgImageResponse, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/seo/og-card-image";

export const runtime = "edge";
export const alt = "AniKitty Subtitle Library";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return createOgImageResponse({
    badge: "Subtitles",
    title: "Subtitle Library",
    subtitle: "Browse cached tracks, coverage stats, and downloads.",
    accent: "teal",
    features: ["VTT downloads", "Episode coverage", "Anikitty proxy"],
  });
}
