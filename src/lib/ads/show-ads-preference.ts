export function readShowAdsFromMe(data: Record<string, unknown>): boolean {
  if (typeof data.showAds === "boolean") return data.showAds;
  const user = (data.user ?? {}) as Record<string, unknown>;
  if (typeof user.showAds === "boolean") return user.showAds;
  return true;
}
