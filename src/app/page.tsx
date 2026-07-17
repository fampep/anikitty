import { Suspense } from "react";
import { buildPageMetadata, PAGE_SEO } from "@/lib/seo/site-seo";
import LandingPage from "@/components/landing/landing-page";

export const metadata = buildPageMetadata(PAGE_SEO.landing);

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LandingPage />
    </Suspense>
  );
}
