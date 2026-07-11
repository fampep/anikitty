import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-auth";

/** Validates the admin JWT without exposing sensitive data. */
export async function GET(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
