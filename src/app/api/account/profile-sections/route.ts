import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import {
  PROFILE_SECTION_KEYS,
  readProfileSectionsFromPreferences,
  sanitizeProfileSectionVisibility,
  type ProfileSectionVisibility,
} from "@/lib/user/profile-sections";

export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const [user] = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    profileSections: readProfileSectionsFromPreferences(user.preferences),
  });
}

export async function PATCH(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const incoming = sanitizeProfileSectionVisibility(
    body && typeof body === "object" && "profileSections" in (body as object)
      ? (body as { profileSections: unknown }).profileSections
      : body,
  );

  const db = getDb();
  const [existing] = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const prefs =
    existing.preferences && typeof existing.preferences === "object"
      ? { ...(existing.preferences as Record<string, unknown>) }
      : {};

  const merged: ProfileSectionVisibility = {
    ...readProfileSectionsFromPreferences(existing.preferences),
    ...incoming,
  };

  // Require at least one main section visible.
  const mainVisible = PROFILE_SECTION_KEYS.some(
    (key) => key !== "headerBio" && merged[key] !== false,
  );
  if (!mainVisible) {
    return NextResponse.json(
      { error: "At least one profile section must stay visible" },
      { status: 400 },
    );
  }

  prefs.profileSections = merged;

  await db
    .update(users)
    .set({ preferences: prefs })
    .where(eq(users.id, payload.userId));

  return NextResponse.json({ profileSections: merged });
}
