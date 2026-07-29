import type { Metadata } from "next";
import { buildPageMetadata, ogImageRoute, PAGE_SEO } from "@/lib/seo/site-seo";

export const metadata: Metadata = buildPageMetadata(PAGE_SEO.search, {
  ogImagePath: ogImageRoute("/search/opengraph-image"),
});

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
