import { NextResponse } from "next/server";
import { getLatestChangelogSummary } from "@/lib/changelog/changelog-server";

/** Lightweight — polled by the notification bell. */
export async function GET() {
  const summary = await getLatestChangelogSummary().catch(() => null);
  return NextResponse.json({ latest: summary });
}
