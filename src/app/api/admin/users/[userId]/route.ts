import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { userSessions, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { deleteUserAccount, DeleteUserError } from "@/lib/user/delete-user";
import { hashPassword, validatePassword } from "@/lib/auth/local-auth";
import { applyModerationAction, ModerationError } from "@/lib/security/moderation";
import { grantKittycoins } from "@/lib/shop/kittycoins";
import {
  adminGrantSupporterDays,
  adminRevokeSupporter,
} from "@/lib/social/supporter-access";
import { and, eq, isNull } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  if (!userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";

  const db = getDb();
  const [user] = await db
    .select({ id: users.id, totpEnabled: users.totpEnabled })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (action === "disable2fa") {
    await db
      .update(users)
      .set({ totpSecret: null, totpEnabled: false })
      .where(eq(users.id, userId));
    return NextResponse.json({ ok: true, totpEnabled: false });
  }

  if (action === "resetPassword") {
    const password = typeof body.password === "string" ? body.password : "";
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const now = new Date();
    await db
      .update(users)
      .set({ passwordHash, passwordSetAt: now })
      .where(eq(users.id, userId));
    await db
      .update(userSessions)
      .set({ revokedAt: now })
      .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)));

    return NextResponse.json({ ok: true });
  }

  if (action === "grantKittycoins") {
    const delta = typeof body.delta === "number" ? Math.floor(body.delta) : parseInt(String(body.delta ?? ""), 10);
    if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 1_000_000) {
      return NextResponse.json({ error: "delta must be a non-zero integer (max ±1,000,000)" }, { status: 400 });
    }
    const reason =
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim().slice(0, 120)
        : "admin_grant";
    const result = await grantKittycoins(db, userId, delta, reason, `admin:${Date.now()}`);
    return NextResponse.json({ ok: true, balance: result.balance, granted: result.granted });
  }

  if (action === "grantSupporter") {
    const days =
      typeof body.days === "number" ? body.days : parseInt(String(body.days ?? ""), 10);
    try {
      const result = await adminGrantSupporterDays(db, userId, days);
      return NextResponse.json({ ok: true, ...result });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed to grant supporter" },
        { status: 400 },
      );
    }
  }

  if (action === "revokeSupporter") {
    try {
      await adminRevokeSupporter(db, userId);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed to revoke supporter" },
        { status: 400 },
      );
    }
  }

  if (action === "mute" || action === "unmute" || action === "ban" || action === "unban") {
    try {
      const moderation = await applyModerationAction(db, {
        targetUserId: userId,
        actorUserId: null,
        actorRole: "admin",
        action,
        reason: body.reason,
        durationHours: body.durationHours,
        bypassTargetCheck: true,
      });
      return NextResponse.json({ ok: true, moderation });
    } catch (e) {
      if (e instanceof ModerationError) {
        const status =
          e.code === "NOT_FOUND" ? 404 : e.code === "LAST_ADMIN" || e.code === "INVALID" ? 400 : 403;
        return NextResponse.json({ error: e.message }, { status });
      }
      throw e;
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  if (!userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const db = getDb();
  try {
    await deleteUserAccount(db, userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof DeleteUserError) {
      const status = e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message }, { status });
    }
    throw e;
  }
}
