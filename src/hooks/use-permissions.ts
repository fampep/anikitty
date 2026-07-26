import { useAuthStore } from "@/store/auth-store";
import { hasAnyPermission, hasPermission, type PermissionId } from "@/lib/security/permissions";

const EMPTY_PERMISSIONS: string[] = [];

export function usePermissions() {
  const auth = useAuthStore((s) => s.auth);
  const permissions = auth?.permissions ?? EMPTY_PERMISSIONS;

  return {
    permissions,
    has: (permission: PermissionId | string) => hasPermission(permissions, permission),
    hasAny: (needed: string[]) => hasAnyPermission(permissions, needed),
    canModerateComments: hasPermission(permissions, "comments.moderate"),
    canModerateChat: hasPermission(permissions, "chat.moderate"),
    canModerateForum: hasPermission(permissions, "forum.moderate"),
    canMuteUsers: hasPermission(permissions, "users.mute"),
    canBanUsers: hasPermission(permissions, "users.ban"),
    isStaff: hasAnyPermission(permissions, [
      "comments.moderate",
      "chat.moderate",
      "forum.moderate",
      "users.mute",
      "users.ban",
    ]),
  };
}
