import { createOgImageResponse, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card-image";

export const runtime = "edge";
export const alt = "AniKitty Watch Together";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return createOgImageResponse({
    badge: "Watch Together",
    title: "Watch Together",
    subtitle: "Sync episodes with friends using a room code.",
    accent: "emerald",
    features: ["Room codes", "Synced playback", "Group chat"],
  });
}
