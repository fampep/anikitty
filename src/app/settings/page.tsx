"use client";

import Container from "@/components/layout/container";
import Avatar from "@/components/common/avatar";
import { useSettingsStore, EpisodeLayout } from "@/store/settings-store";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/core/utils";
import {
  Settings,
  LayoutList,
  Grid2x2,
  LayoutGrid,
  Captions,
  Mic,
  Play,
  Loader2,
  LinkIcon,
  User,
  Shield,
  Palette,
  EyeOff,
  ExternalLink,
  Coins,
  Gauge,
  Music2,
  SkipForward,
  Maximize2,
  Bell,
  AtSign,
  CornerUpLeft,
  UserPlus,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import AnilistConnect from "@/components/profile/anilist-connect";
import MalConnect from "@/components/profile/mal-connect";
import ProfileCustomizationForm, {
  type ProfileCustomizationValues,
} from "@/components/profile/profile-customization-form";
import { LiteModeToggle } from "@/components/settings/lite-mode-toggle";
import ProfileMediaPreview from "@/components/profile/profile-media-preview";
import { applyUserThemeColor } from "@/lib/core/theme-color";
import { withAuth } from "@/lib/auth/auth-fetch";
import TwoFactorSection from "@/components/auth/two-factor-section";
import PasskeysSection from "@/components/auth/passkeys-section";
import ActiveSessionsSection from "@/components/auth/active-sessions-section";
import ProfilePrivacySection from "@/components/profile/profile-privacy-section";
import BlockedUsersSection from "@/components/profile/blocked-users-section";
import AccountDeletionSection from "@/components/auth/account-deletion-section";
import SubtitleSettingsPanel from "@/components/subtitles/subtitle-settings-panel";
import SiteDisplaySettings from "@/components/settings/site-display-settings";
import DiscordConnect from "@/components/auth/discord-connect";
import AnisurgeConnect from "@/components/auth/anisurge-connect";
import { RoleBadge } from "@/components/profile/role-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/providers/i18n-provider";
import { ROUTES } from "@/constants/routes";
import { useKittycoins } from "@/hooks/use-kittycoins";

const TAB_CLASS =
  "text-sm font-semibold px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground dark:data-[state=active]:border-white dark:data-[state=active]:text-white data-[state=active]:bg-transparent text-muted-foreground hover:text-foreground transition-all bg-transparent whitespace-nowrap";

type SettingsTab = "general" | "profile" | "security" | "connections";

const AUTH_TABS: SettingsTab[] = ["general", "profile", "security", "connections"];

function useEpisodeLayouts(t: ReturnType<typeof useT>) {
  return useMemo(
    () =>
      [
        {
          value: "list" as EpisodeLayout,
          label: t("settings.layoutList"),
          description: t("settings.layoutListDesc"),
          icon: <LayoutList className="w-4 h-4" />,
          preview: (
            <div className="flex flex-col gap-1 w-full px-2 py-1">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-2 h-7 rounded-md bg-muted/50 dark:bg-white/5 px-2">
                  <span className="text-[9px] font-mono text-muted-foreground/80 dark:text-white/25 w-4">{n}</span>
                  <div className="flex-1 h-1.5 rounded bg-accent dark:bg-white/10" />
                </div>
              ))}
            </div>
          ),
        },
        {
          value: "compact" as EpisodeLayout,
          label: t("settings.layoutCompact"),
          description: t("settings.layoutCompactDesc"),
          icon: <Grid2x2 className="w-4 h-4" />,
          preview: (
            <div className="grid grid-cols-4 gap-1 w-full px-2 py-1">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="h-7 rounded bg-muted/50 dark:bg-white/5 flex items-center justify-center">
                  <span className="text-[9px] font-mono text-muted-foreground/80 dark:text-white/25">{n}</span>
                </div>
              ))}
            </div>
          ),
        },
        {
          value: "thumbnail" as EpisodeLayout,
          label: t("settings.layoutThumbnail"),
          description: t("settings.layoutThumbnailDesc"),
          icon: <LayoutGrid className="w-4 h-4" />,
          preview: (
            <div className="grid grid-cols-3 gap-1 w-full px-2 py-1">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="aspect-[16/9] rounded bg-muted/50 dark:bg-white/5 relative overflow-hidden flex items-end p-1"
                >
                  <span className="text-[8px] font-mono text-muted-foreground dark:text-white/40 bg-muted/80 dark:bg-black/50 px-1 rounded">
                    EP {n}
                  </span>
                </div>
              ))}
            </div>
          ),
        },
      ] as const,
    [t],
  );
}

