import type { Metadata } from "next";
import { buildPageMetadata, ogImageRoute, PAGE_SEO } from "@/lib/seo/site-seo";

export const metadata: Metadata = buildPageMetadata(PAGE_SEO.chat, {
  ogImagePath: ogImageRoute("/chat/opengraph-image"),
});

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
