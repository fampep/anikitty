import type { Metadata } from "next";
import { buildPageMetadata, ogImageRoute, PAGE_SEO } from "@/lib/seo/site-seo";

export const metadata: Metadata = buildPageMetadata(PAGE_SEO.watchTogether, {
  ogImagePath: ogImageRoute("/watch-together/opengraph-image"),
});

export default function WatchTogetherLayout({ children }: { children: React.ReactNode }) {
  return children;
}
