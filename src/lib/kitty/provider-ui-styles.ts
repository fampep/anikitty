import type { KittyProvider } from "@/lib/kitty/kitty-providers";
import { cn } from "@/lib/core/utils";

export type ProviderAccent = {
  /** Active provider pill / badge */
  chip: string;
  /** Active source button ring */
  pillActive: string;
  /** Idle source button hover */
  pillIdle: string;
  /** Stream info bar dot */
  dot: string;
  /** Loading skeleton top glow */
  glow: string;
};

const DEFAULT_ACCENT: ProviderAccent = {
  chip: "border-border dark:border-white/12 bg-muted/40 dark:bg-white/[0.04] text-foreground/80 dark:text-white/70",
  pillActive: "border-border dark:border-white/20 bg-muted/50 dark:bg-white/[0.08] text-foreground dark:text-white",
  pillIdle: "border-transparent text-muted-foreground dark:text-white/40 hover:text-foreground/80 dark:hover:text-white/65 hover:bg-muted/30 dark:hover:bg-white/[0.04]",
  dot: "bg-muted-foreground/50 dark:bg-white/40",
  glow: "from-slate-500/15",
};

const ACCENTS: Partial<Record<KittyProvider, ProviderAccent>> = {
  AniBD: {
    chip: "border-amber-400/30 bg-amber-500/10 text-amber-100/90",
    pillActive: "border-amber-400/45 bg-amber-500/20 text-amber-50 shadow-[0_0_12px_-4px_rgba(251,191,36,0.35)]",
    pillIdle: "border-transparent text-amber-300/45 hover:text-amber-200/80 hover:bg-amber-500/[0.06]",
    dot: "bg-amber-400",
    glow: "from-amber-500/20",
  },
  Anikoto: {
    chip: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100/90",
    pillActive: "border-cyan-400/45 bg-cyan-500/20 text-cyan-50 shadow-[0_0_12px_-4px_rgba(34,211,238,0.35)]",
    pillIdle: "border-transparent text-cyan-300/45 hover:text-cyan-200/80 hover:bg-cyan-500/[0.06]",
    dot: "bg-cyan-400",
    glow: "from-cyan-500/20",
  },
  AniKuro: {
    chip: "border-pink-400/30 bg-pink-500/10 text-pink-100/90",
    pillActive: "border-pink-400/45 bg-pink-500/20 text-pink-50 shadow-[0_0_12px_-4px_rgba(244,114,182,0.35)]",
    pillIdle: "border-transparent text-pink-300/45 hover:text-pink-200/80 hover:bg-pink-500/[0.06]",
    dot: "bg-pink-400",
    glow: "from-pink-500/20",
  },
  MegaPlay: {
    chip: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100/90",
    pillActive: "border-emerald-400/45 bg-emerald-500/20 text-emerald-50 shadow-[0_0_12px_-4px_rgba(52,211,153,0.35)]",
    pillIdle: "border-transparent text-emerald-300/45 hover:text-emerald-200/80 hover:bg-emerald-500/[0.06]",
    dot: "bg-emerald-400",
    glow: "from-emerald-500/20",
  },
  AllAnime: {
    chip: "border-violet-400/30 bg-violet-500/10 text-violet-100/90",
    pillActive: "border-violet-400/45 bg-violet-500/20 text-violet-50 shadow-[0_0_12px_-4px_rgba(167,139,250,0.35)]",
    pillIdle: "border-transparent text-violet-300/45 hover:text-violet-200/80 hover:bg-violet-500/[0.06]",
    dot: "bg-violet-400",
    glow: "from-violet-500/20",
  },
  MKissa: {
    chip: "border-violet-400/30 bg-violet-500/10 text-violet-100/90",
    pillActive: "border-violet-400/45 bg-violet-500/20 text-violet-50 shadow-[0_0_12px_-4px_rgba(167,139,250,0.35)]",
    pillIdle: "border-transparent text-violet-300/45 hover:text-violet-200/80 hover:bg-violet-500/[0.06]",
    dot: "bg-violet-400",
    glow: "from-violet-500/20",
  },
  Miruro: {
    chip: "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100/90",
    pillActive: "border-fuchsia-400/45 bg-fuchsia-500/20 text-fuchsia-50 shadow-[0_0_12px_-4px_rgba(232,121,249,0.35)]",
    pillIdle: "border-transparent text-fuchsia-300/45 hover:text-fuchsia-200/80 hover:bg-fuchsia-500/[0.06]",
    dot: "bg-fuchsia-400",
    glow: "from-fuchsia-500/20",
  },
  AniNeko: {
    chip: "border-indigo-400/30 bg-indigo-500/10 text-indigo-100/90",
    pillActive: "border-indigo-400/45 bg-indigo-500/20 text-indigo-50 shadow-[0_0_12px_-4px_rgba(129,140,248,0.35)]",
    pillIdle: "border-transparent text-indigo-300/45 hover:text-indigo-200/80 hover:bg-indigo-500/[0.06]",
    dot: "bg-indigo-400",
    glow: "from-indigo-500/20",
  },
  AniWatch: {
    chip: "border-rose-400/30 bg-rose-500/10 text-rose-100/90",
    pillActive: "border-rose-400/45 bg-rose-500/20 text-rose-50 shadow-[0_0_12px_-4px_rgba(251,113,133,0.35)]",
    pillIdle: "border-transparent text-rose-300/45 hover:text-rose-200/80 hover:bg-rose-500/[0.06]",
    dot: "bg-rose-400",
    glow: "from-rose-500/20",
  },
  Senshi: {
    chip: "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100/90",
    pillActive: "border-fuchsia-400/45 bg-fuchsia-500/20 text-fuchsia-50 shadow-[0_0_12px_-4px_rgba(232,121,249,0.35)]",
    pillIdle: "border-transparent text-fuchsia-300/45 hover:text-fuchsia-200/80 hover:bg-fuchsia-500/[0.06]",
    dot: "bg-fuchsia-400",
    glow: "from-fuchsia-500/20",
  },
  AniWaves: {
    chip: "border-sky-400/30 bg-sky-500/10 text-sky-100/90",
    pillActive: "border-sky-400/45 bg-sky-500/20 text-sky-50 shadow-[0_0_12px_-4px_rgba(56,189,248,0.35)]",
    pillIdle: "border-transparent text-sky-300/45 hover:text-sky-200/80 hover:bg-sky-500/[0.06]",
    dot: "bg-sky-400",
    glow: "from-sky-500/20",
  },
  Animex: {
    chip: "border-orange-400/30 bg-orange-500/10 text-orange-100/90",
    pillActive: "border-orange-400/45 bg-orange-500/20 text-orange-50 shadow-[0_0_12px_-4px_rgba(251,146,60,0.35)]",
    pillIdle: "border-transparent text-orange-300/45 hover:text-orange-200/80 hover:bg-orange-500/[0.06]",
    dot: "bg-orange-400",
    glow: "from-orange-500/20",
  },
  KickAssAnime: {
    chip: "border-red-400/30 bg-red-500/10 text-red-100/90",
    pillActive: "border-red-400/45 bg-red-500/20 text-red-50 shadow-[0_0_12px_-4px_rgba(248,113,113,0.35)]",
    pillIdle: "border-transparent text-red-300/45 hover:text-red-200/80 hover:bg-red-500/[0.06]",
    dot: "bg-red-400",
    glow: "from-red-500/20",
  },
  ReAnime: {
    chip: "border-lime-400/30 bg-lime-500/10 text-lime-100/90",
    pillActive: "border-lime-400/45 bg-lime-500/20 text-lime-50 shadow-[0_0_12px_-4px_rgba(163,230,53,0.35)]",
    pillIdle: "border-transparent text-lime-300/45 hover:text-lime-200/80 hover:bg-lime-500/[0.06]",
    dot: "bg-lime-400",
    glow: "from-lime-500/20",
  },
  KuroHost: {
    chip: "border-violet-400/30 bg-violet-500/10 text-violet-100/90",
    pillActive: "border-violet-400/45 bg-violet-500/20 text-violet-50 shadow-[0_0_12px_-4px_rgba(167,139,250,0.35)]",
    pillIdle: "border-transparent text-violet-300/45 hover:text-violet-200/80 hover:bg-violet-500/[0.06]",
    dot: "bg-violet-400",
    glow: "from-violet-500/20",
  },
  AniHQ: {
    chip: "border-teal-400/30 bg-teal-500/10 text-teal-100/90",
    pillActive: "border-teal-400/45 bg-teal-500/20 text-teal-50 shadow-[0_0_12px_-4px_rgba(45,212,191,0.35)]",
    pillIdle: "border-transparent text-teal-300/45 hover:text-teal-200/80 hover:bg-teal-500/[0.06]",
    dot: "bg-teal-400",
    glow: "from-teal-500/20",
  },
  AnimeGG: {
    chip: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100/90",
    pillActive: "border-emerald-400/45 bg-emerald-500/20 text-emerald-50 shadow-[0_0_12px_-4px_rgba(52,211,153,0.35)]",
    pillIdle: "border-transparent text-emerald-300/45 hover:text-emerald-200/80 hover:bg-emerald-500/[0.06]",
    dot: "bg-emerald-400",
    glow: "from-emerald-500/20",
  },
  AnimeHeaven: {
    chip: "border-rose-400/30 bg-rose-500/10 text-rose-100/90",
    pillActive: "border-rose-400/45 bg-rose-500/20 text-rose-50 shadow-[0_0_12px_-4px_rgba(251,113,133,0.35)]",
    pillIdle: "border-transparent text-rose-300/45 hover:text-rose-200/80 hover:bg-rose-500/[0.06]",
    dot: "bg-rose-400",
    glow: "from-rose-500/20",
  },
  MeguAnime: {
    chip: "border-amber-400/30 bg-amber-500/10 text-amber-100/90",
    pillActive: "border-amber-400/45 bg-amber-500/20 text-amber-50 shadow-[0_0_12px_-4px_rgba(251,191,36,0.35)]",
    pillIdle: "border-transparent text-amber-300/45 hover:text-amber-200/80 hover:bg-amber-500/[0.06]",
    dot: "bg-amber-400",
    glow: "from-amber-500/20",
  },
  Anitaku: {
    chip: "border-lime-400/30 bg-lime-500/10 text-lime-100/90",
    pillActive: "border-lime-400/45 bg-lime-500/20 text-lime-50 shadow-[0_0_12px_-4px_rgba(163,230,53,0.35)]",
    pillIdle: "border-transparent text-lime-300/45 hover:text-lime-200/80 hover:bg-lime-500/[0.06]",
    dot: "bg-lime-400",
    glow: "from-lime-500/20",
  },
  AnimeLok: {
    chip: "border-orange-400/30 bg-orange-500/10 text-orange-100/90",
    pillActive: "border-orange-400/45 bg-orange-500/20 text-orange-50 shadow-[0_0_12px_-4px_rgba(251,146,60,0.35)]",
    pillIdle: "border-transparent text-orange-300/45 hover:text-orange-200/80 hover:bg-orange-500/[0.06]",
    dot: "bg-orange-400",
    glow: "from-orange-500/20",
  },
  Yenime: {
    chip: "border-sky-400/30 bg-sky-500/10 text-sky-100/90",
    pillActive: "border-sky-400/45 bg-sky-500/20 text-sky-50 shadow-[0_0_12px_-4px_rgba(56,189,248,0.35)]",
    pillIdle: "border-transparent text-sky-300/45 hover:text-sky-200/80 hover:bg-sky-500/[0.06]",
    dot: "bg-sky-400",
    glow: "from-sky-500/20",
  },
  Zenkai: {
    chip: "border-amber-400/30 bg-amber-500/10 text-amber-100/90",
    pillActive: "border-amber-400/45 bg-amber-500/20 text-amber-50 shadow-[0_0_12px_-4px_rgba(251,191,36,0.35)]",
    pillIdle: "border-transparent text-amber-300/45 hover:text-amber-200/80 hover:bg-amber-500/[0.06]",
    dot: "bg-amber-400",
    glow: "from-amber-500/20",
  },
};

