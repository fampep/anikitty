import type { Metadata } from "next";
import { buildPageMetadata, PAGE_SEO } from "@/lib/site-seo";

export const metadata: Metadata = buildPageMetadata(PAGE_SEO.chat);

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
