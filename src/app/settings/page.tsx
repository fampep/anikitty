"use client";

import Container from "@/components/container";
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
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import AnilistConnect from "@/app/profile/[username]/components/anilist-connect";
import Image from "next/image";
import ProfileCustomizationForm, {
  type ProfileCustomizationValues,
} from "@/components/profile-customization-form";
import { applyUserThemeColor } from "@/lib/theme-color";
import { withAuth } from "@/lib/auth-fetch";
import TwoFactorSection from "@/components/two-factor-section";
import ActiveSessionsSection from "@/components/active-sessions-section";
import ProfilePrivacySection from "@/components/profile-privacy-section";
import AccountDeletionSection from "@/components/account-deletion-section";
import { useI18n, useT } from "@/providers/i18n-provider";
import { locales, localeLabels, type Locale } from "@/i18n/config";

// ── Episode layout options ────────────────────────────────────────────────────

const EPISODE_LAYOUTS: {
  value: EpisodeLayout;
  label: string;
  description: string;
  icon: React.ReactNode;
  preview: React.ReactNode;
}[] = [
  {
    value: "list",
    label: "List",
    description: "Episode number + title in a scrollable list",
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
    value: "compact",
    label: "Compact",
    description: "Number-only grid — great for long series",
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
    value: "thumbnail",
    label: "Thumbnail",
    description: "Poster-style cards showing episode artwork",
    icon: <LayoutGrid className="w-4 h-4" />,
    preview: (
      <div className="grid grid-cols-3 gap-1 w-full px-2 py-1">
        {[1, 2, 3].map((n) => (
          <div key={n} className="aspect-[16/9] rounded bg-white/5 relative overflow-hidden flex items-end p-1">
            <span className="text-[8px] font-mono text-white/40 bg-black/50 px-1 rounded">EP {n}</span>
          </div>
        ))}
      </div>
    ),
  },
];

// ── Anisurge sync ─────────────────────────────────────────────────────────────

function AnisurgeSyncSection() {
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
      toast.error("Enter your Anisurge username/email and password");
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
      toast.success("Anisurge account linked!");
    } catch (e: any) {
      toast.error(e.message ?? "Link failed");
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
      toast.success("Anisurge account unlinked");
    } catch {
      toast.error("Failed to unlink");
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
              <p className="text-sm font-medium text-white/80">Connected</p>
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
            Disconnect
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Anisurge username or email"
            className="bg-white/4 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLink()}
            placeholder="Anisurge password"
            className="bg-white/4 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors"
          />
          <button
            onClick={handleLink}
            disabled={loading || !identifier.trim() || !password}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 border border-white/15 text-white/70 text-sm font-medium hover:bg-white/14 disabled:opacity-35 transition-all"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
            Connect Anisurge
          </button>
        </div>
      )}
    </div>
  );
}

// ── Account info card ─────────────────────────────────────────────────────────

