import { getDb } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const GLOBAL_CLICK_ADS_KEY = "global_click_ads_enabled";

export async function getGlobalClickAdsEnabled(): Promise<boolean> {
  try {
    const db = getDb();
    const [row] = await db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, GLOBAL_CLICK_ADS_KEY))
      .limit(1);
    if (!row) return true;
    return row.value === "true";
  } catch {
    return true;
  }
}

export async function setGlobalClickAdsEnabled(enabled: boolean): Promise<void> {
  const db = getDb();
  const value = enabled ? "true" : "false";
  await db
    .insert(appSettings)
    .values({ key: GLOBAL_CLICK_ADS_KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    });
}
