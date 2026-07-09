"use client";

import Link from "next/link";
import { ArrowRight, Keyboard, Monitor, Play, SkipForward } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { trackEvent } from "@/lib/analytics";

const HIGHLIGHTS = [
  { icon: Play, key: "player" },
  { icon: SkipForward, key: "skip" },
  { icon: Monitor, key: "theatre" },
  { icon: Keyboard, key: "shortcuts" },
] as const;

export default function LandingProductPreview() {
  const t = useT();

  return (
    <section className="relative z-10 px-4 sm:px-6 md:px-12 py-14 sm:py-16 border-t border-border dark:border-white/[0.06]">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <div>
          <p className="site-label mb-2">{t("landing.previewLabel")}</p>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground dark:text-white/90 mb-3">{t("landing.previewTitle")}</h2>
          <p className="text-sm text-muted-foreground dark:text-white/45 leading-relaxed mb-6">{t("landing.previewDesc")}</p>
          <ul className="space-y-3 mb-8">
            {HIGHLIGHTS.map(({ icon: Icon, key }) => (
              <li key={key} className="flex items-start gap-3 text-[13px] text-muted-foreground dark:text-white/60">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/60 dark:bg-white/[0.05] border border-border dark:border-white/10 text-violet-300/80">
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span>
                  <span className="font-semibold text-foreground/90 dark:text-white/80">{t(`landing.preview.${key}.title`)}</span>
                  {" — "}
                  {t(`landing.preview.${key}.desc`)}
                </span>
              </li>
            ))}
          </ul>
            <Link
              href={ROUTES.HOME}
              prefetch
              onClick={() => trackEvent("landing_start", { source: "preview" })}
              className="inline-flex items-center gap-2 site-brand-btn px-5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40"
            >
            {t("landing.startWatching")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="site-panel p-3 sm:p-4 overflow-hidden">
          <div className="rounded-xl overflow-hidden ring-1 ring-border dark:ring-white/10 bg-[#050505]">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border dark:border-white/[0.06] bg-muted/30 dark:bg-white/[0.02]">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-muted dark:bg-white/15" />
                <span className="w-2 h-2 rounded-full bg-muted dark:bg-white/15" />
                <span className="w-2 h-2 rounded-full bg-muted dark:bg-white/15" />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/80 dark:text-white/25 ml-1">anikitty.moe/watch</span>
            </div>
            <div className="aspect-video bg-gradient-to-br from-violet-950/40 via-black to-black relative flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(124,58,237,0.2),transparent_55%)]" />
              <div className="relative z-[1] flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-accent dark:bg-white/10 border border-border dark:border-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Play className="w-6 h-6 text-foreground dark:text-white fill-white ml-0.5" />
                </div>
                <p className="text-[10px] font-mono text-muted-foreground dark:text-white/35 uppercase tracking-widest">{t("landing.preview.mock")}</p>
              </div>
              <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-background/95 dark:from-black/80 to-transparent" />
              <div className="absolute bottom-2 left-3 right-3 flex gap-1">
                <div className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full w-1/3 rounded-full bg-violet-400/80" />
                </div>
              </div>
            </div>
            <div className="px-3 py-2.5 space-y-2 border-t border-border dark:border-white/[0.06]">
              <div className="h-7 rounded-lg bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/[0.06]" />
              <div className="flex gap-2">
                <div className="h-6 flex-1 rounded-md bg-teal-500/10 border border-teal-500/15" />
                <div className="h-6 w-16 rounded-md bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/[0.06]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
