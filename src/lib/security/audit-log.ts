import type { getDb } from "@/db";
import { modAuditLog } from "@/db/schema";

type Db = ReturnType<typeof getDb>;

export type AuditAction =
  | "ban"
  | "unban"
  | "mute"
  | "unmute"
  | "delete_comment"
  | "pin_comment"
  | "unpin_comment"
  | "resolve_report"
  | "dismiss_report"
  | "role_change"
  | "approve_skip_submission"
  | "reject_skip_submission";

/**
 * Fire-and-forget record of a staff action. Never throws — auditing must not
 * break the action it describes. A null actor means the shared admin panel.
 */
export async function recordAudit(
  db: Db,
  entry: {
    actorUserId: string | null;
    action: AuditAction;
    targetType?: "user" | "comment" | "report" | "role" | "skip_submission";
    targetId?: string | null;
    targetUserId?: string | null;
    reason?: string | null;
    metadata?: Record<string, unknown> | null;
  },
): Promise<void> {
  await db
    .insert(modAuditLog)
    .values({
      actorUserId: entry.actorUserId,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      targetUserId: entry.targetUserId ?? null,
      reason: entry.reason?.slice(0, 500) ?? null,
      metadata: entry.metadata ?? null,
    })
    .catch(() => {});
}
