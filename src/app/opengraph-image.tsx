import { createOgImageResponse, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/seo/og-card-image";

export const runtime = "edge";
export const alt = "AniKitty — Free Anime Streaming";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return createOgImageResponse({
    badge: "Free Streaming",
    title: "AniKitty",
    subtitle: "Free anime streaming. Sub & dub. Ad-free.",
    accent: "violet",
    features: ["Sub & Dub", "Subtitles", "Forum", "Live Chat", "Watch Together", "Ad-free"],
  });
}
