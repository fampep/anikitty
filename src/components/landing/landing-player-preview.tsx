"use client";

import { Keyboard, Layers, Maximize2, Play, SkipForward } from "lucide-react";
import { useT } from "@/providers/i18n-provider";

const PREVIEWS = [
  { icon: Layers, key: "player" },
  { icon: SkipForward, key: "skip" },
  { icon: Maximize2, key: "theatre" },
  { icon: Keyboard, key: "shortcuts" },
] as const;

/** Tasteful player UI mock — no stock anime screenshots. */
export default function LandingPlayerPreview() {
  const t = useT();

  return (
    <section className="relative z-10 px-4 sm:px-6 md:px-12 py-14 sm:py-16 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto">
        <p className="site-label mb-2 text-center">{t("landing.previewLabel")}</p>
        <h2 className="text-xl sm:text-2xl font-bold text-white/90 text-center mb-3">
          {t("landing.previewTitle")}
        </h2>
        <p className="text-sm text-white/40 text-center max-w-lg mx-auto mb-10 leading-relaxed">
          {t("landing.previewDesc")}
        </p>

        <div className="relative mx-auto max-w-3xl rounded-2xl border border-white/[0.1] bg-[#0c0c0e] overflow-hidden shadow-2xl shadow-black/40">
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="ml-3 text-[10px] font-mono text-white/25 truncate">
              {t("landing.preview.mock")}
            </span>
          </div>
          <div className="relative aspect-video bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_45%,rgba(255,255,255,0.06),transparent_70%)]" />
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
              <div className="h-1 rounded-full bg-white/10 mb-3 overflow-hidden">
                <div className="h-full w-[38%] rounded-full bg-white/70" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-8 w-8 rounded-full bg-white text-black flex items-center justify-center">
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </span>
                  <div className="hidden sm:block">
                    <p className="text-[12px] font-semibold text-white/80">EP 01</p>
                    <p className="text-[10px] text-white/35 font-mono">24:00</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-1 rounded-md border border-white/10 bg-white/[0.04] text-[10px] font-semibold text-white/50">
                    1080p
                  </span>
                  <span className="px-2 py-1 rounded-md border border-white/10 bg-white/[0.04] text-[10px] font-semibold text-white/50">
                    SUB
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PREVIEWS.map(({ icon: Icon, key }) => (
            <li
              key={key}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5"
            >
              <Icon className="w-4 h-4 text-zinc-300/70 mb-2" />
              <p className="text-[13px] font-semibold text-white/85 mb-0.5">
                {t(`landing.preview.${key}.title`)}
              </p>
              <p className="text-[12px] text-white/38 leading-relaxed">
                {t(`landing.preview.${key}.desc`)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
