"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/core/utils";
import {
  SITE_BANNER_AD_HEIGHT,
  SITE_BANNER_AD_OPTIONS,
  SITE_BANNER_AD_SCRIPT_SRC,
  SITE_BANNER_AD_WIDTH,
} from "@/lib/ads/ad-config";
import { useSiteAdsVisible } from "@/lib/ads/use-site-ads-visible";

declare global {
  interface Window {
    atOptions?: typeof SITE_BANNER_AD_OPTIONS;
  }
}

type Props = {
  className?: string;
};

/** Non-intrusive 728×90 banner — does not hijack clicks or interrupt navigation. */
export default function SiteBannerAd({ className }: Props) {
  const visible = useSiteAdsVisible();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!visible || !container) return;

    container.replaceChildren();
    window.atOptions = { ...SITE_BANNER_AD_OPTIONS };

    const script = document.createElement("script");
    script.src = SITE_BANNER_AD_SCRIPT_SRC;
    script.async = true;
    script.onerror = () => {
      script.remove();
    };
    container.appendChild(script);

    return () => {
      script.remove();
      container.replaceChildren();
      delete window.atOptions;
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className={cn("w-full flex justify-center px-4", className)}>
      <div
        ref={containerRef}
        className="w-full max-w-[728px] overflow-hidden flex items-center justify-center [&_iframe]:max-w-full"
        style={{ minHeight: SITE_BANNER_AD_HEIGHT, maxWidth: SITE_BANNER_AD_WIDTH }}
        aria-label="Advertisement"
      />
    </div>
  );
}
