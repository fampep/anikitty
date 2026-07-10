"use client";

import { useEffect } from "react";
import { HILLTOP_ADS_TAG_SRC } from "@/lib/ads/ad-config";
import { useSiteAdsVisible } from "@/lib/ads/use-site-ads-visible";

let scriptInjected = false;

/** Loads HilltopAds Multitag once per session when ads are enabled. */
export default function HilltopAdsLoader() {
  const visible = useSiteAdsVisible();

  useEffect(() => {
    if (!visible || scriptInjected) return;
    scriptInjected = true;

    const script = document.createElement("script");
    script.src = HILLTOP_ADS_TAG_SRC;
    script.async = true;
    script.referrerPolicy = "no-referrer-when-downgrade";
    script.onerror = () => {
      scriptInjected = false;
      script.remove();
    };
    document.body.appendChild(script);
  }, [visible]);

  return null;
}
