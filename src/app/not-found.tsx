"use client";

import Link from "next/link";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { Home, Search, Flame } from "lucide-react";
import { useT } from "@/providers/i18n-provider";

export default function NotFound() {
  const t = useT();

  return (
    <Container className="min-h-[70vh] flex flex-col items-center justify-center text-center py-20">
      <div className="relative">
        <p className="text-[6rem] sm:text-[8rem] font-black leading-none bg-gradient-to-br from-zinc-400 to-zinc-500 bg-clip-text text-transparent select-none">
          404
        </p>
        <span className="absolute -top-2 -right-4 text-4xl -rotate-12" aria-hidden>
          🐾
        </span>
      </div>

      <h1 className="mt-4 text-xl sm:text-2xl font-bold text-foreground dark:text-white">
        {t("notFound.title")}
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground dark:text-white/45">
        {t("notFound.description")}
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
        <Link
          href={ROUTES.HOME}
          className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/15 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-primary/25 transition-colors"
        >
          <Home className="h-4 w-4" />
          {t("notFound.home")}
        </Link>
        <Link
          href={ROUTES.SEARCH}
          className="inline-flex items-center gap-2 rounded-lg border border-border dark:border-white/12 bg-muted/40 dark:bg-white/5 px-4 py-2 text-sm font-medium text-muted-foreground dark:text-white/60 hover:text-foreground/90 dark:hover:text-white/85 transition-colors"
        >
          <Search className="h-4 w-4" />
          {t("notFound.search")}
        </Link>
        <Link
          href={ROUTES.TRENDING}
          className="inline-flex items-center gap-2 rounded-lg border border-border dark:border-white/12 bg-muted/40 dark:bg-white/5 px-4 py-2 text-sm font-medium text-muted-foreground dark:text-white/60 hover:text-foreground/90 dark:hover:text-white/85 transition-colors"
        >
          <Flame className="h-4 w-4" />
          {t("notFound.trending")}
        </Link>
      </div>
    </Container>
  );
}
