"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Tv2, Shield, MessageSquare, Users, LogIn, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { nightTokyo } from "@/utils/fonts";
import { useOnlineCount } from "@/hooks/use-online-count";
import { useAuthStore } from "@/store/auth-store";
import LoginPopoverButton from "@/components/login-popover-button";
import { DiscordLogoIcon, GitHubLogoIcon } from "@radix-ui/react-icons";

export default function LandingPage() {
  const count = useOnlineCount();
  const auth = useAuthStore();
  const isLoggedIn = !!auth.auth;

  const [posters, setPosters] = useState<string[]>([]);
  const [postersLoaded, setPosterLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/home")
      .then((r) => r.json())
      .then((data) => {
        const imgs: string[] = [
          ...(data.trendingAnimes ?? []),
          ...(data.mostPopularAnimes ?? []),
          ...(data.mostFavoriteAnimes ?? []),
          ...(data.latestCompletedAnimes ?? []),
        ]
          .map((a: any) => a.poster)
          .filter(Boolean);
        // deduplicate
        setPosters([...new Set(imgs)].slice(0, 20));
        setPosterLoaded(true);
      })
      .catch(() => setPosterLoaded(true));
  }, []);

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden flex flex-col">

      {/* ── Poster wall background ── */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-1000 pointer-events-none select-none",
          postersLoaded && posters.length > 0 ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-10 h-full gap-0 scale-105">
          {Array.from({ length: 40 }).map((_, i) => {
            const src = posters[i % posters.length];
            return src ? (
              <div key={i} className="relative overflow-hidden">
                <Image
                  src={src}
                  alt=""
                  fill
                  className="object-cover blur-[1px] saturate-50 brightness-75"
                  unoptimized
                  sizes="10vw"
                />
              </div>
            ) : (
              <div key={i} className="bg-white/[0.02]" />
            );
          })}
        </div>
      </div>

      {/* ── Gradient vignettes ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/70 to-black" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_45%,rgba(109,40,217,0.12),transparent)]" />
      </div>

      {/* ── Grid lines ── */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:72px_72px] pointer-events-none" />

      {/* ── Navigation ── */}
      <nav className="relative z-20 flex items-center justify-between px-4 sm:px-6 md:px-12 py-4 sm:py-5">
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group">
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden ring-1 ring-white/15 group-hover:ring-white/40 transition-all duration-200">
            <Image src="/jiji.jpg" alt="AniKitty" fill className="object-cover object-top" unoptimized />
          </div>
          <span className={cn(nightTokyo.className, "text-base sm:text-lg font-bold tracking-widest text-white/90 group-hover:text-white transition-colors")}>
            AniKitty
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {!isLoggedIn && <LoginPopoverButton />}
          <Link
            href="/home"
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-white text-black text-sm font-bold rounded-xl hover:bg-white/90 active:scale-95 transition-all shadow-xl shadow-black/30"
          >
            Browse
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-12 sm:py-20">

        {/* Online pill */}
        <div
          className={cn(
            "inline-flex items-center gap-2 px-3.5 py-1.5 mb-8 sm:mb-10 rounded-full border text-[11px] font-mono transition-all duration-500",
            count !== null
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300/80 opacity-100"
              : "opacity-0 pointer-events-none",
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          {count !== null && (
            <>{count.toLocaleString()} {count === 1 ? "person" : "people"} watching right now</>
          )}
        </div>

        {/* Main title */}
        <h1
          className={cn(
            nightTokyo.className,
            "text-[3.5rem] sm:text-[5.5rem] md:text-[7rem] lg:text-[9rem] font-black tracking-widest leading-none mb-4 sm:mb-5 select-none",
          )}
        >
          <span className="text-white">Ani</span>
          <span
            className="bg-gradient-to-r from-white/60 to-white/20 bg-clip-text text-transparent"
          >
            Kitty
          </span>
        </h1>

        <p className="text-white/55 text-base sm:text-lg md:text-xl font-light mb-2 sm:mb-3 leading-relaxed tracking-wide">
          Stream anime, completely free.
        </p>
        <p className="text-white/22 text-xs sm:text-sm md:text-base font-mono mb-10 sm:mb-12">
          No ads &middot; No subscriptions &middot; Sub &amp; Dub
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link
            href="/home"
            className="flex items-center gap-2 px-6 sm:px-8 py-3.5 bg-white text-black font-bold rounded-2xl hover:bg-white/90 active:scale-95 transition-all text-sm shadow-2xl shadow-white/10 w-full sm:w-auto sm:min-w-[170px] justify-center"
          >
            <Tv2 className="w-4 h-4" />
            Start Watching
          </Link>
          {!isLoggedIn ? (
            <LoginPopoverButton
              customTrigger={
                <button className="flex items-center gap-2 px-6 sm:px-8 py-3.5 bg-white/5 text-white/70 border border-white/12 font-semibold rounded-2xl hover:bg-white/8 hover:text-white hover:border-white/20 transition-all text-sm w-full sm:w-auto sm:min-w-[170px] justify-center">
                  <LogIn className="w-4 h-4" />
                  Sign in
                </button>
              }
            />
          ) : (
            <Link
              href="/home"
              className="flex items-center gap-2 px-6 sm:px-8 py-3.5 bg-white/5 text-white/70 border border-white/12 font-semibold rounded-2xl hover:bg-white/8 hover:text-white hover:border-white/20 transition-all text-sm w-full sm:w-auto sm:min-w-[170px] justify-center"
            >
              Continue as {auth.auth?.username}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Feature pills */}
        <div className="mt-12 sm:mt-16 flex flex-wrap justify-center gap-2 sm:gap-3">
          <FeaturePill icon={<Shield className="w-3.5 h-3.5" />} label="Zero Ads" />
          <FeaturePill icon={<Zap className="w-3.5 h-3.5" />} label="Fast Streams" />
          <FeaturePill icon={<Tv2 className="w-3.5 h-3.5" />} label="Sub & Dub" />
          <FeaturePill icon={<MessageSquare className="w-3.5 h-3.5" />} label="Comments" />
          <FeaturePill icon={<Users className="w-3.5 h-3.5" />} label="Community" />
        </div>
      </div>

      {/* ── Online counter strip ── */}
      {count !== null && (
        <div className="relative z-10 mx-4 sm:mx-6 mb-6 sm:mb-8 md:mx-auto md:max-w-2xl">
          <div className="rounded-2xl border border-white/8 bg-white/[0.025] backdrop-blur-sm px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-50" />
              </div>
              <div className="min-w-0">
                <p className="text-white/70 text-sm font-semibold truncate">
                  {count.toLocaleString()} <span className="text-white/35">online</span>
                </p>
                <p className="text-white/20 text-[10px] font-mono hidden sm:block">people watching anime right now</p>
              </div>
            </div>
            <Link
              href="/home"
              className="flex items-center gap-1.5 text-xs font-semibold text-white/35 hover:text-white/70 transition-colors shrink-0 group"
            >
              Join them
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      )}

      {/* ── Bottom bar ── */}
      <div className="relative z-10 border-t border-white/6 px-4 sm:px-6 md:px-12 py-4 flex items-center justify-between gap-4 pb-safe">
        <p className="text-white/15 text-[11px] font-mono">
          © {new Date().getFullYear()} anikitty.moe
        </p>
        <div className="flex items-center gap-4">
          <a
            href="https://discord.gg/AWpSHbEDZ2"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/20 hover:text-white/55 transition-colors"
            aria-label="Discord"
          >
            <DiscordLogoIcon width="15" height="15" />
          </a>
          <a
            href="https://github.com/fampep/anikitty"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/20 hover:text-white/55 transition-colors"
            aria-label="GitHub"
          >
            <GitHubLogoIcon width="15" height="15" />
          </a>
        </div>
      </div>
    </div>
  );
}

function FeaturePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/8 text-white/35 text-[12px] font-medium">
      <span className="text-white/20">{icon}</span>
      {label}
    </div>
  );
}
