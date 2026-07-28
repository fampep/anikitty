import DmcaContent from "@/components/dmca/dmca-content";
import { buildPageMetadata, PAGE_SEO } from "@/lib/seo/site-seo";

export const metadata = buildPageMetadata(PAGE_SEO.dmca);

export default function DmcaPage() {
  return <DmcaContent />;
}
