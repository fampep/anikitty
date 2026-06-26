"use client";

import Link from "next/link";
import Container from "./container";
import { useAuthStore } from "@/store/auth-store";
import { ROUTES } from "@/constants/routes";
import { Play, Settings, User } from "lucide-react";

export default function HomeWelcomeBar() {
  const { auth } = useAuthStore();
  if (!auth) return null;

  return (
    <Container className="pt-6 pb-2">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3.5 rounded-2xl border border-white/8 bg-gradient-to-r from-white/[0.04] to-transparent">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white/85 truncate">
            Welcome back, <span className="text-white">{auth.username}</span>
          </p>
          <p className="text-[11px] text-white/35 font-mono mt-0.5">
            Pick up where you left off or explore something new
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/profile/${auth.username}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/8 text-white/60 hover:text-white text-xs font-semibold transition-colors"
          >
            <User className="w-3.5 h-3.5" />
            Profile
          </Link>
          <Link
            href={ROUTES.SETTINGS}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/8 text-white/60 hover:text-white text-xs font-semibold transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </Link>
          <Link
            href={`/profile/${auth.username}#watchlist`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black hover:bg-white/90 text-xs font-semibold transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Watchlist
          </Link>
        </div>
      </div>
    </Container>
  );
}
