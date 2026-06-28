import FaqContent from "./faq-content";
import { buildPageMetadata, PAGE_SEO } from "@/lib/site-seo";

export const metadata = buildPageMetadata(PAGE_SEO.faq);

export default function FaqPage() {
  return <FaqContent />;
}