function AccountCard() {
  const t = useT();
  const { auth } = useAuthStore();
  if (!auth) return null;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 dark:bg-white/3 border border-border dark:border-white/10">
      <Avatar className="w-14 h-14 shrink-0" username={auth.username} url={auth.avatar ?? undefined} />
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold text-foreground dark:text-white leading-tight">@{auth.username}</p>
        <p className="text-[11px] font-mono text-muted-foreground dark:text-white/30 mt-0.5 truncate">{auth.email ?? "—"}</p>
        {auth.role && auth.role !== "user" && (
          <div className="mt-2">
            <RoleBadge role={auth.role} size="sm" />
          </div>
        )}
      </div>
      <Link
        href={`/profile/${encodeURIComponent(auth.username)}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border dark:border-white/12 bg-muted/50 dark:bg-white/5 text-muted-foreground dark:text-white/45 text-[12px] font-medium hover:bg-accent dark:bg-white/10 hover:text-foreground/90 dark:text-white/80 hover:border-border dark:border-white/25 transition-all shrink-0"
      >
        {t("settings.viewProfile")}
        <ExternalLink className="w-3 h-3 opacity-60" />
      </Link>
    </div>
  );
}

function ShopSection() {
  const t = useT();
  const auth = useAuthStore((s) => s.auth);
  const { balance, loaded } = useKittycoins(!!auth);
  if (!auth) return null;

  return (
    <SectionCard>
      <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-center shrink-0">
            <Coins className="w-4 h-4 text-amber-300" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground dark:text-white/90">{t("settings.shopTitle")}</h3>
            <p className="text-[12px] text-muted-foreground dark:text-white/40 mt-1 leading-relaxed">{t("settings.shopDesc")}</p>
            <p className="text-[12px] font-bold text-amber-300/90 mt-2 tabular-nums">
              {loaded ? `${balance.toLocaleString()} Kittycoins` : "—"}
            </p>
          </div>
        </div>
        <Link
          href={ROUTES.SHOP}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg site-brand-btn text-[12px] font-bold shrink-0"
        >
          {t("settings.openShop")}
          <ExternalLink className="w-3 h-3 opacity-70" />
        </Link>
      </div>
    </SectionCard>
  );
}

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card/50 overflow-hidden dark:border-white/8 dark:bg-white/[0.02]", className)}>
      {children}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-4 border-b border-border dark:border-white/6">
      <span className="text-muted-foreground mt-0.5 shrink-0 dark:text-white/30">{icon}</span>
      <div>
        <h2 className="text-sm font-bold text-foreground dark:text-white/85">{title}</h2>
        <p className="text-[11px] text-muted-foreground font-mono mt-0.5 dark:text-white/30">{description}</p>
      </div>
    </div>
  );
}

function SectionBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

function SubSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-widest mb-4">{children}</h3>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between gap-4 px-4 py-3 rounded-xl bg-muted/30 dark:bg-white/3 border border-border dark:border-white/8 hover:border-border dark:border-white/14 transition-colors cursor-pointer text-left"
    >
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground dark:text-white/30" aria-hidden>
          {icon}
        </span>
        <div>
          <p className="text-sm font-medium text-foreground/85 dark:text-white/75">{label}</p>
          <p className="text-[10px] text-muted-foreground/80 dark:text-white/25 font-mono mt-0.5">{description}</p>
        </div>
      </div>
      <div
        aria-hidden
        className={cn(
          "relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0",
          value ? "bg-muted/60 dark:bg-muted/60 dark:bg-white/60" : "bg-accent dark:bg-white/12",
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            value ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </div>
    </button>
  );
}

function StatPill({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] rounded-full border font-medium",
        accent
          ? "border-violet-400/25 text-violet-200/80 bg-violet-500/10"
          : "border-border dark:border-white/10 text-muted-foreground dark:text-white/45 bg-muted/40 dark:bg-white/4",
      )}
    >
      {label}
    </span>
  );
}

function NotificationsSection() {
  const t = useT();
  const {
    notifyMentions, setNotifyMentions,
    notifyReplies, setNotifyReplies,
    notifyFollows, setNotifyFollows,
  } = useSettingsStore();

  return (
    <SectionCard>
      <SectionHeader
        icon={<Bell className="w-4 h-4" />}
        title={t("settings.notifications")}
        description={t("settings.notificationsDesc")}
      />
      <SectionBody className="space-y-2">
        <ToggleRow
          icon={<AtSign className="w-4 h-4" />}
          label={t("settings.notifyMentions")}
          description={t("settings.notifyMentionsDesc")}
          value={notifyMentions}
          onChange={setNotifyMentions}
        />
        <ToggleRow
          icon={<CornerUpLeft className="w-4 h-4" />}
          label={t("settings.notifyReplies")}
          description={t("settings.notifyRepliesDesc")}
          value={notifyReplies}
          onChange={setNotifyReplies}
        />
        <ToggleRow
          icon={<UserPlus className="w-4 h-4" />}
          label={t("settings.notifyFollows")}
          description={t("settings.notifyFollowsDesc")}
          value={notifyFollows}
          onChange={setNotifyFollows}
        />
      </SectionBody>
    </SectionCard>
  );
}

function AppearanceSection() {
  const t = useT();
  const { auth, setAuth } = useAuthStore();
  const [loaded, setLoaded] = useState(false);
  const [initial, setInitial] = useState<ProfileCustomizationValues>({
    avatarUrl: "",
    bannerUrl: "",
    bio: "",
    themeColor: null,
  });

  useEffect(() => {
    if (!auth) return;
    fetch("/api/account/me", withAuth())
      .then((r) => r.json())
      .then((d) => {
        const u = d.user ?? {};
        setInitial({
          avatarUrl: u.avatarUrl ?? auth.avatar ?? "",
          bannerUrl: u.bannerUrl ?? auth.bannerUrl ?? "",
          bio: u.bio ?? auth.bio ?? "",
          themeColor: u.themeColor ?? auth.themeColor ?? null,
        });
      })
      .catch(() => {
        setInitial({
          avatarUrl: auth.avatar ?? "",
          bannerUrl: auth.bannerUrl ?? "",
          bio: auth.bio ?? "",
          themeColor: auth.themeColor ?? null,
        });
      })
      .finally(() => setLoaded(true));
  }, [auth]);

  if (!auth) return null;

  return (
    <SectionCard>
      <SectionHeader
        icon={<Palette className="w-4 h-4" />}
        title={t("settings.appearance")}
        description={t("settings.appearanceDesc")}
      />
      <SectionBody>
        {loaded ? (
          <ProfileCustomizationForm
            initial={initial}
            onSaved={(values) => {
              setAuth({
                ...auth,
                avatar: values.avatarUrl || auth.avatar,
                bannerUrl: values.bannerUrl || null,
                bio: values.bio || null,
                themeColor: values.themeColor,
              });
              applyUserThemeColor(values.themeColor);
              setInitial(values);
            }}
          />
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground text-sm font-mono py-4 dark:text-white/30">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("settings.loading")}
          </div>
        )}
      </SectionBody>
    </SectionCard>
  );
}

function SiteDisplaySection() {
  const t = useT();

  return (
    <SectionCard>
      <SectionHeader
        icon={<Palette className="w-4 h-4" />}
        title={t("settings.siteDisplay")}
        description={t("settings.siteDisplayDesc")}
      />
      <SectionBody>
        <SiteDisplaySettings />
      </SectionBody>
    </SectionCard>
  );
}

function EpisodeLayoutSection({
  episodeLayouts,
  episodeLayout,
  setEpisodeLayout,
}: {
  episodeLayouts: ReturnType<typeof useEpisodeLayouts>;
  episodeLayout: EpisodeLayout;
  setEpisodeLayout: (v: EpisodeLayout) => void;
}) {
  const t = useT();

  return (
    <SectionCard>
      <SectionHeader
        icon={<LayoutList className="w-4 h-4" />}
        title={t("settings.episodeLayout")}
        description={t("settings.episodeLayoutDesc")}
      />
      <SectionBody>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {episodeLayouts.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setEpisodeLayout(opt.value)}
              className={cn(
                "flex flex-col rounded-xl border transition-all duration-200 overflow-hidden text-left",
                episodeLayout === opt.value
                  ? "border-primary/50 bg-accent dark:border-white/40 dark:bg-white/8 ring-1 ring-primary/20 dark:ring-white/20"
                  : "border-border dark:border-white/10 bg-muted/30 dark:bg-white/3 hover:border-border dark:border-white/20 hover:bg-muted/50 dark:bg-white/5",
              )}
            >
              <div className="h-24 bg-muted dark:bg-black/30 flex items-center justify-center border-b border-border dark:border-white/6">
                {opt.preview}
              </div>
              <div className="px-3 py-2.5 flex items-center gap-2">
                <span className={episodeLayout === opt.value ? "text-muted-foreground dark:text-white/70" : "text-muted-foreground dark:text-white/30"}>
                  {opt.icon}
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      episodeLayout === opt.value ? "text-foreground dark:text-white" : "text-muted-foreground dark:text-white/55",
                    )}
                  >
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 dark:text-white/25 mt-0.5 font-mono line-clamp-2">
                    {opt.description}
                  </p>
                </div>
                {episodeLayout === opt.value && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-muted/60 dark:bg-muted/60 dark:bg-white/60 shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      </SectionBody>
    </SectionCard>
  );
}

function PerformanceSection() {
  const t = useT();

  return (
    <SectionCard>
      <SectionHeader
        icon={<Gauge className="w-4 h-4" />}
        title={t("settings.performance")}
        description={t("settings.performanceDesc")}
      />
      <SectionBody>
        <LiteModeToggle />
      </SectionBody>
    </SectionCard>
  );
}

function PlaybackSection({
  preferDub,
  setPreferDub,
  autoPlay,
  setAutoPlay,
  playThemeSong,
  setPlayThemeSong,
  autoSkipIntro,
  setAutoSkipIntro,
  theatreMode,
  setTheatreMode,
}: {
  preferDub: boolean;
  setPreferDub: (v: boolean) => void;
  autoPlay: boolean;
  setAutoPlay: (v: boolean) => void;
  playThemeSong: boolean;
  setPlayThemeSong: (v: boolean) => void;
  autoSkipIntro: boolean;
  setAutoSkipIntro: (v: boolean) => void;
  theatreMode: boolean;
  setTheatreMode: (v: boolean) => void;
}) {
  const t = useT();

  return (
    <SectionCard>
      <SectionHeader
        icon={<Play className="w-4 h-4" />}
        title={t("settings.playback")}
        description={t("settings.playbackDesc")}
      />
      <SectionBody className="flex flex-col gap-3">
        <ToggleRow
          icon={<Mic className="w-4 h-4" />}
          label={t("settings.preferDub")}
          description={t("settings.preferDubDesc")}
          value={preferDub}
          onChange={setPreferDub}
        />
        <ToggleRow
          icon={<Play className="w-4 h-4" />}
          label={t("settings.autoPlay")}
          description={t("settings.autoPlayDesc")}
          value={autoPlay}
          onChange={setAutoPlay}
        />
        <ToggleRow
          icon={<SkipForward className="w-4 h-4" />}
          label={t("settings.autoSkipIntro")}
          description={t("settings.autoSkipIntroDesc")}
          value={autoSkipIntro}
          onChange={setAutoSkipIntro}
        />
        <ToggleRow
          icon={<Maximize2 className="w-4 h-4" />}
          label={t("settings.theatreMode")}
          description={t("settings.theatreModeDesc")}
          value={theatreMode}
          onChange={setTheatreMode}
        />
        <ToggleRow
          icon={<Music2 className="w-4 h-4" />}
          label={t("settings.playThemeSong")}
          description={t("settings.playThemeSongDesc")}
          value={playThemeSong}
          onChange={setPlayThemeSong}
        />
      </SectionBody>
    </SectionCard>
  );
}

function SubtitleSection() {
  const t = useT();

  return (
    <SectionCard>
      <SectionHeader
        icon={<Captions className="w-4 h-4" />}
        title={t("settings.subtitleAppearance")}
        description={t("settings.subtitleAppearanceDesc")}
      />
      <SectionBody>
        <SubtitleSettingsPanel />
      </SectionBody>
    </SectionCard>
  );
}

function AudioHelpSection() {
  const t = useT();

  return (
    <SectionCard>
      <SectionHeader
        icon={<Captions className="w-4 h-4" />}
        title={t("settings.audioSubtitles")}
        description={t("settings.audioSubtitlesDesc")}
      />
      <SectionBody>
        <p className="text-sm text-muted-foreground dark:text-white/45 leading-relaxed">{t("settings.audioHelp")}</p>
      </SectionBody>
    </SectionCard>
  );
}

function SettingsHero({
  layoutLabel,
  preferDub,
}: {
  layoutLabel: string;
  preferDub: boolean;
}) {
  const t = useT();
  const { auth } = useAuthStore();
  const bannerUrl = auth?.bannerUrl ?? null;

  return (
    <>
      <div className="relative h-44 sm:h-52 md:h-60 w-full overflow-hidden">
        {bannerUrl ? (
          <div className="absolute inset-0">
            <ProfileMediaPreview src={bannerUrl} alt="" variant="banner" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-violet-950/40 to-black" />
        )}
        {!bannerUrl && (
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 36px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 36px)",
            }}
          />
        )}
        {bannerUrl && <div className="absolute inset-0 bg-black/35" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-background/50 dark:via-black/40 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 dark:from-black/80 via-transparent to-transparent" />
      </div>

      <Container className="-mt-16 sm:-mt-20 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 mb-8 sm:mb-10">
          <div className="shrink-0 self-center sm:self-auto">
            {auth ? (
              <div
                className={cn(
                  "rounded-full p-[3px] shadow-2xl",
                  auth.themeColor ? "user-accent-ring" : "bg-gradient-to-br from-white/30 via-white/20 to-white/10",
                )}
              >
                <div className="rounded-full p-[2px] bg-black">
                  <Avatar
                    className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32"
                    username={auth.username}
                    url={auth.avatar ?? undefined}
                  />
                </div>
              </div>
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-accent dark:bg-white/8 border border-border dark:border-white/12 flex items-center justify-center shadow-2xl">
                <Settings className="w-10 h-10 text-muted-foreground dark:text-white/35" />
              </div>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left pb-1 min-w-0">
            <h1 className="text-2xl md:text-4xl font-black text-foreground dark:text-white tracking-tight leading-tight">
              {t("settings.title")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground dark:text-white/35 mt-1.5 font-mono max-w-xl">
              {auth ? `@${auth.username} · ${t("settings.subtitle")}` : t("settings.subtitle")}
            </p>

            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 justify-center sm:justify-start">
              <StatPill label={layoutLabel} accent />
              <StatPill label={preferDub ? t("settings.preferDub") : t("card.sub")} />
              {auth?.role && auth.role !== "user" && <RoleBadge role={auth.role} size="sm" />}
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}

export default function SettingsPage() {
  const t = useT();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const episodeLayouts = useEpisodeLayouts(t);
  const { auth } = useAuthStore();
  const { episodeLayout, setEpisodeLayout, preferDub, setPreferDub, autoPlay, setAutoPlay, playThemeSong, setPlayThemeSong, autoSkipIntro, setAutoSkipIntro, theatreMode, setTheatreMode } =
    useSettingsStore();

  const defaultTab = useMemo((): SettingsTab => {
    const tab = searchParams.get("tab");
    if (tab && AUTH_TABS.includes(tab as SettingsTab)) {
      if (!auth && tab !== "general") return "general";
      return tab as SettingsTab;
    }
    return "general";
  }, [searchParams, auth]);

  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const onTabChange = useCallback(
    (value: string) => {
      const tab = value as SettingsTab;
      setActiveTab(tab);
      router.replace(`${pathname}?tab=${tab}`, { scroll: false });
    },
    [pathname, router],
  );

  const layoutLabel =
    episodeLayouts.find((o) => o.value === episodeLayout)?.label ?? episodeLayout;

  const tabs = useMemo(() => {
    const items: { value: SettingsTab; label: string }[] = [
      { value: "general", label: t("settings.tabs.general") },
    ];
    if (auth) {
      items.push(
        { value: "profile", label: t("settings.tabs.profile") },
        { value: "security", label: t("settings.tabs.security") },
        { value: "connections", label: t("settings.tabs.connections") },
      );
    }
    return items;
  }, [auth, t]);

  return (
    <div className="w-full min-h-screen pb-28">
      <SettingsHero layoutLabel={layoutLabel} preferDub={preferDub} />

      <Container>
        {auth ? (
          <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
            <TabsList className="flex items-center justify-start w-full sm:w-fit h-fit bg-transparent border-b border-border dark:border-white/8 rounded-none gap-0 px-0 pb-0 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className={TAB_CLASS}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="general" className="mt-8 space-y-5">
              {auth && <ShopSection />}
              <SiteDisplaySection />
              <PerformanceSection />
              <PlaybackSection
                preferDub={preferDub}
                setPreferDub={setPreferDub}
                autoPlay={autoPlay}
                setAutoPlay={setAutoPlay}
                playThemeSong={playThemeSong}
                setPlayThemeSong={setPlayThemeSong}
                autoSkipIntro={autoSkipIntro}
                setAutoSkipIntro={setAutoSkipIntro}
                theatreMode={theatreMode}
                setTheatreMode={setTheatreMode}
              />
              <EpisodeLayoutSection
                episodeLayouts={episodeLayouts}
                episodeLayout={episodeLayout}
                setEpisodeLayout={setEpisodeLayout}
              />
              <SubtitleSection />
              <AudioHelpSection />
            </TabsContent>

            <TabsContent value="profile" className="mt-8 space-y-5">
              <SectionCard>
                <SectionHeader
                  icon={<User className="w-4 h-4" />}
                  title={t("settings.account")}
                  description={t("settings.accountDesc")}
                />
                <SectionBody>
                  <AccountCard />
                </SectionBody>
              </SectionCard>
              <AppearanceSection />
              {auth && <NotificationsSection />}
            </TabsContent>

            <TabsContent value="security" className="mt-8 space-y-5">
              <SectionCard>
                <SectionHeader
                  icon={<EyeOff className="w-4 h-4" />}
                  title={t("settings.privacy")}
                  description={t("settings.privacyDesc")}
                />
                <SectionBody className="flex flex-col gap-8">
                  <ProfilePrivacySection />
                  <div className="border-t border-border dark:border-white/6 pt-8">
                    <SubSectionTitle>{t("settings.blockedUsers")}</SubSectionTitle>
                    <BlockedUsersSection />
                  </div>
                  <div className="border-t border-border dark:border-white/6 pt-8">
                    <SubSectionTitle>{t("settings.accountDeletion")}</SubSectionTitle>
                    <AccountDeletionSection />
                  </div>
                </SectionBody>
              </SectionCard>

              <SectionCard>
                <SectionHeader
                  icon={<Shield className="w-4 h-4" />}
                  title={t("settings.security")}
                  description={t("settings.securityDesc")}
                />
                <SectionBody className="flex flex-col gap-6">
                  <div>
                    <SubSectionTitle>{t("settings.passkeys")}</SubSectionTitle>
                    <PasskeysSection />
                  </div>
                  <div className="border-t border-border dark:border-white/6 pt-6">
                    <SubSectionTitle>{t("settings.twoFactor")}</SubSectionTitle>
                    <TwoFactorSection />
                  </div>
                  <div className="border-t border-border dark:border-white/6 pt-6">
                    <SubSectionTitle>{t("settings.activeSessions")}</SubSectionTitle>
                    <ActiveSessionsSection />
                  </div>
                </SectionBody>
              </SectionCard>
            </TabsContent>

            <TabsContent value="connections" className="mt-8 space-y-5">
              <SectionCard>
                <SectionHeader
                  icon={<LinkIcon className="w-4 h-4" />}
                  title={t("settings.connectedAccounts")}
                  description={t("settings.connectedDesc")}
                />
                <SectionBody className="flex flex-col gap-6">
                  <div>
                    <SubSectionTitle>{t("settings.anilist")}</SubSectionTitle>
                    <AnilistConnect />
                  </div>
                  <div className="border-t border-border dark:border-white/6 pt-6">
                    <SubSectionTitle>{t("settings.mal")}</SubSectionTitle>
                    <MalConnect />
                  </div>
                  <div className="border-t border-border dark:border-white/6 pt-6">
                    <SubSectionTitle>{t("settings.anisurge")}</SubSectionTitle>
                    <AnisurgeConnect />
                  </div>
                  <div className="border-t border-border dark:border-white/6 pt-6">
                    <SubSectionTitle>{t("settings.discord")}</SubSectionTitle>
                    <DiscordConnect />
                  </div>
                </SectionBody>
              </SectionCard>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="mt-2 space-y-5">
            <SiteDisplaySection />
            <PerformanceSection />
            <PlaybackSection
              preferDub={preferDub}
              setPreferDub={setPreferDub}
              autoPlay={autoPlay}
              setAutoPlay={setAutoPlay}
              playThemeSong={playThemeSong}
              setPlayThemeSong={setPlayThemeSong}
              autoSkipIntro={autoSkipIntro}
              setAutoSkipIntro={setAutoSkipIntro}
              theatreMode={theatreMode}
              setTheatreMode={setTheatreMode}
            />
            <EpisodeLayoutSection
              episodeLayouts={episodeLayouts}
              episodeLayout={episodeLayout}
              setEpisodeLayout={setEpisodeLayout}
            />
            <SubtitleSection />
            <AudioHelpSection />
          </div>
        )}
      </Container>
    </div>
  );
}
