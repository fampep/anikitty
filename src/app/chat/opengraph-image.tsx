import { createOgImageResponse, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card-image";

export const runtime = "edge";
export const alt = "AniKitty Live Chat";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return createOgImageResponse({
    badge: "Live Chat",
    title: "Live Chat",
    subtitle: "Talk with other fans in real time.",
    accent: "sky",
    features: ["Real-time", "GIFs", "Community"],
  });
}
