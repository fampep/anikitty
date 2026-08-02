"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  Clapperboard,
  Dice5,
  Flame,
  Library,
  Loader2,
  Mic2,
  Smile,
  Users,
} from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";

// Every href here points at a route that exists — no /characters or /studios
// index pages ship today, so those tiles are intentionally absent.
const TILES: { href: string; icon: typeof Flame; labelKey: string }[] = [
  { href: ROUTES.TRENDING, icon: Flame, labelKey: "home.hubTrending" },
  { href: "/collections", icon: Library, labelKey: "home.hubCollections" },
  { href: "/voice-actors", icon: Mic2, labelKey: "home.hubVoiceActors" },
  { href: "/genre", icon: Smile, labelKey: "home.hubGenres" },
  { href: `${ROUTES.SEARCH}?type=movie`, icon: Clapperboard, labelKey: "home.hubMovies" },
  { href: "/schedule", icon: Users, labelKey: "home.hubSchedule" },
  { href: "/leaderboard", icon: Building2, labelKey: "home.hubLeaderboard" },
];

/** Shortcut grid so the home page isn't the only way to start browsing. */
export default function HomeDiscoveryHub() {
  const t = useT();
  const router = useRouter();
  const [rolling, setRolling] = useState(false);

  const surpriseMe = async () => {
    if (rolling) return;
    setRolling(true);
    try {
      const res = await fetch("/api/anime/random");
      const data = await res.json();
      if (!res.ok || !data?.id) throw new Error();
      router.push(`${ROUTES.ANIME_DETAILS}/${data.id}`);
    } catch {
      toast.error(t("home.hubRandomFailed"));
      setRolling(false);
    }
  };

  return (
    <Container className="py-0">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        <button
          type="button"
          onClick={() => void surpriseMe()}
          disabled={rolling}
          className="site-panel flex flex-col items-center gap-2 rounded-2xl px-3 py-4 transition-colors hover:bg-muted/40 disabled:opacity-50 dark:hover:bg-white/[0.05] site-focus"
        >
          {rolling ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground dark:text-white/50" />
          ) : (
            <Dice5 className="h-5 w-5 text-muted-foreground dark:text-white/50" />
          )}
          <span className="text-[11px] font-semibold text-foreground dark:text-white/70">
            {t("home.hubRandom")}
          </span>
        </button>

        {TILES.map(({ href, icon: Icon, labelKey }) => (
          <Link
            key={href}
            href={href}
            className="site-panel flex flex-col items-center gap-2 rounded-2xl px-3 py-4 transition-colors hover:bg-muted/40 dark:hover:bg-white/[0.05] site-focus"
          >
            <Icon className="h-5 w-5 text-muted-foreground dark:text-white/50" />
            <span className="text-center text-[11px] font-semibold text-foreground dark:text-white/70">
              {t(labelKey)}
            </span>
          </Link>
        ))}
      </div>
    </Container>
  );
}
