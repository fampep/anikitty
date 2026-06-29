import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { applyModerationAction, ModerationError } from "@/lib/moderation";
import { requireStaff } from "@/lib/staff-auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const staff = await requireStaff(req);
  if (!staff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  if (!userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";

  const db = getDb();
  try {
    const moderation = await applyModerationAction(db, {
      targetUserId: userId,
      actorUserId: staff.userId,
      actorRole: staff.role,
      action,
      reason: body.reason,
      durationHours: body.durationHours,
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
