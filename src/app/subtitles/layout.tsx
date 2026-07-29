import type { Metadata } from "next";
import { buildPageMetadata, ogImageRoute, PAGE_SEO } from "@/lib/seo/site-seo";

export const metadata: Metadata = buildPageMetadata(PAGE_SEO.subtitles, {
  ogImagePath: ogImageRoute("/subtitles/opengraph-image"),
});

export default function SubtitlesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
