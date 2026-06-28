"use client";

import Container from "@/components/container";
import Avatar from "@/components/common/avatar";
import { useSettingsStore, EpisodeLayout } from "@/store/settings-store";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
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
  Unlink,
  CheckCircle2,
  User,
  Shield,
  Palette,
  EyeOff,
  Languages,
  ExternalLink,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import AnilistConnect from "@/app/profile/[username]/components/anilist-connect";
import ProfileCustomizationForm, {
  type ProfileCustomizationValues,
} from "@/components/profile-customization-form";
import ProfileMediaPreview from "@/components/profile-media-preview";
import { applyUserThemeColor } from "@/lib/theme-color";
import { withAuth } from "@/lib/auth-fetch";
import TwoFactorSection from "@/components/two-factor-section";
import ActiveSessionsSection from "@/components/active-sessions-section";
import ProfilePrivacySection from "@/components/profile-privacy-section";
import AccountDeletionSection from "@/components/account-deletion-section";
import SubtitleSettingsPanel from "@/components/subtitle-settings-panel";
import DiscordConnect from "@/components/discord-connect";
import { RoleBadge } from "@/components/role-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n, useT } from "@/providers/i18n-provider";
import { locales, localeLabels, type Locale } from "@/i18n/config";

const TAB_CLASS =
  "text-sm font-semibold px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:text-white data-[state=active]:bg-transparent text-white/35 hover:text-white/65 transition-all bg-transparent whitespace-nowrap";

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
                <div key={n} className="flex items-center gap-2 h-7 rounded-md bg-white/5 px-2">
                  <span className="text-[9px] font-mono text-white/25 w-4">{n}</span>
                  <div className="flex-1 h-1.5 rounded bg-white/10" />
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
                <div key={n} className="h-7 rounded bg-white/5 flex items-center justify-center">
                  <span className="text-[9px] font-mono text-white/25">{n}</span>
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
                  className="aspect-[16/9] rounded bg-white/5 relative overflow-hidden flex items-end p-1"
                >
                  <span className="text-[8px] font-mono text-white/40 bg-black/50 px-1 rounded">
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

function AnisurgeSyncSection() {
  const t = useT();
  const { auth } = useAuthStore();
  const [linked, setLinked] = useState<boolean | null>(null);
  const [anisurgeUsername, setAnisurgeUsername] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth) return;
    fetch("/api/account/me", withAuth())
      .then((r) => r.json())
      .then((d) => {
        setLinked(!!d.anisurgeLinked);
        setAnisurgeUsername(d.anisurgeUsername ?? null);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.id]);

  if (!auth) return null;

  const handleLink = async () => {
    if (!identifier.trim() || !password) {
      toast.error(t("settings.linkAnisurgeError"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        "/api/account/auth/link-anisurge",
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: identifier.trim(), password }),
        }),
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to link");
      setLinked(true);
      setAnisurgeUsername(data.anisurgeUsername);
      setIdentifier("");
      setPassword("");
      toast.success(t("settings.linkSuccess"));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("settings.linkFailed");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/account/auth/link-anisurge",
        withAuth({ method: "DELETE" }),
      );
      if (!res.ok) throw new Error("Failed");
      setLinked(false);
      setAnisurgeUsername(null);
      toast.success(t("settings.unlinkSuccess"));
    } catch {
      toast.error(t("settings.unlinkFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {linked ? (
        <div className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl bg-white/3 border border-white/10">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-white/80">{t("settings.connected")}</p>
              {anisurgeUsername && (
                <p className="text-[11px] font-mono text-white/30 mt-0.5">@{anisurgeUsername}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleUnlink}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/8 border border-red-500/20 text-red-400/80 text-xs font-medium hover:bg-red-500/15 disabled:opacity-40 transition-all"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlink className="w-3 h-3" />}
            {t("settings.disconnect")}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={t("settings.anisurgePlaceholder")}
            className="bg-white/4 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLink()}
            placeholder={t("settings.anisurgePassword")}
            className="bg-white/4 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors"
          />
          <button
            onClick={handleLink}
            disabled={loading || !identifier.trim() || !password}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 border border-white/15 text-white/70 text-sm font-medium hover:bg-white/14 disabled:opacity-35 transition-all"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
            {t("settings.connectAnisurge")}
          </button>
        </div>
      )}
    </div>
  );
}

