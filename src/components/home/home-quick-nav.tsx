"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Compass,
  Dice5,
  Flame,
  History,
  Loader2,
  Sparkles,
  Tv2,
} from "lucide-react";
import Container from "@/components/layout/container";
import SearchBar from "@/components/layout/search-bar";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";
import HomeCustomizeButton from "./home-customize";

const SCROLL_OFFSET = 150;

const LINKS = [
  { id: "continue", href: `${ROUTES.HOME}#continue`, icon: History, key: "continue" },
  { id: "new-episodes", href: `${ROUTES.HOME}#new-episodes`, icon: Tv2, key: "latest" },
  { id: "new-upcoming", href: `${ROUTES.HOME}#new-upcoming`, icon: Sparkles, key: "newUpcoming" },
  { id: "rankings", href: `${ROUTES.HOME}#rankings`, icon: Flame, key: "trending" },
] as const;

export default function HomeQuickNav() {
  const t = useT();
  const router = useRouter();
  const [activeId, setActiveId] = useState<string>(LINKS[0].id);
  const [stuck, setStuck] = useState(false);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    const updateActive = () => {
      let current: string = LINKS[0].id;
      for (const { id } of LINKS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= SCROLL_OFFSET) {
          current = id;
        }
      }
      setActiveId(current);
      setStuck(window.scrollY > 220);
    };

    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    return () => {
      window.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.location.hash) return;
    window.history.replaceState(null, "", ROUTES.HOME);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    // Don't leave a sticky hash in the URL — remounts / soft nav re-apply it and yank scroll back.
    window.history.replaceState(null, "", ROUTES.HOME);
  };

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
    <Container
      className={cn(
        "sticky top-[var(--nav-total-height)] z-20 py-1.5 pb-2 transition-shadow",
        stuck && "drop-shadow-[0_12px_28px_rgba(0,0,0,0.28)]",
      )}
    >
      <div className="site-panel flex flex-col gap-2 p-2 sm:p-2.5 shadow-[0_8px_28px_rgba(15,10,30,0.08)] dark:shadow-[0_10px_32px_rgba(0,0,0,0.35)]">
        <div className="flex items-start gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <SearchBar className="w-full" />
          </div>
          <HomeCustomizeButton />
        </div>

        <nav
          aria-label={t("home.quickNav.label")}
          className="flex gap-1 overflow-x-auto scrollbar-hide scroll-momentum -mx-0.5 px-0.5"
        >
          <button
            type="button"
            onClick={() => void surpriseMe()}
            disabled={rolling}
            className="site-chip site-focus snap-start shrink-0 py-1.5 text-xs transition-[color,background-color,border-color,box-shadow] duration-200 disabled:opacity-50"
          >
            {rolling ? (
              <Loader2 className="w-3 h-3 animate-spin text-zinc-300/70" />
            ) : (
              <Dice5 className="w-3 h-3 text-zinc-300/70" />
            )}
            {t("home.hubRandom")}
          </button>

          {LINKS.map(({ id, href, icon: Icon, key }) => {
            const active = activeId === id;
            return (
              <Link
                key={key}
                href={href}
                aria-current={active ? "true" : undefined}
                onClick={(e) => {
                  if (typeof window === "undefined") return;
                  if (window.location.pathname !== ROUTES.HOME) return;
                  e.preventDefault();
                  scrollToSection(id);
                }}
                className={cn(
                  "site-chip site-focus snap-start shrink-0 py-1.5 text-xs transition-[color,background-color,border-color,box-shadow] duration-200",
                  active && "site-chip-active shadow-[inset_0_-2px_0_0_rgba(255, 255, 255, 0.55)]",
                )}
              >
                <Icon className={cn("w-3 h-3 transition-colors duration-200", active ? "text-zinc-300" : "text-zinc-300/70")} />
                {t(`home.quickNav.${key}`)}
              </Link>
            );
          })}
          <Link
            href={ROUTES.SEARCH}
            className="site-chip snap-start shrink-0 py-1.5 text-xs border-dashed dark:border-white/12 dark:text-white/30 dark:hover:text-white/65"
          >
            <Compass className="w-3 h-3" />
            {t("home.browseByGenre")}
          </Link>
        </nav>
      </div>
    </Container>
  );
}
