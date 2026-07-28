import FaqContent from "@/components/faq/faq-content";
import { getFaqContent } from "@/lib/faq/faq-server";
import type { FaqPayload } from "@/lib/faq/types";
import { buildPageMetadata, PAGE_SEO } from "@/lib/seo/site-seo";

export const metadata = buildPageMetadata(PAGE_SEO.faq);

const EMPTY_FAQ: FaqPayload = { categories: [], articles: [] };

export default async function FaqPage() {
  let initialData: FaqPayload = EMPTY_FAQ;
  try {
    initialData = await getFaqContent();
  } catch {
    /* migration may not have run yet */
  }
  return <FaqContent initialData={initialData} />;
}
