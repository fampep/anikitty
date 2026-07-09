"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import FramedAvatar from "@/components/common/framed-avatar";
import { Loader2, Check, X, UserMinus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { withAuth } from "@/lib/auth/auth-fetch";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";
import { toast } from "sonner";

type FriendUser = { username: string; avatarUrl?: string | null; equippedFrame?: string | null };
type Tab = "friends" | "requests";

// Declared at module scope: nested component definitions get a fresh type on
// every render, which remounts each row (avatars reflash, focus is lost).
function Row({
  u,
  onNavigate,
  children,
}: {
  u: FriendUser;
  onNavigate: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-accent dark:hover:bg-white/[0.04] transition-colors">
      <Link
        href={`/profile/${encodeURIComponent(u.username)}`}
        onClick={onNavigate}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <FramedAvatar
          username={u.username}
          url={u.avatarUrl ?? undefined}
          frameSlug={u.equippedFrame}
          className="w-9 h-9"
        />
        <span className="text-sm font-medium text-foreground dark:text-white/85 truncate">
          @{u.username}
        </span>
      </Link>
      <div className="flex items-center gap-1.5 shrink-0">{children}</div>
    </div>
  );
}

function IconBtn({
  onClick,
  label,
  icon,
  danger,
  disabled,
}: {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center h-7 w-7 rounded-lg border transition-colors disabled:opacity-40",
        danger
          ? "border-rose-500/25 text-rose-300/80 hover:bg-rose-500/10"
          : "border-border dark:border-white/12 text-muted-foreground dark:text-white/50 hover:bg-accent dark:hover:bg-white/8",
      )}
    >
      {icon}
    </button>
  );
}

export default function FriendsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [incoming, setIncoming] = useState<FriendUser[]>([]);
  const [outgoing, setOutgoing] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/friends", withAuth());
      if (!res.ok) throw new Error();
      const d = await res.json();
      setFriends(d.friends ?? []);
      setIncoming(d.incoming ?? []);
      setOutgoing(d.outgoing ?? []);
    } catch {
      /* leave lists as-is */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const act = async (username: string, method: "POST" | "DELETE") => {
    if (busy) return;
    setBusy(username);
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(username)}/friend`,
        withAuth({ method }),
      );
      if (!res.ok) throw new Error();
      await load();
    } catch {
      toast.error(t("profile.friendFailed"));
    } finally {
      setBusy(null);
    }
  };

  const closeModal = useCallback(() => onOpenChange(false), [onOpenChange]);
  const requestCount = incoming.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border dark:border-white/8">
          <DialogTitle className="text-base">{t("profile.friends")}</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3">
          {(["friends", "requests"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors",
                tab === k
                  ? "bg-accent dark:bg-white/12 text-foreground dark:text-white"
                  : "text-muted-foreground dark:text-white/40 hover:text-foreground/80 dark:hover:text-white/70",
              )}
            >
              {k === "friends" ? t("profile.friends") : t("profile.friendRequests")}
              {k === "requests" && requestCount > 0 && (
                <span className="px-1.5 py-px rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-200 tabular-nums">
                  {requestCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="max-h-[min(24rem,60vh)] overflow-y-auto py-2">
          {loading ? (
            <div className="flex justify-center py-10 text-muted-foreground dark:text-white/40">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : tab === "friends" ? (
            friends.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground dark:text-white/35 font-mono">
                {t("profile.friendsEmpty")}
              </p>
            ) : (
              friends.map((u) => (
                <Row key={u.username} u={u} onNavigate={closeModal}>
                  <IconBtn
                    onClick={() => act(u.username, "DELETE")}
                    label={t("profile.unfriend")}
                    icon={<UserMinus className="w-3.5 h-3.5" />}
                    danger
                    disabled={busy === u.username}
                  />
                </Row>
              ))
            )
          ) : incoming.length === 0 && outgoing.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground dark:text-white/35 font-mono">
              {t("profile.requestsEmpty")}
            </p>
          ) : (
            <>
              {incoming.map((u) => (
                <Row key={`in-${u.username}`} u={u} onNavigate={closeModal}>
                  <IconBtn
                    onClick={() => act(u.username, "POST")}
                    label={t("profile.acceptFriend")}
                    icon={<Check className="w-3.5 h-3.5" />}
                    disabled={busy === u.username}
                  />
                  <IconBtn
                    onClick={() => act(u.username, "DELETE")}
                    label={t("profile.declineFriend")}
                    icon={<X className="w-3.5 h-3.5" />}
                    danger
                    disabled={busy === u.username}
                  />
                </Row>
              ))}
              {outgoing.map((u) => (
                <Row key={`out-${u.username}`} u={u} onNavigate={closeModal}>
                  <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground/70 dark:text-white/25 mr-1">
                    {t("profile.friendRequested")}
                  </span>
                  <IconBtn
                    onClick={() => act(u.username, "DELETE")}
                    label={t("profile.cancelRequest")}
                    icon={<X className="w-3.5 h-3.5" />}
                    danger
                    disabled={busy === u.username}
                  />
                </Row>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
