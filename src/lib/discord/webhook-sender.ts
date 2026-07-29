import { getDb, rowsOf } from "@/db";
import { discordWebhooks, discordWebhookLogs } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { WEBHOOK_EVENTS_BY_TYPE, interpolateTemplate } from "./webhook-events";

type EmbedField = { name: string; value: string; inline?: boolean };

type DiscordEmbed = {
  title?: string;
  description?: string;
  color?: number;
  timestamp?: string;
  footer?: { text: string };
  fields?: EmbedField[];
  thumbnail?: { url: string };
};

export async function sendDiscordWebhook(
  webhookId: string,
  eventType: string,
  data: Record<string, string | number | undefined>,
): Promise<boolean> {
  const db = getDb();
  const [webhook] = await db
    .select()
    .from(discordWebhooks)
    .where(and(eq(discordWebhooks.id, webhookId), eq(discordWebhooks.enabled, true)))
    .limit(1);

  if (!webhook) return false;

  const eventDef = WEBHOOK_EVENTS_BY_TYPE.get(eventType);
  const title = eventDef ? interpolateTemplate(eventDef.title, data) : eventType;
  const description = eventDef ? interpolateTemplate(eventDef.description, data) : JSON.stringify(data);
  const color = webhook.embedColor
    ? parseInt(webhook.embedColor.replace("#", ""), 16)
    : eventDef?.color ?? 0x60a5fa;

  const embed: DiscordEmbed = {
    title,
    description,
    color,
    timestamp: new Date().toISOString(),
    footer: { text: "AniKitty" },
  };

  const body = {
    username: webhook.customUsername || "AniKitty",
    avatar_url: webhook.customAvatar || undefined,
    embeds: [embed],
  };

  const start = Date.now();
  let httpStatus: number | undefined;
  let responseBody: string | undefined;
  let error: string | undefined;
  let success = false;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(webhook.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      httpStatus = res.status;
      responseBody = await res.text().catch(() => undefined);
      if (res.ok || res.status === 204) {
        success = true;
        break;
      }
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("Retry-After") || "2");
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }
      error = `HTTP ${res.status}: ${responseBody?.slice(0, 200)}`;
      break;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
      }
    }
  }

  const processingMs = Date.now() - start;

  try {
    await db.insert(discordWebhookLogs).values({
      webhookId,
      eventType,
      payload: data as Record<string, unknown>,
      httpStatus,
      responseBody: responseBody?.slice(0, 2000),
      error,
      processingMs,
    });

    await db
      .update(discordWebhooks)
      .set({
        ...(success
          ? { lastSuccessAt: new Date(), totalSent: sql`${discordWebhooks.totalSent} + 1` }
          : { lastFailureAt: new Date(), totalFailed: sql`${discordWebhooks.totalFailed} + 1` }),
        updatedAt: new Date(),
      })
      .where(eq(discordWebhooks.id, webhookId));
  } catch {
    console.error("[webhook-sender] failed to log delivery");
  }

  return success;
}

export async function sendEventToCategory(
  category: string,
  eventType: string,
  data: Record<string, string | number | undefined>,
): Promise<void> {
  const db = getDb();
  const webhooks = await db
    .select({ id: discordWebhooks.id })
    .from(discordWebhooks)
    .where(and(eq(discordWebhooks.category, category), eq(discordWebhooks.enabled, true)));

  await Promise.allSettled(
    webhooks.map((w) => sendDiscordWebhook(w.id, eventType, data)),
  );
}
