"use client";

import { useCallback, useEffect, useState } from "react";
import { LayoutGrid, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { withAuth } from "@/lib/auth/auth-fetch";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";
import {
  DEFAULT_PROFILE_SECTIONS,
  PROFILE_SECTION_KEYS,
  type ProfileSectionKey,
  type ProfileSectionVisibility,
} from "@/lib/user/profile-sections";

const SECTION_LABEL_KEYS: Record<ProfileSectionKey, string> = {
  headerBio: "profile.sections.headerBio",
  continueWatching: "profile.sections.continueWatching",
  about: "profile.sectionNav.about",
  watchlist: "profile.sectionNav.watchlist",
  activity: "profile.sectionNav.activity",
  libraryStats: "profile.sections.libraryStats",
  achievements: "profile.sectionNav.achievements",
  skipContributions: "profile.skipContributions",
};

const SECTION_DESC_KEYS: Partial<Record<ProfileSectionKey, string>> = {
  headerBio: "profile.sections.headerBioDesc",
  continueWatching: "profile.sections.continueWatchingDesc",
  about: "profile.sections.aboutDesc",
  watchlist: "profile.sections.watchlistDesc",
  activity: "profile.sections.activityDesc",
  libraryStats: "profile.sections.libraryStatsDesc",
  achievements: "profile.sections.achievementsDesc",
  skipContributions: "profile.sections.skipContributionsDesc",
};

export default function ProfileSectionsSettings() {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<ProfileSectionVisibility>(DEFAULT_PROFILE_SECTIONS);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/profile-sections", withAuth());
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { profileSections?: ProfileSectionVisibility };
      setSections({ ...DEFAULT_PROFILE_SECTIONS, ...data.profileSections });
    } catch {
      toast.error(t("profile.sections.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (key: ProfileSectionKey) => {
    const previous = sections;
    const next = { ...sections, [key]: !sections[key] };
    setSaving(true);
    setSections(next);
    try {
      const res = await fetch(
        "/api/account/profile-sections",
        withAuth({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileSections: next }),
        }),
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? "Failed");
      }
      setSections({ ...DEFAULT_PROFILE_SECTIONS, ...(data as { profileSections: ProfileSectionVisibility }).profileSections });
      toast.success(t("profile.sections.saved"));
    } catch (e) {
      setSections(previous);
      toast.error(e instanceof Error ? e.message : t("profile.sections.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground dark:text-white/35 text-sm py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        {t("settings.loading")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] text-muted-foreground dark:text-white/40 mb-1">
        {t("profile.sections.hint")}
      </p>
      {PROFILE_SECTION_KEYS.map((key) => {
        const enabled = sections[key] !== false;
        return (
          <button
            key={key}
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={saving}
            onClick={() => void toggle(key)}
            className={cn(
              "flex w-full items-center justify-between gap-4 px-4 py-3 rounded-xl border transition-colors text-left",
              enabled
                ? "border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.03] hover:border-primary/30"
                : "border-border/60 dark:border-white/8 bg-muted/15 dark:bg-white/[0.015] opacity-80 hover:opacity-100",
            )}
          >
            <div className="flex items-start gap-3 min-w-0">
              <span className="mt-0.5 text-muted-foreground dark:text-white/30">
                <LayoutGrid className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground/85 dark:text-white/80">
                  {t(SECTION_LABEL_KEYS[key])}
                </span>
                {SECTION_DESC_KEYS[key] && (
                  <span className="mt-0.5 block text-[10px] font-mono text-muted-foreground/80 dark:text-white/30">
                    {t(SECTION_DESC_KEYS[key]!)}
                  </span>
                )}
              </span>
            </div>
            <div
              aria-hidden
              className={cn(
                "relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0",
                enabled ? "bg-primary/70" : "bg-accent dark:bg-white/12",
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                  enabled ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
