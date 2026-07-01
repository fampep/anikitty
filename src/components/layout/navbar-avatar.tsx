"use client";

import React from "react";
import FramedAvatar from "@/components/common/framed-avatar";
import { CosmeticUsername } from "@/components/common/user-cosmetics";
import { IAuthStore } from "@/store/auth-store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Link from "next/link";
import {
  User, LogOut, BookMarked, Settings, Zap, Coins,
  Eye, Play, Tv, Star, Heart, Flame, Award, Shield, Crown, Sparkles,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { anisurgeAuth, clearAnisurgeToken } from "@/lib/oauth/anisurge";
import { useUserLevel } from "@/hooks/use-user-level";
import { useKittycoins } from "@/hooks/use-kittycoins";
import type { LevelTier } from "@/lib/user/user-level";
import { useT } from "@/providers/i18n-provider";

type Props = { auth: IAuthStore };

// Map icon name string → Lucide component
const TIER_ICONS: Record<string, React.ElementType> = {
  Eye, Play, Tv, Star, Heart, Flame, Award, Shield, Crown, Sparkles,
};

function TierIcon({ tier, className }: { tier: LevelTier; className?: string }) {
  const Icon = TIER_ICONS[tier.icon] ?? Star;
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
    anisurgeAuth.logout();
    clearAnisurgeToken();
    auth.clearAuth();
    close();
  };

  const isAdmin = session.role === "admin";
  const tier = level?.tier;
  const rgb = tier ? hexToRgb(tier.color) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative rounded-full ring-2 ring-white/15 hover:ring-white/45 transition-all duration-200 group">
          <FramedAvatar
            username={session.username}
            url={session.avatar || undefined}
            frameSlug={frameSlug}
            className="w-8 h-8"
          />
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-black shadow-sm shadow-emerald-400/50" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        className="w-60 mt-2 p-0 bg-[#0d0d0d] border border-white/10 rounded-xl shadow-2xl shadow-black/70 overflow-hidden"
      >
        {/* User header */}
        <div className="relative px-4 py-3.5 border-b border-white/8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="relative shrink-0">
              <FramedAvatar
                username={session.username}
                url={session.avatar || undefined}
                frameSlug={frameSlug}
                className="w-9 h-9"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border-2 border-[#0d0d0d]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-white/90 font-semibold text-sm truncate leading-tight">
                  <CosmeticUsername username={session.username} iconSlug={iconSlug} />
                </p>
                {isAdmin && (
                  <span className="shrink-0 text-[9px] font-bold px-1 py-0.5 rounded bg-amber-500/15 border border-amber-500/20 text-amber-400/80 uppercase tracking-wider">
                    {t("nav.admin")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Zap className="w-2.5 h-2.5 text-violet-400/60 shrink-0" />
                <p className="text-white/25 text-[10px] font-mono truncate">{t("nav.anisurge")}</p>
              </div>
            </div>
          </div>

          {/* Level badge + XP bar */}
          {level && tier && rgb && (
            <div className="mt-3">
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
              <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-none"
                  style={{
                    width: `${level.progressPct}%`,
                    backgroundColor: tier.color,
                  }}
                />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[9px] font-mono text-white/20">
                  {t("navAvatar.xpSummary", { xp: level.xp, count: level.completedEpisodes })}
                </span>
                <span className="text-[9px] font-mono text-white/20">
                  {level.level < 100 && (level.xpToNext ?? level.episodesToNext) > 0
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
          className="mx-4 mt-3 mb-1 flex items-center justify-between gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2.5 text-amber-200/90 transition-colors hover:bg-amber-500/15"
        >
          <span className="inline-flex items-center gap-2 text-[12px] font-bold">
            <Coins className="w-3.5 h-3.5" />
            {t("nav.kittycoins")}
          </span>
          <span className="text-sm font-black tabular-nums">
            {loaded ? balance.toLocaleString() : "—"}
          </span>
        </Link>

        <div className="py-1.5">
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

        <div className="border-t border-white/8 py-1.5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-400/80 hover:bg-red-500/8 hover:text-red-300 transition-colors"
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
      className="flex items-center gap-2.5 px-4 py-2 text-sm text-white/55 hover:bg-white/6 hover:text-white/90 transition-colors"
    >
      <span className="text-white/30">{icon}</span>
      {label}
    </Link>
  );
}

export default NavbarAvatar;
