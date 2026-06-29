import type { getDb } from "@/db";
import { userSessions, users } from "@/db/schema";
import { countAdmins } from "@/lib/delete-user";
import { and, eq, isNull } from "drizzle-orm";

type Db = ReturnType<typeof getDb>;

export type ModerationFields = {
  bannedAt: Date | null;
  banReason: string | null;
  mutedUntil: Date | null;
  muteReason: string | null;
};

export type ModerationStatus = {
  banned: boolean;
  banReason: string | null;
  bannedAt: string | null;
  muted: boolean;
  mutedUntil: string | null;
  muteReason: string | null;
};

export class ModerationError extends Error {
  code: "NOT_FOUND" | "FORBIDDEN" | "LAST_ADMIN" | "INVALID";

  constructor(message: string, code: "NOT_FOUND" | "FORBIDDEN" | "LAST_ADMIN" | "INVALID") {
    super(message);
    this.code = code;
  }
}

export function isStaffRole(role: string): boolean {
  return role === "admin" || role === "moderator";
}

export function isUserBanned(user: Pick<ModerationFields, "bannedAt">): boolean {
  return user.bannedAt != null;
}

export function isUserMuted(user: Pick<ModerationFields, "mutedUntil">): boolean {
  if (!user.mutedUntil) return false;
  return user.mutedUntil.getTime() > Date.now();
}

export function toModerationStatus(user: ModerationFields): ModerationStatus {
  const banned = isUserBanned(user);
  const muted = isUserMuted(user);
  return {
    banned,
    banReason: banned ? user.banReason ?? null : null,
    bannedAt: banned ? user.bannedAt?.toISOString() ?? null : null,
    muted,
    mutedUntil: muted ? user.mutedUntil?.toISOString() ?? null : null,
    muteReason: muted ? user.muteReason ?? null : null,
  };
}

export function canStaffTarget(actorRole: string, targetRole: string): boolean {
  if (!isStaffRole(actorRole)) return false;
  if (targetRole === "admin") return false;
  if (actorRole === "moderator" && targetRole === "moderator") return false;
  return true;
}

const MAX_MUTE_HOURS = 24 * 365;

export function parseMuteDurationHours(value: unknown): number {
  const hours = typeof value === "number" && Number.isFinite(value) ? value : 24;
  return Math.min(MAX_MUTE_HOURS, Math.max(1, Math.floor(hours)));
}

export function interactionBlockMessage(status: ModerationStatus): string | null {
  if (status.banned) {
    return status.banReason
      ? `Your account is banned: ${status.banReason}`
      : "Your account is banned.";
  }
  if (status.muted) {
    return status.muteReason
      ? `You are muted: ${status.muteReason}`
      : "You are muted and cannot post right now.";
  }
  return null;
}

export async function getUserModerationStatus(
  db: Db,
  userId: string,
): Promise<ModerationStatus | null> {
  const [user] = await db
    .select({
      bannedAt: users.bannedAt,
      banReason: users.banReason,
      mutedUntil: users.mutedUntil,
      muteReason: users.muteReason,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;
  return toModerationStatus(user);
}

export async function assertUserCanInteract(db: Db, userId: string): Promise<ModerationStatus> {
  const status = await getUserModerationStatus(db, userId);
  if (!status) throw new ModerationError("User not found", "NOT_FOUND");
  if (status.banned || status.muted) {
    throw new ModerationError(interactionBlockMessage(status) ?? "Forbidden", "FORBIDDEN");
  }
  return status;
}

async function revokeAllSessions(db: Db, userId: string) {
  const now = new Date();
  await db
    .update(userSessions)
    .set({ revokedAt: now })
    .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)));
}

export async function blockIfCannotInteract(
  db: Db,
  userId: string,
): Promise<{ error: string; status: number } | null> {
  const status = await getUserModerationStatus(db, userId);
  if (!status) return { error: "User not found", status: 404 };
  const message = interactionBlockMessage(status);
  if (message) return { error: message, status: 403 };
  return null;
}

export async function applyModerationAction(
  db: Db,
  opts: {
    targetUserId: string;
    actorUserId: string | null;
    actorRole: string;
    action: string;
    reason?: string;
    durationHours?: number;
    bypassTargetCheck?: boolean;
  },
): Promise<ModerationStatus> {
  const { targetUserId, actorUserId, actorRole, action, bypassTargetCheck } = opts;
  const reason = typeof opts.reason === "string" ? opts.reason.trim().slice(0, 500) : "";

  const [target] = await db
    .select({
      id: users.id,
      role: users.role,
      bannedAt: users.bannedAt,
      banReason: users.banReason,
      mutedUntil: users.mutedUntil,
      muteReason: users.muteReason,
    })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  if (!target) throw new ModerationError("User not found", "NOT_FOUND");

  if (!bypassTargetCheck && !canStaffTarget(actorRole, target.role)) {
    throw new ModerationError("You cannot moderate this user", "FORBIDDEN");
  }

  if (action === "mute") {
    const hours = parseMuteDurationHours(opts.durationHours);
    const mutedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
    await db
      .update(users)
      .set({
        mutedUntil,
        muteReason: reason || null,
        mutedBy: actorUserId,
      })
      .where(eq(users.id, targetUserId));

    return toModerationStatus({
      ...target,
      mutedUntil,
      muteReason: reason || null,
    });
  }

  if (action === "unmute") {
    await db
      .update(users)
      .set({ mutedUntil: null, muteReason: null, mutedBy: null })
      .where(eq(users.id, targetUserId));

    return toModerationStatus({
      ...target,
      mutedUntil: null,
      muteReason: null,
    });
  }

  if (action === "ban") {
    if (target.role === "admin") {
      const admins = await countAdmins(db);
      if (admins <= 1) {
        throw new ModerationError("Cannot ban the last admin account", "LAST_ADMIN");
      }
    }

    const bannedAt = new Date();
    await db
      .update(users)
      .set({
        bannedAt,
        banReason: reason || null,
        bannedBy: actorUserId,
        mutedUntil: null,
        muteReason: null,
        mutedBy: null,
      })
      .where(eq(users.id, targetUserId));

    await revokeAllSessions(db, targetUserId);

    return toModerationStatus({
      bannedAt,
      banReason: reason || null,
      mutedUntil: null,
      muteReason: null,
    });
  }

  if (action === "unban") {
    await db
      .update(users)
      .set({ bannedAt: null, banReason: null, bannedBy: null })
      .where(eq(users.id, targetUserId));

    return toModerationStatus({
      ...target,
      bannedAt: null,
      banReason: null,
    });
  }

  throw new ModerationError("Unknown action", "INVALID");
}
