import type { Metadata } from "next";
import { buildPageMetadata, PAGE_SEO } from "@/lib/site-seo";

export const metadata: Metadata = buildPageMetadata(PAGE_SEO.watchTogether);

export default function WatchTogetherLayout({ children }: { children: React.ReactNode }) {
  return children;
}
