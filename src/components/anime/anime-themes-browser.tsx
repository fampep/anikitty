"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ListMusic,
  Music2,
  Pause,
  Play,
  Search,
  Volume2,
  VolumeX,
} from "lucide-react";
import Container from "@/components/layout/container";
import { useGetAnimeThemes } from "@/query/anime/get-anime-themes";
import {
  formatThemeDisplayLabel,
  type AnimeThemePlayback,
} from "@/lib/anime/animethemes-api";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

type AnimeThemesBrowserProps = {
  slug: string;
  anilistId: number;
  animeTitle: string;
  /** When true, render inside the anime detail Themes tab (no page chrome). */
  embedded?: boolean;
};

export default function AnimeThemesBrowser({
  slug,
  anilistId,
  animeTitle,
  embedded = false,
}: AnimeThemesBrowserProps) {
  const t = useT();
  const { data, isLoading, isError } = useGetAnimeThemes(anilistId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [query, setQuery] = useState("");

  const playables = data?.playables ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return playables;
    return playables.filter((p) => {
      const hay = [
        p.label,
        p.versionLabel,
        p.songTitle,
        p.artists.join(" "),
        p.type,
        p.episodes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [playables, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, AnimeThemePlayback[]>();
    for (const item of filtered) {
      const key = item.type || "Other";
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [filtered]);

  const active = playables.find((p) => p.key === activeKey) ?? playables[0] ?? null;

  useEffect(() => {
    if (!playables.length) return;
    if (!activeKey || !playables.some((p) => p.key === activeKey)) {
      setActiveKey(playables[0]!.key);
    }
  }, [playables, activeKey]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active?.videoUrl) return;

    video.src = active.videoUrl;
    video.load();
    void video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [active?.videoUrl, active?.key]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) {
      video.pause();
      setPlaying(false);
      return;
    }
    try {
      await video.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const selectTheme = (item: AnimeThemePlayback) => {
    setActiveKey(item.key);
  };

  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className={cn("min-w-0", embedded ? "space-y-1" : "space-y-2")}>
        {!embedded ? (
          <Link
            href={`${ROUTES.ANIME_DETAILS}/${slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("anime.themesBackToAnime")}
          </Link>
        ) : null}
        <div className="flex items-center gap-2.5">
          <ListMusic className={cn("text-primary shrink-0", embedded ? "w-4 h-4" : "w-5 h-5")} />
          {embedded ? (
            <h2 className="text-lg font-semibold tracking-tight">{t("anime.themesPageTitle")}</h2>
          ) : (
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight truncate">
              {t("anime.themesPageTitle")}
            </h1>
          )}
        </div>
        {!embedded ? (
          <p className="text-sm text-muted-foreground truncate">{animeTitle}</p>
        ) : null}
        <p className="text-xs text-muted-foreground/80 max-w-xl">{t("anime.themesPageDesc")}</p>
      </div>

      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("anime.themesSearchPlaceholder")}
          className="w-full rounded-xl border border-border bg-background/80 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
    </div>
  );

  const body =
    isLoading ? (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="aspect-video rounded-2xl bg-muted/40 animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      </div>
    ) : isError || !playables.length ? (
      <div className="rounded-2xl border border-border bg-muted/20 px-5 py-10 text-center">
        <Music2 className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{t("anime.themesEmpty")}</p>
      </div>
    ) : (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-black shadow-xl">
            <video
              ref={videoRef}
              className="w-full aspect-video bg-black"
              playsInline
              controls={false}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
            />
          </div>

          {active ? (
            <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm px-4 py-3.5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    {active.label} · {active.versionLabel}
                    {active.episodes ? ` · eps ${active.episodes}` : ""}
                  </p>
                  <h2 className="text-lg font-semibold truncate">
                    {active.songTitle || active.label}
                  </h2>
                  {active.artists.length > 0 ? (
                    <p className="text-sm text-muted-foreground truncate">
                      {active.artists.join(", ")}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => void togglePlay()}
                    className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition"
                    aria-label={playing ? t("anime.themePause") : t("anime.themePlay")}
                  >
                    {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-2.5 rounded-xl border border-border hover:bg-muted transition"
                    aria-label={muted ? t("anime.themeUnmute") : t("anime.themeMuted")}
                  >
                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono font-semibold">
                  {active.versionLabel}
                </span>
                {active.nc ? (
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold">
                    NC
                  </span>
                ) : null}
                {active.lyrics ? (
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold">
                    Lyrics
                  </span>
                ) : null}
                {active.resolution > 0 ? (
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono">
                    {active.resolution}p
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              {t("anime.themesTrackList", { n: filtered.length })}
            </p>
          </div>
          <div className="max-h-[min(70vh,720px)] overflow-y-auto divide-y divide-border/60">
            {grouped.map(([type, items]) => (
              <div key={type}>
                <div className="sticky top-0 z-[1] bg-background/90 backdrop-blur px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {type}
                </div>
                <ul>
                  {items.map((item) => {
                    const isActive = item.key === active?.key;
                    return (
                      <li key={item.key}>
                        <button
                          type="button"
                          onClick={() => selectTheme(item)}
                          className={cn(
                            "w-full text-left px-4 py-3 transition-colors flex items-start gap-3",
                            isActive ? "bg-primary/10" : "hover:bg-muted/50",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {isActive && playing ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-mono font-semibold text-primary">
                                {item.label}
                              </span>
                              <span className="text-[10px] font-mono rounded bg-muted px-1.5 py-0.5">
                                {item.versionLabel}
                              </span>
                              {item.episodes ? (
                                <span className="text-[10px] text-muted-foreground">
                                  eps {item.episodes}
                                </span>
                              ) : null}
                            </span>
                            <span className="block text-sm font-medium truncate">
                              {item.songTitle || formatThemeDisplayLabel(item)}
                            </span>
                            {item.artists.length > 0 ? (
                              <span className="block text-xs text-muted-foreground truncate">
                                {item.artists.join(", ")}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {!filtered.length ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                {t("anime.themesNoMatches")}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );

  if (embedded) {
    return (
      <div className="space-y-5">
        {header}
        {body}
      </div>
    );
  }

  return (
    <div className="relative min-h-[70vh] pb-[calc(var(--mobile-nav-total)+2rem)] sm:pb-16">
      <Container className="pt-6 sm:pt-10 space-y-6">
        {header}
        {body}
      </Container>
    </div>
  );
}
