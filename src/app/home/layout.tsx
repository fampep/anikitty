import type { Metadata } from "next";
import { buildPageMetadata, PAGE_SEO } from "@/lib/seo/site-seo";

export const metadata: Metadata = buildPageMetadata(PAGE_SEO.home);

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
