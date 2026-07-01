import { Suspense } from "react";
import { buildPageMetadata, PAGE_SEO } from "@/lib/seo/site-seo";
import { getHomePosterUrls } from "@/lib/core/home-data";
import LandingPage from "@/components/landing/landing-page";

export const metadata = buildPageMetadata(PAGE_SEO.landing);

export default async function Page() {
  let posters: string[] = [];
  try {
    posters = (await getHomePosterUrls()).slice(0, 12);
  } catch {
    posters = [];
  }

  return (
    <Suspense fallback={null}>
      <LandingPage initialPosters={posters} />
    </Suspense>
  );
}
