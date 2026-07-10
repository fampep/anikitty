"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuthStore } from "@/store/auth-store";
import { withAuth } from "@/lib/auth/auth-fetch";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";
import { toast } from "sonner";
import LoginPopoverButton from "@/components/auth/login-popover-button";

type Props = {
  anilistId: string;
  animeTitle: string;
  animeThumbnail?: string | null;
  japaneseTitle?: string | null;
  malId?: number | null;
  fallbackSub?: number;
  status?: string | null;
  hasDub: boolean;
  isAiring: boolean;
};

type AlertState = {
  subscribed: boolean;
  notifySub: boolean;
  notifyDub: boolean;
};

async function fetchAlert(anilistId: string): Promise<AlertState> {
  const res = await fetch(
    `/api/account/anime-alerts?anilistId=${anilistId}`,
    withAuth(),
  );
  if (!res.ok) throw new Error("fetch failed");
  const data = await res.json();
  return data.alert;
}

export default function AnimeEpisodeAlertButton({
  anilistId,
  animeTitle,
  animeThumbnail,
  japaneseTitle,
  malId,
  fallbackSub,
  status,
  hasDub,
  isAiring,
}: Props) {
  const t = useT();
  const { auth } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<AlertState>({
    subscribed: false,
    notifySub: true,
    notifyDub: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAlert(anilistId);
      setAlert(data);
    } catch {
      setAlert({ subscribed: false, notifySub: true, notifyDub: false });
    } finally {
      setLoading(false);
    }
  }, [anilistId]);

  useEffect(() => {
    if (auth) load();
  }, [auth, load]);

  if (!isAiring) return null;

  const save = async (next: AlertState) => {
    setSaving(true);
    try {
      if (!next.subscribed || (!next.notifySub && !next.notifyDub)) {
        const res = await fetch(
          `/api/account/anime-alerts?anilistId=${anilistId}`,
          withAuth({ method: "DELETE" }),
        );
        if (!res.ok) throw new Error("delete failed");
        setAlert({ subscribed: false, notifySub: true, notifyDub: false });
        toast.success(t("anime.episodeAlerts.off"));
        return;
      }

      const res = await fetch(
        "/api/account/anime-alerts",
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anilistId: parseInt(anilistId, 10),
            animeTitle,
            animeThumbnail,
            japaneseTitle,
            malId,
            fallbackSub,
            status,
            notifySub: next.notifySub,
            notifyDub: next.notifyDub,
          }),
        }),
      );
      if (!res.ok) throw new Error("save failed");
      const data = await res.json();
      setAlert(data.alert);
      toast.success(t("anime.episodeAlerts.on"));
    } catch {
      toast.error(t("anime.episodeAlerts.error"));
    } finally {
      setSaving(false);
    }
  };

  const toggleSubscribed = () => {
    if (alert.subscribed) {
      void save({ ...alert, subscribed: false });
    } else {
      void save({ subscribed: true, notifySub: true, notifyDub: alert.notifyDub && hasDub });
    }
  };

  const triggerClass = cn(
    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
    alert.subscribed
      ? "border-violet-500/40 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25"
      : "border-border dark:border-white/12 bg-muted/50 dark:bg-white/[0.04] text-muted-foreground dark:text-white/70 hover:bg-accent dark:hover:bg-white/[0.08] hover:text-foreground dark:hover:text-white",
  );

  const triggerContent = (
    <>
      {saving || loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : alert.subscribed ? (
        <Bell className="h-3.5 w-3.5 fill-current" />
      ) : (
        <BellOff className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">{t("anime.episodeAlerts.title")}</span>
    </>
  );

  if (!auth) {
    return (
      <LoginPopoverButton
        customTrigger={
          <span className={cn(triggerClass, "cursor-pointer")}>
            <BellOff className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("anime.episodeAlerts.title")}</span>
          </span>
        }
      />
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={saving || loading}
          className={triggerClass}
          aria-label={t("anime.episodeAlerts.title")}
        >
          {triggerContent}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 p-4 bg-[#0a0a0a] border border-border dark:border-white/12 rounded-xl shadow-2xl"
      >
        <p className="text-sm font-semibold text-foreground dark:text-white">{t("anime.episodeAlerts.title")}</p>
        <p className="text-[11px] text-muted-foreground dark:text-white/40 mt-1 leading-relaxed">
          {t("anime.episodeAlerts.desc")}
        </p>

        <label className="mt-4 flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={alert.subscribed && alert.notifySub}
            disabled={saving}
            onChange={(e) => {
              const notifySub = e.target.checked;
              const next = {
                subscribed: notifySub || alert.notifyDub,
                notifySub,
                notifyDub: alert.notifyDub,
              };
              setAlert(next);
              void save(next);
            }}
            className="rounded border-border dark:border-white/20 bg-muted/50 dark:bg-white/5 text-violet-500 focus:ring-violet-500/40"
          />
          <span className="text-xs text-foreground/90 dark:text-white/80">{t("anime.episodeAlerts.notifySub")}</span>
        </label>

        {hasDub && (
          <label className="mt-3 flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={alert.subscribed && alert.notifyDub}
              disabled={saving}
              onChange={(e) => {
                const notifyDub = e.target.checked;
                const next = {
                  subscribed: alert.notifySub || notifyDub,
                  notifySub: alert.notifySub,
                  notifyDub,
                };
                setAlert(next);
                void save(next);
              }}
              className="rounded border-border dark:border-white/20 bg-muted/50 dark:bg-white/5 text-violet-500 focus:ring-violet-500/40"
            />
            <span className="text-xs text-foreground/90 dark:text-white/80">{t("anime.episodeAlerts.notifyDub")}</span>
          </label>
        )}

        {alert.subscribed && (
          <button
            type="button"
            disabled={saving}
            onClick={toggleSubscribed}
            className="mt-4 w-full text-[11px] font-mono text-muted-foreground dark:text-white/35 hover:text-red-300/80 transition-colors"
          >
            {t("anime.episodeAlerts.turnOff")}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
