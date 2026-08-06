"use client";

import React from "react";
import FramedAvatar from "@/components/common/framed-avatar";
import { CosmeticUsername } from "@/components/common/user-cosmetics";
import { IAuthStore } from "@/store/auth-store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Link from "next/link";
import {
  User, LogOut, BookMarked, Settings, Coins, History, Star, Sparkles,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { accountAuth, clearAccountToken } from "@/lib/oauth/account";
import { useUserLevel } from "@/hooks/use-user-level";
import { useKittycoins } from "@/hooks/use-kittycoins";
import type { LevelTier } from "@/lib/user/user-level";
import { MAX_LEVEL } from "@/lib/user/user-level";
import { LEVEL_TIER_ICONS } from "@/lib/user/level-tier-icons";
import { useT } from "@/providers/i18n-provider";

type Props = { auth: IAuthStore };

function TierIcon({ tier, className }: { tier: LevelTier; className?: string }) {
  const Icon = LEVEL_TIER_ICONS[tier.icon] ?? Star;
  return <Icon className={className} style={{ color: tier.color }} />;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function NavbarAvatar({ auth }: Props) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const level = useUserLevel();
  const session = auth.auth;
  const { balance, equipped, loaded } = useKittycoins(!!session);
  const frameSlug = equipped.frame ?? session?.equippedFrame ?? null;
  const iconSlug = equipped.icon ?? session?.equippedIcon ?? null;

  if (!session) return null;

  const close = () => setOpen(false);

  const handleLogout = () => {
    accountAuth.logout();
    clearAccountToken();
    auth.clearAuth();
    close();
  };

  const isAdmin = session.role === "admin";
  const tier = level?.tier;
  const rgb = tier ? hexToRgb(tier.color) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative rounded-full transition-transform duration-200 hover:scale-105 active:scale-95 group">
          <FramedAvatar
            username={session.username}
            url={session.avatar || undefined}
            frameSlug={frameSlug}
            className="w-8 h-8"
          />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-[#09090b] shadow-sm shadow-emerald-400/50" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        className="nav-profile-menu site-overlay-surface w-[min(calc(100vw-1rem),18rem)] mt-3 p-0 overflow-hidden"
      >
        {/* User header */}
        <div className="nav-profile-menu__hero relative px-4 pb-3.5 pt-4 overflow-hidden">
          <div className="relative flex items-center gap-3">
            <div className="relative shrink-0">
              <FramedAvatar
                username={session.username}
                url={session.avatar || undefined}
                frameSlug={frameSlug}
                className="w-10 h-10"
              />
              <span className="nav-profile-menu__status absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-foreground dark:text-white/90 font-semibold text-sm truncate leading-tight">
                  <CosmeticUsername username={session.username} iconSlug={iconSlug} />
                </p>
                {isAdmin && (
                  <span className="shrink-0 text-[9px] font-bold px-1 py-0.5 rounded bg-amber-500/15 border border-amber-500/20 text-amber-400/80 uppercase tracking-wider">
                    {t("nav.admin")}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-primary/70 shrink-0" />
                <p className="text-muted-foreground/80 dark:text-white/45 text-[10px] font-semibold uppercase tracking-[0.14em] truncate">{t("nav.brand")}</p>
              </div>
            </div>
          </div>

          {/* Level badge + XP bar */}
          {level && tier && rgb && (
            <div className="nav-profile-menu__level mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <TierIcon tier={tier} className="w-3 h-3" />
                  <span className="text-[10px] font-bold" style={{ color: tier.color }}>
                    {tier.name}
                  </span>
                </div>
                <span
                  className="text-[10px] font-mono font-bold px-1.5 py-px rounded"
                  style={{
                    color: tier.color,
                    backgroundColor: `rgba(${rgb.r},${rgb.g},${rgb.b},0.12)`,
                  }}
                >
                  Lv.{level.level}
                </span>
              </div>
              {/* XP progress bar */}
              <div className="nav-profile-menu__bar h-1.5 w-full rounded-full bg-accent dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-none"
                  style={{
                    width: `${level.progressPct}%`,
                    backgroundColor: tier.color,
                  }}
                />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[9px] font-mono text-muted-foreground/70 dark:text-white/20">
                  {t("navAvatar.xpSummary", { xp: level.xp, count: level.completedEpisodes })}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground/70 dark:text-white/20">
                  {level.level < MAX_LEVEL && (level.xpToNext ?? level.episodesToNext) > 0
                    ? t("navAvatar.xpToNext", { xp: level.xpToNext ?? level.episodesToNext, level: level.level + 1 })
                    : t("navAvatar.max")}
                </span>
              </div>
            </div>
          )}
        </div>

        <Link
          href={ROUTES.SHOP}
          onClick={close}
          className="nav-profile-menu__coins mx-3.5 mt-3 mb-1 flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-3 text-amber-200/90 transition"
        >
          <span className="inline-flex items-center gap-2 text-[12px] font-bold">
            <Coins className="w-3.5 h-3.5" />
            {t("nav.kittycoins")}
          </span>
          <span className="text-sm font-black tabular-nums">
            {loaded ? balance.toLocaleString() : "-"}
          </span>
        </Link>

        <div className="nav-profile-menu__links py-1.5">
          <MenuItem
            href={`/profile/${session.username}`}
            icon={<User className="w-3.5 h-3.5" />}
            label={t("nav.profile")}
            onClick={close}
          />
          <MenuItem
            href={`/profile/${session.username}#watchlist`}
            icon={<BookMarked className="w-3.5 h-3.5" />}
            label={t("nav.watchlist")}
            onClick={close}
          />
          <MenuItem
            href={ROUTES.HISTORY}
            icon={<History className="w-3.5 h-3.5" />}
            label={t("nav.watchHistory")}
            onClick={close}
          />
          <MenuItem
            href={ROUTES.SHOP}
            icon={<Coins className="w-3.5 h-3.5" />}
            label={t("nav.shop")}
            onClick={close}
          />
          <MenuItem
            href={ROUTES.SETTINGS}
            icon={<Settings className="w-3.5 h-3.5" />}
            label={t("nav.settings")}
            onClick={close}
          />
        </div>

        <div className="nav-profile-menu__footer py-1.5">
          <button
            onClick={handleLogout}
            className="nav-profile-menu__signout mx-2 w-[calc(100%-1rem)] rounded-xl flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400/85 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t("nav.signOut")}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MenuItem({ href, icon, label, onClick }: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="nav-profile-menu__item group relative isolate mx-2 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-muted-foreground dark:text-white/[0.58] transition"
    >
      <span className="nav-profile-menu__item-icon text-muted-foreground dark:text-white/35 transition">{icon}</span>
      <span className="relative z-[1]">{label}</span>
    </Link>
  );
}

export default NavbarAvatar;
