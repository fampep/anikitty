import {
  amountToEur,
  KOFI_HANDLE,
  MIN_DONATION_EUR,
} from "@/lib/social/donation-config";

/** Ko-fi page ID from https://ko-fi.com/Manage/Zapier (Page Id field). */
const KOFI_PAGE_ID = process.env.KOFI_PAGE_ID?.trim() ?? "";

const FEED_CACHE_MS = 2 * 60 * 1000;
const KOFI_TOOLS_FEED = "https://api.ko-fi.tools/feed";
const KOFI_FEED_REFERER =
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://anikitty.site";

export type KofiFeedPayment = {
  id: string;
  amount: number;
  amountEur: number;
  currency: string;
  message: string;
  createdAt: Date | null;
  type: string;
  email: string | null;
  kofiTransactionId: string | null;
};

export type KofiWebhookPayload = {
  message_id?: string;
  timestamp?: string;
  type?: string;
  from_name?: string;
  message?: string;
  amount?: string | number;
  email?: string;
  currency?: string;
  is_subscription_payment?: boolean;
  is_first_subscription_payment?: boolean;
  kofi_transaction_id?: string;
  verification_token?: string;
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

function paymentIdFromParts(parts: Record<string, unknown>): string {
  for (const key of [
    "message_id",
    "messageId",
    "id",
    "Id",
    "transactionId",
    "transaction_id",
    "kofi_transaction_id",
  ]) {
    const v = parts[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const amount = parseAmount(parts.amount ?? parts.Amount ?? parts.value) ?? 0;
  const message = String(parts.message ?? parts.Message ?? parts.text ?? parts.body ?? "");
  const date = String(parts.date ?? parts.createdAt ?? parts.timestamp ?? parts.time ?? "");
  return `hash:${date}:${amount}:${message}`.slice(0, 64);
}

function isIgnoredFeedType(type: string): boolean {
  return (
    type.includes("post") ||
    type.includes("gallery") ||
    type.includes("shop") ||
    type.includes("commission")
  );
}

function buildFeedPayment(
  obj: Record<string, unknown>,
  type: string,
): KofiFeedPayment | null {
  if (isIgnoredFeedType(type)) return null;

  const amount =
    parseAmount(obj.amount) ??
    parseAmount(obj.Amount) ??
    parseAmount(obj.value) ??
    parseAmount(obj.money) ??
    parseAmount(asRecord(obj.donation)?.amount) ??
    parseAmount(asRecord(obj.payment)?.amount);

  if (amount == null || amount < MIN_DONATION_EUR) return null;

  const currency = String(
    obj.currency ?? obj.Currency ?? asRecord(obj.donation)?.currency ?? "EUR",
  ).toUpperCase();

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

  const kofiTransactionId =
    typeof obj.kofi_transaction_id === "string"
      ? obj.kofi_transaction_id
      : typeof obj.transaction_id === "string"
        ? obj.transaction_id
        : null;

  const email =
    typeof obj.email === "string" && obj.email.trim()
      ? obj.email.trim()
      : null;

  return {
    id: paymentIdFromParts(obj),
    amount,
    amountEur: amountToEur(amount, currency),
    currency,
    message,
    createdAt: parseDate(
      obj.timestamp ?? obj.date ?? obj.createdAt ?? obj.time ?? obj.created_at,
    ),
    type,
    email,
    kofiTransactionId,
  };
}

function normalizeFeedItem(raw: unknown): KofiFeedPayment | null {
  const obj = asRecord(raw);
  if (!obj) return null;

  const type = String(
    obj.type ?? obj.Type ?? obj.eventType ?? obj.activityType ?? obj.kind ?? "donation",
  ).toLowerCase();

  return buildFeedPayment(obj, type);
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
    "subscriptions",
    "events",
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
  const seen = new Set<string>();

  for (const raw of rawItems) {
    const item = normalizeFeedItem(raw);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    payments.push(item);
  }

  payments.sort((a, b) => {
    const ta = a.createdAt?.getTime() ?? 0;
    const tb = b.createdAt?.getTime() ?? 0;
    return tb - ta;
  });

  return payments;
}

export function parseKofiWebhookPayload(raw: string): KofiWebhookPayload | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return asRecord(parsed) as KofiWebhookPayload | null;
  } catch {
    return null;
  }
}

export function kofiWebhookPayloadToPayment(
  payload: KofiWebhookPayload,
): KofiFeedPayment | null {
  const obj = payload as Record<string, unknown>;
  const type = String(payload.type ?? "Donation").toLowerCase();
  if (isIgnoredFeedType(type)) return null;
  if (!type.includes("donation") && !type.includes("subscription")) return null;
  return buildFeedPayment(obj, type);
}

export function kofiPageIdConfigured(): boolean {
  return KOFI_PAGE_ID.length > 0;
}

export function kofiVerificationTokenConfigured(): boolean {
  return (process.env.KOFI_VERIFICATION_TOKEN?.trim() ?? "").length > 0;
}

export async function fetchKofiFeedPayments(force = false): Promise<KofiFeedPayment[]> {
  if (!KOFI_PAGE_ID) return [];

  const now = Date.now();
  if (!force && feedCache && now - feedCache.at < FEED_CACHE_MS) {
    return feedCache.items;
  }

  const url = `${KOFI_TOOLS_FEED}?pageId=${encodeURIComponent(KOFI_PAGE_ID)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      Referer: KOFI_FEED_REFERER,
    },
    cache: "no-store",
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

  const obj = asRecord(payload);
  if (obj?.error) {
    console.error("[kofi feed] api error:", obj.error);
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
  maxAgeDays = 30,
): KofiFeedPayment | null {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const u = username.trim().toLowerCase();

  const matches = payments.filter((payment) => {
    if (claimedIds.has(payment.id)) return false;
    if (payment.createdAt && payment.createdAt.getTime() < cutoff) return false;
    return paymentMessageMatchesUsername(payment.message, u);
  });

  if (matches.length === 0) return null;

  matches.sort((a, b) => {
    const ta = a.createdAt?.getTime() ?? 0;
    const tb = b.createdAt?.getTime() ?? 0;
    return tb - ta;
  });

  return matches[0];
}

export function findUnclaimedPaymentForEmail(
  payments: KofiFeedPayment[],
  email: string,
  claimedIds: Set<string>,
  maxAgeDays = 30,
): KofiFeedPayment | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const matches = payments.filter((payment) => {
    if (claimedIds.has(payment.id)) return false;
    if (payment.createdAt && payment.createdAt.getTime() < cutoff) return false;
    return payment.email?.trim().toLowerCase() === normalized;
  });

  if (matches.length === 0) return null;

  matches.sort((a, b) => {
    const ta = a.createdAt?.getTime() ?? 0;
    const tb = b.createdAt?.getTime() ?? 0;
    return tb - ta;
  });

  return matches[0];
}

export function kofiProfileUrl(): string {
  return `https://ko-fi.com/${KOFI_HANDLE}`;
}
