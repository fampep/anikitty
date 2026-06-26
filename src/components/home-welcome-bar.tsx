"use client";

import Link from "next/link";
import Container from "./container";
import { useAuthStore } from "@/store/auth-store";
import { ROUTES } from "@/constants/routes";
import { Play, Settings, User } from "lucide-react";
import { useUserLevel } from "@/hooks/use-user-level";
import LevelProgressCard from "./level-progress-card";

export default function HomeWelcomeBar() {
  const { auth } = useAuthStore();
  const level = useUserLevel();
  if (!auth) return null;

  return (
    <Container className="pt-3 pb-1">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 py-2 rounded-xl border border-white/8 bg-white/[0.02]">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-white/80 truncate">
            Welcome, <span className="text-white">{auth.username}</span>
          </p>
          {level ? (
            <div className="mt-1.5">
              <LevelProgressCard level={level} compact />
            </div>
          ) : (
            <p className="text-[10px] text-white/30 font-mono mt-0.5">Pick up where you left off</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href={`/profile/${auth.username}`}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/8 text-white/55 hover:text-white text-[11px] font-semibold transition-colors"
            aria-label="Profile"
          >
            <User className="w-3 h-3" />
            <span className="hidden xs:inline">Profile</span>
          </Link>
          <Link
            href={ROUTES.SETTINGS}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/8 text-white/55 hover:text-white text-[11px] font-semibold transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-3 h-3" />
            <span className="hidden xs:inline">Settings</span>
          </Link>
          <Link
            href={`/profile/${auth.username}#watchlist`}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-black hover:bg-white/90 text-[11px] font-semibold transition-colors"
          >
            <Play className="w-3 h-3 fill-current" />
            Watchlist
          </Link>
        </div>
      </div>
    </Container>
  );
}
