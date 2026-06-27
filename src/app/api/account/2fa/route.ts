import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/require-user";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();

  return NextResponse.json({
    enabled: user.totpEnabled,
    pendingSetup: !!user.totpSecret && !user.totpEnabled,
  });
}
