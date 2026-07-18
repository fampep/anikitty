"use client";

import Link from "next/link";
import Container from "@/components/layout/container";
import { useAuthStore } from "@/store/auth-store";
import { ROUTES } from "@/constants/routes";
import { Play, Settings, User } from "lucide-react";
import { useUserLevel } from "@/hooks/use-user-level";
import LevelProgressCard from "@/components/profile/level-progress-card";
import { useT } from "@/providers/i18n-provider";

export default function HomeWelcomeBar() {
  const t = useT();
  const auth = useAuthStore((s) => s.auth);
  const level = useUserLevel();
  if (!auth) return null;

  return (
    <Container className="pt-0 pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2 site-panel">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground/90 dark:text-white/80 truncate">
            {t("home.welcomeBack")} <span className="text-zinc-200">{auth.username}</span>
          </p>
          {level ? (
            <div className="mt-1.5">
              <LevelProgressCard level={level} compact />
            </div>
          ) : (
            <div className="mt-1.5 h-9 w-full max-w-xs rounded-lg bg-muted/50 dark:bg-white/[0.04] animate-pulse" aria-hidden />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
          <Link
            href={ROUTES.profile(auth.username)}
            className="site-ghost-btn"
            aria-label={t("nav.profile")}
          >
            <User className="w-3 h-3" />
            <span className="hidden xs:inline">{t("nav.profile")}</span>
          </Link>
          <Link
            href={ROUTES.SETTINGS}
            className="site-ghost-btn"
            aria-label={t("nav.settings")}
          >
            <Settings className="w-3 h-3" />
            <span className="hidden xs:inline">{t("nav.settings")}</span>
          </Link>
          <Link
            href={`${ROUTES.profile(auth.username)}#watchlist`}
            className="site-brand-btn"
          >
            <Play className="w-3 h-3 fill-current" />
            {t("nav.watchlist")}
          </Link>
        </div>
      </div>
    </Container>
  );
}
