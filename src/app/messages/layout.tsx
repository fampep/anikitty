import type { Metadata } from "next";
import { buildPageMetadata, ogImageRoute, PAGE_SEO } from "@/lib/seo/site-seo";

export const metadata: Metadata = buildPageMetadata(PAGE_SEO.messages, {
  ogImagePath: ogImageRoute("/messages/opengraph-image"),
});

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
