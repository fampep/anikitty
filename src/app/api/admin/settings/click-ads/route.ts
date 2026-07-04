import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-auth";
import {
  getGlobalClickAdsEnabled,
  setGlobalClickAdsEnabled,
} from "@/lib/ads/global-click-ads";

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const enabled = await getGlobalClickAdsEnabled();
  return NextResponse.json({ enabled });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled (boolean) required" }, { status: 400 });
  }

  await setGlobalClickAdsEnabled(body.enabled);
  return NextResponse.json({ enabled: body.enabled });
}
