"use client";

import { useEffect, useState } from "react";
import { Circle, Minus, Moon, EyeOff } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { withAuth } from "@/lib/auth/auth-fetch";
import {
  ACTIVITY_STATUSES,
  presenceStatusColor,
  resolvePublicPresence,
  type ActivityStatus,
  type PublicPresenceStatus,
} from "@/lib/user/presence";
import { useT } from "@/providers/i18n-provider";
import { toast } from "sonner";
import { PresenceDot } from "@/components/profile/presence-indicator";

const STATUS_OPTIONS: {
  value: ActivityStatus;
  icon: typeof Circle;
  labelKey: string;
  descKey: string;
}[] = [
  { value: "online", icon: Circle, labelKey: "presence.status.online", descKey: "presence.desc.online" },
  { value: "away", icon: Moon, labelKey: "presence.status.away", descKey: "presence.desc.away" },
  { value: "dnd", icon: Minus, labelKey: "presence.status.dnd", descKey: "presence.desc.dnd" },
  { value: "invisible", icon: EyeOff, labelKey: "presence.status.invisible", descKey: "presence.desc.invisible" },
];

export default function PresenceSettings() {
  const t = useT();
  const [activityStatus, setActivityStatus] = useState<ActivityStatus>("online");
  const [presenceStatus, setPresenceStatus] = useState<PublicPresenceStatus>("offline");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/account/presence", withAuth());
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (ACTIVITY_STATUSES.includes(data.activityStatus)) {
          setActivityStatus(data.activityStatus);
        }
        setPresenceStatus(data.presenceStatus ?? "offline");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateStatus = async (next: ActivityStatus) => {
    if (saving || next === activityStatus) return;
    setSaving(true);
    try {
      const res = await fetch(
        "/api/account/presence",
        withAuth({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activityStatus: next }),
        }),
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((data as { error?: string }).error ?? t("presence.updateFailed"));
        return;
      }
      setActivityStatus(next);
      setPresenceStatus(data.presenceStatus ?? resolvePublicPresence({ activityStatus: next, lastOnlineAt: new Date(), forOwner: true }).status);
      toast.success(t("presence.updated"));
    } catch {
      toast.error(t("presence.updateFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <PresenceDot status={presenceStatus} pulse={presenceStatus === "online"} />
        <p className="text-[12px] text-muted-foreground dark:text-white/40">
          {loading ? "…" : t(`presence.status.${presenceStatus}`)}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {STATUS_OPTIONS.map(({ value, icon: Icon, labelKey, descKey }) => {
          const active = activityStatus === value;
          const previewStatus = resolvePublicPresence({
            activityStatus: value,
            lastOnlineAt: new Date(),
            forOwner: true,
          }).status;

          return (
            <button
              key={value}
              type="button"
              disabled={loading || saving}
              onClick={() => void updateStatus(value)}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                active
                  ? "border-primary/40 bg-accent dark:border-primary/25 dark:bg-primary/[0.08]"
                  : "border-border dark:border-white/10 bg-muted/20 dark:bg-white/[0.02] hover:border-border dark:hover:border-white/18",
              )}
            >
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${presenceStatusColor(previewStatus)}18`, color: presenceStatusColor(previewStatus) }}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-foreground dark:text-white/85">{t(labelKey)}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground dark:text-white/35">{t(descKey)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
