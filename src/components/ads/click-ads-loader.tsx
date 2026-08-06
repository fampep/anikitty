"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";
import { isAdPlacementAllowed } from "@/lib/ads/ad-placement";
import { loadClickAds, unloadClickAds } from "@/lib/ads/show-ads-preference";

/**
 * Ads loader disabled - replaced with permanent support banner.
 * Support users via Kifu donations instead of click ads.
 */
export default function ClickAdsLoader() {
  // Ads disabled in favor of support banner
  return null;
}
