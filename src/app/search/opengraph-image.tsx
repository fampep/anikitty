import { createOgImageResponse, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/seo/og-card-image";

export const runtime = "edge";
export const alt = "Search Anime | AniKitty";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return createOgImageResponse({
    badge: "Search",
    title: "Search Anime",
    subtitle: "Find any title in the AniKitty catalog.",
    accent: "sky",
    features: ["Instant results", "Filters", "Sub & dub"],
  });
}
