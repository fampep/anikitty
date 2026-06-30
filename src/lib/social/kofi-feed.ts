import {
  KOFI_HANDLE,
  MIN_DONATION_EUR,
} from "@/lib/social/donation-config";

/** Ko-fi page ID from https://ko-fi.com/Manage/Zapier (Page Id field). */
const KOFI_PAGE_ID = process.env.KOFI_PAGE_ID?.trim() ?? "";

const FEED_CACHE_MS = 2 * 60 * 1000;
const KOFI_TOOLS_FEED = "https://api.ko-fi.tools/feed";

export type KofiFeedPayment = {
  id: string;
  amount: number;
  currency: string;
  message: string;
  createdAt: Date | null;
  type: string;
};

let feedCache: { at: number; items: KofiFeedPayment[] } | null = null;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value.replace(/[^\d.,]/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isSubscriptionItem(obj: Record<string, unknown>, type: string): boolean {
  if (type.includes("subscription") || type.includes("membership")) return true;
  if (obj.is_subscription_payment === true) return true;
  if (obj.is_first_subscription_payment === true) return true;
  return false;
}

function paymentIdFromParts(parts: Record<string, unknown>): string {
  for (const key of ["id", "Id", "messageId", "message_id", "transactionId", "transaction_id"]) {
    const v = parts[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const amount = parseAmount(parts.amount ?? parts.Amount ?? parts.value) ?? 0;
  const message = String(parts.message ?? parts.Message ?? parts.text ?? parts.body ?? "");
  const date = String(parts.date ?? parts.createdAt ?? parts.timestamp ?? "");
  return `hash:${date}:${amount}:${message}`.slice(0, 64);
}

function normalizeFeedItem(raw: unknown): KofiFeedPayment | null {
  const obj = asRecord(raw);
  if (!obj) return null;

  const type = String(
    obj.type ?? obj.Type ?? obj.eventType ?? obj.activityType ?? obj.kind ?? "donation",
  ).toLowerCase();

  if (type.includes("post") || type.includes("gallery") || type.includes("shop")) {
    return null;
  }

  if (isSubscriptionItem(obj, type)) return null;

  const amount =
    parseAmount(obj.amount) ??
    parseAmount(obj.Amount) ??
    parseAmount(obj.value) ??
    parseAmount(obj.money) ??
    parseAmount(asRecord(obj.donation)?.amount) ??
    parseAmount(asRecord(obj.payment)?.amount);

  if (amount == null || amount < MIN_DONATION_EUR) return null;

  const message = String(
    obj.message ??
      obj.Message ??
      obj.text ??
      obj.body ??
      obj.note ??
      obj.supporterMessage ??
      asRecord(obj.donation)?.message ??
      "",
  );

  const currency = String(
    obj.currency ?? obj.Currency ?? asRecord(obj.donation)?.currency ?? "EUR",
  ).toUpperCase();

  return {
    id: paymentIdFromParts(obj),
    amount,
    currency,
    message,
    createdAt: parseDate(obj.date ?? obj.createdAt ?? obj.timestamp ?? obj.time),
    type,
  };
}

function collectFeedArrays(payload: unknown, out: unknown[] = []): unknown[] {
  if (Array.isArray(payload)) {
    for (const item of payload) out.push(item);
    return out;
  }
  const obj = asRecord(payload);
  if (!obj) return out;

  for (const key of [
    "feed",
    "items",
    "data",
    "results",
    "activities",
    "activity",
    "donations",
    "payments",
    "supporters",
  ]) {
    const val = obj[key];
    if (Array.isArray(val)) {
      for (const item of val) out.push(item);
    } else if (val && typeof val === "object") {
      collectFeedArrays(val, out);
    }
  }
  return out;
}

export function parseKofiFeedPayload(payload: unknown): KofiFeedPayment[] {
  const rawItems = collectFeedArrays(payload);
  const payments: KofiFeedPayment[] = [];
  for (const raw of rawItems) {
    const item = normalizeFeedItem(raw);
    if (item) payments.push(item);
  }
  return payments;
}

export function kofiPageIdConfigured(): boolean {
  return KOFI_PAGE_ID.length > 0;
}

export async function fetchKofiFeedPayments(force = false): Promise<KofiFeedPayment[]> {
  if (!KOFI_PAGE_ID) return [];

  const now = Date.now();
  if (!force && feedCache && now - feedCache.at < FEED_CACHE_MS) {
    return feedCache.items;
  }

  const url = `${KOFI_TOOLS_FEED}?pageId=${encodeURIComponent(KOFI_PAGE_ID)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 120 },
  });

  if (!res.ok) {
    console.error("[kofi feed] fetch failed:", res.status, await res.text().catch(() => ""));
    return feedCache?.items ?? [];
  }

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    return feedCache?.items ?? [];
  }

  const items = parseKofiFeedPayload(payload);
  feedCache = { at: now, items };
  return items;
}

export function paymentMessageMatchesUsername(message: string, username: string): boolean {
  const u = username.trim().toLowerCase();
  if (!u) return false;
  const text = message.toLowerCase();
  if (text.includes(`@${u}`)) return true;
  const re = new RegExp(`(^|[^a-z0-9_])${u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9_]|$)`);
  return re.test(text);
}

export function findUnclaimedPaymentForUsername(
  payments: KofiFeedPayment[],
  username: string,
  claimedIds: Set<string>,
  maxAgeDays = 14,
): KofiFeedPayment | null {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

  for (const payment of payments) {
    if (claimedIds.has(payment.id)) continue;
    if (payment.createdAt && payment.createdAt.getTime() < cutoff) continue;
    if (!paymentMessageMatchesUsername(payment.message, username)) continue;
    return payment;
  }
  return null;
}

export function kofiProfileUrl(): string {
  return `https://ko-fi.com/${KOFI_HANDLE}`;
}
