import type { Metadata } from "next";
import { buildPageMetadata, PAGE_SEO } from "@/lib/site-seo";

export const metadata: Metadata = buildPageMetadata(PAGE_SEO.messages);

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
