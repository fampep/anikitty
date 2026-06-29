import { createOgImageResponse, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/seo/og-card-image";

export const runtime = "edge";
export const alt = "AniKitty Messages";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return createOgImageResponse({
    badge: "Messages",
    title: "Private Messages",
    subtitle: "DM other AniKitty users securely.",
    accent: "rose",
    features: ["Private DMs", "Notifications", "Profiles"],
  });
}
