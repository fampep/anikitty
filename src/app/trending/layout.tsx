import type { Metadata } from "next";
import { buildPageMetadata, PAGE_SEO } from "@/lib/site-seo";

export const metadata: Metadata = buildPageMetadata(PAGE_SEO.trending);

export default function TrendingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
