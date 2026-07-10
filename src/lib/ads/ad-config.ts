export const SITE_BANNER_AD_KEY = "d7ac00cd099afeb85511d69d3239c3a1";

export const SITE_BANNER_AD_SCRIPT_SRC = `https://www.highperformanceformat.com/${SITE_BANNER_AD_KEY}/invoke.js`;

export const SITE_BANNER_AD_WIDTH = 728;
export const SITE_BANNER_AD_HEIGHT = 90;

export const SITE_BANNER_AD_OPTIONS = {
  key: SITE_BANNER_AD_KEY,
  format: "iframe",
  height: SITE_BANNER_AD_HEIGHT,
  width: SITE_BANNER_AD_WIDTH,
  params: {},
} as const;
