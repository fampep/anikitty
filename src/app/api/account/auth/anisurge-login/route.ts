import { NextResponse } from "next/server";

/** Legacy route — Anisurge is no longer used for login. Use POST /api/account/auth/login instead. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Anisurge login is disabled. Sign in with your AniKitty account, or link Anisurge in Settings → Connections.",
    },
    { status: 410 },
  );
}