function AccountCard() {
  const t = useT();
  const { auth } = useAuthStore();
  if (!auth) return null;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/3 border border-white/10">
      <Avatar className="w-14 h-14 shrink-0" username={auth.username} url={auth.avatar ?? undefined} />
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold text-white leading-tight">@{auth.username}</p>
        <p className="text-[11px] font-mono text-white/30 mt-0.5 truncate">{auth.email ?? "—"}</p>
        {auth.role && auth.role !== "user" && (
          <div className="mt-2">
            <RoleBadge role={auth.role} size="sm" />
          </div>
        )}
      </div>
      <Link
        href={`/profile/${encodeURIComponent(auth.username)}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/12 bg-white/5 text-white/45 text-[12px] font-medium hover:bg-white/10 hover:text-white/80 hover:border-white/25 transition-all shrink-0"
      >
        {t("settings.viewProfile")}
        <ExternalLink className="w-3 h-3 opacity-60" />
      </Link>
    </div>
  );
}

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden", className)}>
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
    <div className="flex items-start gap-3 px-5 py-4 border-b border-white/6">
      <span className="text-white/30 mt-0.5 shrink-0">{icon}</span>
      <div>
        <h2 className="text-sm font-bold text-white/85">{title}</h2>
        <p className="text-[11px] text-white/30 font-mono mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function SectionBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

function SubSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-4">{children}</h3>
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
    <div
      className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-white/3 border border-white/8 hover:border-white/14 transition-colors cursor-pointer"
      onClick={() => onChange(!value)}
    >
      <div className="flex items-center gap-3">
        <span className="text-white/30">{icon}</span>
        <div>
          <p className="text-sm font-medium text-white/75">{label}</p>
          <p className="text-[10px] text-white/25 font-mono mt-0.5">{description}</p>
        </div>
      </div>
      <div
        className={cn(
          "relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0",
          value ? "bg-white/60" : "bg-white/12",
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            value ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </div>
    </div>
  );
}

function StatPill({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] rounded-full border font-medium",
        accent
          ? "border-violet-400/25 text-violet-200/80 bg-violet-500/10"
          : "border-white/10 text-white/45 bg-white/4",
      )}
    >
      {label}
    </span>
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
          <div className="flex items-center gap-2 text-white/30 text-sm font-mono py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("settings.loading")}
          </div>
        )}
      </SectionBody>
    </SectionCard>
  );
}

function LanguageSection() {
  const t = useT();
  const { locale, setLocale } = useI18n();
  const [saving, setSaving] = useState<Locale | null>(null);

  const handleSelect = async (code: Locale) => {
    if (code === locale) return;
    setSaving(code);
    try {
      await setLocale(code);
    } finally {
      setSaving(null);
    }
  };

  return (
    <SectionCard>
      <SectionHeader
        icon={<Languages className="w-4 h-4" />}
        title={t("settings.language")}
        description={t("settings.languageDesc")}
      />
      <SectionBody>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {locales.map((code) => {
            const selected = locale === code;
            const pending = saving === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => void handleSelect(code)}
                disabled={pending}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-left transition-all duration-200",
                  selected
                    ? "border-white/40 bg-white/8 ring-1 ring-white/20"
                    : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5",
                  pending && "opacity-60",
                )}
              >
                <span className={cn("text-sm font-medium", selected ? "text-white" : "text-white/65")}>
                  {localeLabels[code]}
                </span>
                {pending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white/40 shrink-0" />
                ) : selected ? (
                  <div className="w-2 h-2 rounded-full bg-white/60 shrink-0" />
                ) : null}
              </button>
            );
          })}
        </div>
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
                  ? "border-white/40 bg-white/8 ring-1 ring-white/20"
                  : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5",
              )}
            >
              <div className="h-24 bg-black/30 flex items-center justify-center border-b border-white/6">
                {opt.preview}
              </div>
              <div className="px-3 py-2.5 flex items-center gap-2">
                <span className={episodeLayout === opt.value ? "text-white/70" : "text-white/30"}>
                  {opt.icon}
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      episodeLayout === opt.value ? "text-white" : "text-white/55",
                    )}
                  >
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-white/25 mt-0.5 font-mono line-clamp-2">
                    {opt.description}
                  </p>
                </div>
                {episodeLayout === opt.value && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-white/60 shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      </SectionBody>
    </SectionCard>
  );
}

function PlaybackSection({
  preferDub,
  setPreferDub,
  autoPlay,
  setAutoPlay,
}: {
  preferDub: boolean;
  setPreferDub: (v: boolean) => void;
  autoPlay: boolean;
  setAutoPlay: (v: boolean) => void;
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
        <p className="text-sm text-white/45 leading-relaxed">{t("settings.audioHelp")}</p>
      </SectionBody>
    </SectionCard>
  );
}

function SettingsHero({
  layoutLabel,
  localeLabel,
  preferDub,
}: {
  layoutLabel: string;
  localeLabel: string;
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
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
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
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/8 border border-white/12 flex items-center justify-center shadow-2xl">
                <Settings className="w-10 h-10 text-white/35" />
              </div>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left pb-1 min-w-0">
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight">
              {t("settings.title")}
            </h1>
            <p className="text-xs sm:text-sm text-white/35 mt-1.5 font-mono max-w-xl">
              {auth ? `@${auth.username} · ${t("settings.subtitle")}` : t("settings.subtitle")}
            </p>

            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 justify-center sm:justify-start">
              <StatPill label={localeLabel} accent />
              <StatPill label={layoutLabel} />
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
  const { locale } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const episodeLayouts = useEpisodeLayouts(t);
  const { auth } = useAuthStore();
  const { episodeLayout, setEpisodeLayout, preferDub, setPreferDub, autoPlay, setAutoPlay } =
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
  const localeLabel = localeLabels[locale as Locale] ?? locale;

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
      <SettingsHero layoutLabel={layoutLabel} localeLabel={localeLabel} preferDub={preferDub} />

      <Container>
        {auth ? (
          <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
            <TabsList className="flex items-center justify-start w-full sm:w-fit h-fit bg-transparent border-b border-white/8 rounded-none gap-0 px-0 pb-0 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className={TAB_CLASS}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="general" className="mt-8 space-y-5">
              <LanguageSection />
              <PlaybackSection
                preferDub={preferDub}
                setPreferDub={setPreferDub}
                autoPlay={autoPlay}
                setAutoPlay={setAutoPlay}
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
                  <div className="border-t border-white/6 pt-8">
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
                    <SubSectionTitle>{t("settings.twoFactor")}</SubSectionTitle>
                    <TwoFactorSection />
                  </div>
                  <div className="border-t border-white/6 pt-6">
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
                  <div className="border-t border-white/6 pt-6">
                    <SubSectionTitle>{t("settings.anisurge")}</SubSectionTitle>
                    <AnisurgeSyncSection />
                  </div>
                  <div className="border-t border-white/6 pt-6">
                    <SubSectionTitle>{t("settings.discord")}</SubSectionTitle>
                    <DiscordConnect />
                  </div>
                </SectionBody>
              </SectionCard>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="mt-2 space-y-5">
            <LanguageSection />
            <PlaybackSection
              preferDub={preferDub}
              setPreferDub={setPreferDub}
              autoPlay={autoPlay}
              setAutoPlay={setAutoPlay}
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