export function getProviderAccent(id: KittyProvider): ProviderAccent {
  return ACCENTS[id] ?? DEFAULT_ACCENT;
}

export function providerPillClass(id: KittyProvider, isActive: boolean): string {
  const accent = getProviderAccent(id);
  return cn(
    "inline-flex items-center gap-1.5 font-mono font-semibold tracking-wide border transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none shrink-0 touch-manipulation",
    isActive ? accent.pillActive : accent.pillIdle,
  );
}

export const AUDIO_SEGMENT = {
  track:
    "inline-flex w-full rounded-lg border border-border dark:border-white/10 bg-muted/30 dark:bg-black/30 p-0.5",
  btn: "flex-1 inline-flex items-center justify-center gap-1.5 min-h-9 rounded-md text-[11px] font-mono font-bold uppercase tracking-wide transition-all duration-150 touch-manipulation",
  subActive: "bg-teal-500/20 text-teal-100 border border-teal-400/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
  subIdle: "text-muted-foreground dark:text-white/40 hover:text-teal-200/75 border border-transparent",
  dubActive: "bg-amber-500/20 text-amber-100 border border-amber-400/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
  dubIdle: "text-muted-foreground dark:text-white/40 hover:text-amber-200/75 border border-transparent",
  dubDisabled: "opacity-35 cursor-not-allowed pointer-events-none",
  hardActive: "bg-sky-500/20 text-sky-100 border border-sky-400/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
  hardIdle: "text-muted-foreground dark:text-white/40 hover:text-sky-200/75 border border-transparent",
} as const;

export const PROVIDER_PANEL = {
  shell:
    "rounded-lg border border-border/70 dark:border-white/[0.07] bg-muted/20 dark:bg-white/[0.025]",
  inner: "px-2.5 sm:px-3 py-2.5 space-y-2",
} as const;

export function providerChipClass(id: KittyProvider): string {
  const accent = getProviderAccent(id);
  return cn(
    "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-mono font-semibold shrink-0",
    accent.chip,
  );
}

export function audioChipClass(audio: "sub" | "dub"): string {
  return cn(
    "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wide",
    audio === "dub"
      ? "border-amber-400/30 bg-amber-500/10 text-amber-200/90"
      : "border-teal-400/30 bg-teal-500/10 text-teal-200/90",
  );
}