function AccountCard() {
  const { auth } = useAuthStore();
  if (!auth) return null;

  const letter = auth.username?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/3 border border-white/10">
      <div className="relative w-14 h-14 shrink-0">
        {auth.avatar ? (
          <Image src={auth.avatar} alt={auth.username} fill className="rounded-full object-cover ring-2 ring-white/10" unoptimized />
        ) : (
          <div className="w-14 h-14 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-xl font-bold text-white/50">
            {letter}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold text-white leading-tight">@{auth.username}</p>
        <p className="text-[11px] font-mono text-white/30 mt-0.5">{auth.email ?? "—"}</p>
        {auth.role && auth.role !== "user" && (
          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-white/8 border border-white/12 text-[10px] font-semibold text-white/60 uppercase tracking-wide">
            {auth.role}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
      {children}
    </div>
  );
}

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
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

function ToggleRow({
  icon, label, description, value, onChange,
}: {
  icon: React.ReactNode; label: string; description: string; value: boolean; onChange: (v: boolean) => void;
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

function AppearanceSection() {
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
        title="Appearance"
        description="Theme color, anime banners, GIF avatars, and bio"
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
            Loading…
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const t = useT();
  const { auth } = useAuthStore();
  const { episodeLayout, setEpisodeLayout, preferDub, setPreferDub, autoPlay, setAutoPlay } =
    useSettingsStore();

  return (
    <div className="min-h-screen pt-8 pb-24">
      <Container className="max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-0.5 h-6 bg-white/35 shrink-0" />
          <Settings className="w-5 h-5 text-white/50" />
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{t("settings.title")}</h1>
        </div>

        <div className="flex flex-col gap-5">

          <LanguageSection />

          {/* Account */}
          {auth && (
            <SectionCard>
              <SectionHeader
                icon={<User className="w-4 h-4" />}
                title="Account"
                description="Your profile information"
              />
              <SectionBody>
                <AccountCard />
              </SectionBody>
            </SectionCard>
          )}

          {auth && <AppearanceSection />}

          {auth && (
            <SectionCard>
              <SectionHeader
                icon={<EyeOff className="w-4 h-4" />}
                title="Privacy"
                description="Control who can see your profile"
              />
              <SectionBody className="flex flex-col gap-8">
                <ProfilePrivacySection />
                <div className="border-t border-white/6 pt-8">
                  <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest font-mono mb-4">
                    Account deletion
                  </p>
                  <AccountDeletionSection />
                </div>
              </SectionBody>
            </SectionCard>
          )}

          {/* Security */}
          {auth && (
            <SectionCard>
              <SectionHeader
                icon={<Shield className="w-4 h-4" />}
                title="Security"
                description="Two-factor authentication and active sessions"
              />
              <SectionBody className="flex flex-col gap-6">
                <div>
                  <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest font-mono mb-3">
                    Two-factor authentication
                  </p>
                  <TwoFactorSection />
                </div>
                <div className="border-t border-white/6 pt-6">
                  <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest font-mono mb-3">
                    Active sessions
                  </p>
                  <ActiveSessionsSection />
                </div>
              </SectionBody>
            </SectionCard>
          )}

          {/* Connected Accounts */}
          {auth && (
            <SectionCard>
              <SectionHeader
                icon={<Shield className="w-4 h-4" />}
                title="Connected Accounts"
                description="Sync your watchlist and history from other services"
              />
              <SectionBody className="flex flex-col gap-5">
                <div>
                  <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest font-mono mb-3">AniList</p>
                  <AnilistConnect />
                </div>
                <div className="border-t border-white/6 pt-5">
                  <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest font-mono mb-3">Anisurge</p>
                  <AnisurgeSyncSection />
                </div>
              </SectionBody>
            </SectionCard>
          )}

          {/* Episode Layout */}
          <SectionCard>
            <SectionHeader
              icon={<LayoutList className="w-4 h-4" />}
              title="Episode List Layout"
              description="How episodes are displayed on the watch page"
            />
            <SectionBody>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {EPISODE_LAYOUTS.map((opt) => (
                  <button
                    key={opt.value}
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
                      <div>
                        <p className={cn("text-sm font-semibold", episodeLayout === opt.value ? "text-white" : "text-white/55")}>
                          {opt.label}
                        </p>
                        <p className="text-[10px] text-white/25 mt-0.5 font-mono">{opt.description}</p>
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

          {/* Playback */}
          <SectionCard>
            <SectionHeader
              icon={<Play className="w-4 h-4" />}
              title="Playback"
              description="Default behaviour when watching anime"
            />
            <SectionBody className="flex flex-col gap-3">
              <ToggleRow
                icon={<Mic className="w-4 h-4" />}
                label="Prefer Dub"
                description="Default to English dub when available"
                value={preferDub}
                onChange={setPreferDub}
              />
              <ToggleRow
                icon={<Play className="w-4 h-4" />}
                label="Auto-play next episode"
                description="Automatically play the next episode when one ends"
                value={autoPlay}
                onChange={setAutoPlay}
              />
            </SectionBody>
          </SectionCard>

          {/* Audio & Subtitles */}
          <SectionCard>
            <SectionHeader
              icon={<Captions className="w-4 h-4" />}
              title="Audio & Subtitles"
              description="Visual indicators on anime cards"
            />
            <SectionBody>
              <p className="text-sm text-white/45 leading-relaxed">
                Cards showing{" "}
                <span className="inline-flex items-center gap-0.5 bg-sky-500/15 text-sky-300 border border-sky-500/25 text-[10px] font-bold px-1.5 py-0.5 rounded mx-1">
                  <Captions className="h-2.5 w-2.5" /> 12
                </span>
                have subtitled episodes. Cards with a{" "}
                <span className="inline-flex items-center gap-0.5 bg-purple-600/80 text-white text-[9px] font-black px-1.5 py-0.5 rounded mx-1">
                  DUB
                </span>
                badge have English dubbing available.
              </p>
            </SectionBody>
          </SectionCard>

        </div>
      </Container>
    </div>
  );
}
