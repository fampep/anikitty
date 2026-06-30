import DonationContent from "@/components/support/donation-content";
import { buildPageMetadata, PAGE_SEO } from "@/lib/seo/site-seo";

export const metadata = buildPageMetadata(PAGE_SEO.donate);

export default function DonatePage() {
  return <DonationContent />;
}
