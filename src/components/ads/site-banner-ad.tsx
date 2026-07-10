"use client";

import { cn } from "@/lib/core/utils";
import { SITE_BANNER_AD_HEIGHT, SITE_BANNER_AD_WIDTH } from "@/lib/ads/ad-config";
import { useSiteAdsVisible } from "@/lib/ads/use-site-ads-visible";

type Props = {
  className?: string;
};

/** Reserved in-content slot — HilltopAds Multitag loads globally via HilltopAdsLoader. */
export default function SiteBannerAd({ className }: Props) {
  const visible = useSiteAdsVisible();

  if (!visible) return null;

  return (
    <div className={cn("w-full flex justify-center px-4", className)}>
      <div
        className="w-full max-w-[728px] overflow-hidden flex items-center justify-center"
        style={{ minHeight: SITE_BANNER_AD_HEIGHT, maxWidth: SITE_BANNER_AD_WIDTH }}
        aria-hidden
      />
    </div>
  );
}
