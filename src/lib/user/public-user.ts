import type { getDb } from "@/db";
import { users, roles } from "@/db/schema";
import { eq } from "drizzle-orm";

type Db = ReturnType<typeof getDb>;

export type PublicUserRow = {
  id: string;
  username: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  themeColor: string | null;
  role: string;
  roleColor: string | null;
  createdAt: Date | null;
  profilePrivate: boolean;
  equippedFrame: string | null;
  equippedSticker: string | null;
  equippedIcon: string | null;
};

export async function getUserByUsername(
  db: Db,
  username: string,
): Promise<PublicUserRow | null> {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      avatarUrl: users.avatarUrl,
      bannerUrl: users.bannerUrl,
      bio: users.bio,
      themeColor: users.themeColor,
      role: users.role,
      roleColor: roles.color,
      createdAt: users.createdAt,
      profilePrivate: users.profilePrivate,
      equippedFrame: users.equippedFrame,
      equippedSticker: users.equippedSticker,
      equippedIcon: users.equippedIcon,
    })
    .from(users)
    .leftJoin(roles, eq(roles.name, users.role))
    .where(eq(users.username, username))
    .limit(1);

  return user ?? null;
}
