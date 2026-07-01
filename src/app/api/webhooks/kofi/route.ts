import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { handleKofiWebhookPayment } from "@/lib/social/supporter-access";
import {
  kofiVerificationTokenConfigured,
  parseKofiWebhookPayload,
  type KofiWebhookPayload,
} from "@/lib/social/kofi-feed";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const expectedToken = process.env.KOFI_VERIFICATION_TOKEN?.trim() ?? "";
  if (!kofiVerificationTokenConfigured()) {
    console.error("[kofi webhook] KOFI_VERIFICATION_TOKEN is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  let payload: KofiWebhookPayload | null = null;

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      const raw = form.get("data");
      if (typeof raw !== "string") {
        return NextResponse.json({ error: "Missing data field" }, { status: 400 });
      }
      payload = parseKofiWebhookPayload(raw);
    } else {
      const raw = await req.text();
      payload = parseKofiWebhookPayload(raw);
    }
  } catch (err) {
    console.error("[kofi webhook] parse failed:", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.verification_token !== expectedToken) {
    return NextResponse.json({ error: "Invalid verification token" }, { status: 403 });
  }

  try {
    const db = getDb();
    const result = await handleKofiWebhookPayment(db, payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[kofi webhook] grant failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
