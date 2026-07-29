import type { Metadata } from "next";
import { buildPageMetadata, ogImageRoute, PAGE_SEO } from "@/lib/seo/site-seo";

export const metadata: Metadata = buildPageMetadata(PAGE_SEO.forum, {
  ogImagePath: ogImageRoute("/forum/opengraph-image"),
});

export default function ForumLayout({ children }: { children: React.ReactNode }) {
  return children;
}
