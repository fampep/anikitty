import { createHash, randomUUID } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { faqArticles, faqFeedback } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";

const VISITOR_COOKIE = "ak_faq_vid";

function hashIp(ip: string): string {
  return createHash("sha256").update(`faq:${ip}`).digest("hex").slice(0, 32);
}

function readVisitorKey(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)ak_faq_vid=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function resolveClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * GET /api/faq/feedback?articleId=slug
 * Returns the caller's existing vote if any.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const articleId = url.searchParams.get("articleId")?.trim();
  if (!articleId) {
    return Response.json({ error: "articleId required" }, { status: 400 });
  }

  try {
    const db = getDb();
    const user = await requireUser(req).catch(() => null);
    const visitorKey = readVisitorKey(req);

    let row:
      | { helpful: boolean; note: string | null; updatedAt: Date }
      | undefined;

    if (user) {
      [row] = await db
        .select({
          helpful: faqFeedback.helpful,
          note: faqFeedback.note,
          updatedAt: faqFeedback.updatedAt,
        })
        .from(faqFeedback)
        .where(and(eq(faqFeedback.articleId, articleId), eq(faqFeedback.userId, user.id)))
        .limit(1);
    } else if (visitorKey) {
      [row] = await db
        .select({
          helpful: faqFeedback.helpful,
          note: faqFeedback.note,
          updatedAt: faqFeedback.updatedAt,
        })
        .from(faqFeedback)
        .where(
          and(eq(faqFeedback.articleId, articleId), eq(faqFeedback.visitorKey, visitorKey)),
        )
        .limit(1);
    }

    if (!row) return Response.json({ feedback: null });
    return Response.json({
      feedback: {
        vote: row.helpful ? "yes" : "no",
        note: row.note ?? undefined,
        at: row.updatedAt.toISOString(),
      },
    });
  } catch {
    return Response.json({ feedback: null });
  }
}

/**
 * POST /api/faq/feedback
 * Body: { articleId, helpful: boolean, note?: string }
 */
export async function POST(req: Request) {
  let body: { articleId?: string; helpful?: boolean; note?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const articleId = body.articleId?.trim();
  if (!articleId || typeof body.helpful !== "boolean") {
    return Response.json({ error: "articleId and helpful required" }, { status: 400 });
  }
  const note =
    typeof body.note === "string" && body.note.trim()
      ? body.note.trim().slice(0, 500)
      : null;

  try {
    const db = getDb();
    const [article] = await db
      .select({ id: faqArticles.id })
      .from(faqArticles)
      .where(eq(faqArticles.id, articleId))
      .limit(1);
    if (!article) {
      return Response.json({ error: "Article not found" }, { status: 404 });
    }

    const user = await requireUser(req).catch(() => null);
    let visitorKey = readVisitorKey(req);
    let setCookie: string | undefined;

    if (!user) {
      if (!visitorKey) {
        visitorKey = `v_${hashIp(resolveClientIp(req))}_${randomUUID().slice(0, 8)}`;
        setCookie = `${VISITOR_COOKIE}=${encodeURIComponent(visitorKey)}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly`;
      }
    }

    const now = new Date();

    if (user) {
      const [existing] = await db
        .select({ id: faqFeedback.id })
        .from(faqFeedback)
        .where(and(eq(faqFeedback.articleId, articleId), eq(faqFeedback.userId, user.id)))
        .limit(1);
      if (existing) {
        await db
          .update(faqFeedback)
          .set({ helpful: body.helpful, note, updatedAt: now, visitorKey: null })
          .where(eq(faqFeedback.id, existing.id));
      } else {
        await db.insert(faqFeedback).values({
          articleId,
          helpful: body.helpful,
          note,
          userId: user.id,
          visitorKey: null,
          createdAt: now,
          updatedAt: now,
        });
      }
    } else {
      const [existing] = await db
        .select({ id: faqFeedback.id })
        .from(faqFeedback)
        .where(
          and(
            eq(faqFeedback.articleId, articleId),
            eq(faqFeedback.visitorKey, visitorKey!),
            isNull(faqFeedback.userId),
          ),
        )
        .limit(1);
      if (existing) {
        await db
          .update(faqFeedback)
          .set({ helpful: body.helpful, note, updatedAt: now })
          .where(eq(faqFeedback.id, existing.id));
      } else {
        await db.insert(faqFeedback).values({
          articleId,
          helpful: body.helpful,
          note,
          userId: null,
          visitorKey: visitorKey!,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return new Response(
      JSON.stringify({
        feedback: {
          vote: body.helpful ? "yes" : "no",
          note: note ?? undefined,
          at: now.toISOString(),
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...(setCookie ? { "Set-Cookie": setCookie } : {}),
        },
      },
    );
  } catch (e) {
    console.error("[faq/feedback]", e);
    return Response.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}
