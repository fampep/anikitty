import { NextResponse } from "next/server";
import { verifyToken, extractToken } from "@/lib/auth-jwt";

export async function getOptionalViewerId(req: Request): Promise<string | null> {
  const token = extractToken(req);
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

export function canViewProfile(
  profilePrivate: boolean,
  profileUserId: string,
  viewerUserId: string | null,
): boolean {
  if (!profilePrivate) return true;
  return viewerUserId === profileUserId;
}

export function privateProfileResponse() {
  return NextResponse.json(
    { error: "This profile is hidden", private: true },
    { status: 403 },
  );
}
