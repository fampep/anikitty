import { createOgImageResponse, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/seo/og-card-image";

export const runtime = "edge";
export const alt = "AniKitty Forum";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return createOgImageResponse({
    badge: "Forum",
    title: "Community Forum",
    subtitle: "Discuss anime, share picks, and join threads.",
    accent: "violet",
    features: ["Threads", "Recommendations", "Upvotes"],
  });
}
