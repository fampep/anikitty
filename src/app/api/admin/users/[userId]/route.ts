import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteUserAccount, DeleteUserError } from "@/lib/delete-user";

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
