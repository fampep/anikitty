import { NextResponse } from "next/server";

/** Legacy route — Anisurge is no longer used for signup. Use POST /api/account/auth/signup instead. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Anisurge signup is disabled. Create an AniKitty account, then link Anisurge in Settings → Connections.",
    },
    { status: 410 },
  );
}
