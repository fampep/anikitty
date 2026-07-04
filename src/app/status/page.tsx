import StatusPageContent from "@/components/status/status-page-content";
import { buildPageMetadata, PAGE_SEO } from "@/lib/seo/site-seo";

export const metadata = buildPageMetadata(PAGE_SEO.status);

export default function StatusPage() {
  return <StatusPageContent />;
}
