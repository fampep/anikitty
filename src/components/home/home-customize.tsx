"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, GripVertical, Settings2, X } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";
import {
  DEFAULT_HOME_LAYOUT,
  readHomeLayoutPrefs,
  writeHomeLayoutPrefs,
  type HomeLayoutPrefs,
  type HomeSectionId,
} from "@/lib/home/home-layout-prefs";

const LABEL_KEYS: Record<HomeSectionId, string> = {
  continue: "continueWatching",
  "new-episodes": "latestEpisodes",
  upcoming: "upcomingAnime",
  "recently-added": "newReleases",
  completed: "justCompleted",
  rankings: "topRankings",
  seasonal: "thisSeason",
  discovery: "discoverMore",
  recommended: "recommendedForYou",
  "because-you-watched": "becauseYouWatchedShort",
  "recently-viewed": "recentlyViewed",
  collections: "popularCollections",
  "community-picks": "communityPicks",
  studios: "featuredStudios",
  "voice-actors": "featuredVoiceActors",
  schedule: "estimatedSchedule",
};

export default function HomeCustomizeButton() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<HomeLayoutPrefs>(DEFAULT_HOME_LAYOUT);

  useEffect(() => {
    setPrefs(readHomeLayoutPrefs());
    const sync = () => setPrefs(readHomeLayoutPrefs());
    window.addEventListener("anikitty:home-layout", sync);
    return () => window.removeEventListener("anikitty:home-layout", sync);
  }, []);

  const persist = (next: HomeLayoutPrefs) => {
    setPrefs(next);
    writeHomeLayoutPrefs(next);
  };

  const toggleHidden = (id: HomeSectionId) => {
    const hidden = prefs.hidden.includes(id)
      ? prefs.hidden.filter((x) => x !== id)
      : [...prefs.hidden, id];
    persist({ ...prefs, hidden });
  };

  const move = (id: HomeSectionId, dir: -1 | 1) => {
    const order = [...prefs.order];
    const idx = order.indexOf(id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= order.length) return;
    [order[idx], order[target]] = [order[target], order[idx]];
    persist({ ...prefs, order });
  };

  const reset = () => persist(DEFAULT_HOME_LAYOUT);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="site-ghost-btn site-focus !px-2.5 !py-1.5 text-[11px]"
        aria-label={t("home.customizeHome")}
      >
        <Settings2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t("home.customize")}</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-3 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            aria-label={t("common.close")}
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-md max-h-[80vh] overflow-hidden rounded-2xl border border-border dark:border-white/10 bg-background dark:bg-[#0b0b0e] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border dark:border-white/8">
              <div>
                <p className="text-sm font-semibold">{t("home.customizeHome")}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t("home.customizeHint")}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/50"
                aria-label={t("common.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-3 flex flex-col gap-1.5">
              {prefs.order.map((id, index) => {
                const hidden = prefs.hidden.includes(id);
                const labelKey = LABEL_KEYS[id];
                return (
                  <div
                    key={id}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border border-border/60 dark:border-white/[0.07] px-2.5 py-2",
                      hidden && "opacity-50",
                    )}
                  >
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" aria-hidden />
                    <span className="text-xs font-semibold flex-1 min-w-0 truncate">
                      {t(`home.${labelKey}`)}
                    </span>
                    <button
                      type="button"
                      className="size-7 rounded-md border border-border dark:border-white/10 flex items-center justify-center disabled:opacity-30"
                      disabled={index === 0}
                      onClick={() => move(id, -1)}
                      aria-label={t("common.previous")}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="size-7 rounded-md border border-border dark:border-white/10 flex items-center justify-center disabled:opacity-30"
                      disabled={index === prefs.order.length - 1}
                      onClick={() => move(id, 1)}
                      aria-label={t("common.next")}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleHidden(id)}
                      className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/40"
                      aria-label={hidden ? t("home.showSection") : t("home.hideSection")}
                    >
                      {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border dark:border-white/8">
              <button
                type="button"
                onClick={reset}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                {t("home.resetLayout")}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => persist({ ...prefs, compact: !prefs.compact })}
                  className={cn(
                    "text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors",
                    prefs.compact
                      ? "border-foreground/30 bg-foreground/10 text-foreground"
                      : "border-border dark:border-white/10 text-muted-foreground",
                  )}
                >
                  {t("home.compactMode")}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-foreground text-background dark:bg-white dark:text-black text-xs font-bold"
                >
                  {t("bulkSelect.done")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
