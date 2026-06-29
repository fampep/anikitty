import FaqContent from "@/components/faq/faq-content";
import { buildPageMetadata, PAGE_SEO } from "@/lib/seo/site-seo";

export const metadata = buildPageMetadata(PAGE_SEO.faq);

export default function FaqPage() {
  return <FaqContent />;
}
