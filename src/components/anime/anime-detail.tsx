"use client";
import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { genres as GENRE_OPTIONS } from "@/constants/search-filters";

import Container from "@/components/layout/container";
import AnimeCard from "@/components/anime/anime-card";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import WatchButton from "@/components/watch/watch-button";
import { IAnime } from "@/types/anime";
import AnimeCarousel from "@/components/anime/anime-carousel";
import AnimeEpisodes from "@/components/anime/anime-episodes";
import CharacterCard from "@/components/common/character-card";
import VoiceActorsPanel from "@/components/anime/voice-actors-panel";
import AniListRichText, { cleanAniListText } from "@/components/anime/anilist-rich-text";
import { recordRecentlyViewed } from "@/lib/core/recently-viewed";
import { ROUTES } from "@/constants/routes";
import Select from "@/components/common/select";
import {
  ExternalLink,
  Film,
  Heart,
  Radio,
  Star,
} from "lucide-react";
import { useGetAnimeDetails } from "@/query/anime/get-anime-details";
import QueryRetryPanel from "@/components/shared/query-retry-panel";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";
import { withAuth } from "@/lib/auth/auth-fetch";
import { toast } from "sonner";
import useBookMarks from "@/hooks/use-get-bookmark";
import { useGetAnimeBanner } from "@/query/home/get-banner-anime";
import { useGetAnimeMappings } from "@/query/anime/get-anime-mappings";
import { useGetAllEpisodes } from "@/query/anime/get-all-episodes";
import { cn } from "@/lib/core/utils";
import dynamic from "next/dynamic";
import { useT } from "@/providers/i18n-provider";
import { useBookmarkLabels } from "@/hooks/use-bookmark-labels";
import AnimeClearLogo from "@/components/anime/anime-clear-logo";
import NextEpisodeCountdown from "@/components/anime/next-episode-countdown";
import { pickAnimeClearLogo } from "@/lib/anime/anime-logo";
import { resolveAnimeBackdropUrl } from "@/lib/anime/resolve-backdrop";
import { formatMalMemberCount } from "@/lib/anime/mal-metadata";
import AnimeQuickNav from "@/components/anime/anime-quick-nav";
import AnimeShareButton from "@/components/anime/anime-share-button";
import RewatchStepper from "@/components/anime/rewatch-stepper";
import MarkWatchedButton from "@/components/anime/mark-watched-button";
import { useEpisodeProgress } from "@/hooks/use-episode-progress";
const AnimeThemePlayer = dynamic(() => import("@/components/anime/anime-theme-player"), {
  ssr: false,
});

const WatchTrailer = dynamic(() => import("@/components/watch/watch-trailer"), { ssr: false });
const AnimeEpisodeAlertButton = dynamic(() => import("@/components/anime/anime-episode-alert-button"), {
  ssr: false,
});
const CommentSection = dynamic(() => import("@/components/comments/comment-section"), {
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/8" />,
});
const AnimeReviews = dynamic(() => import("@/components/anime/anime-reviews"), {
  loading: () => <div className="h-40 animate-pulse rounded-xl bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/8" />,
});
const AnimeSubtitles = dynamic(() => import("@/components/subtitles/anime-subtitles"), {
  loading: () => <div className="h-40 animate-pulse rounded-xl bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/8" />,
});
const AnimeMediaDownloads = dynamic(() => import("@/components/anime/anime-media-downloads"), {
  loading: () => <div className="h-40 animate-pulse rounded-xl bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/8" />,
});

const DB_LINKS = [
  { key: "anilist",   label: "AniList",      url: (id: string | number) => `https://anilist.co/anime/${id}`,                    color: "text-teal-400/80 border-teal-500/20 bg-teal-500/8"      },
  { key: "mal",       label: "MyAnimeList",  url: (id: string | number) => `https://myanimelist.net/anime/${id}`,               color: "text-blue-400/80 border-blue-500/20 bg-blue-500/8"      },
  { key: "anidb",     label: "AniDB",        url: (id: string | number) => `https://anidb.net/anime/${id}`,                     color: "text-orange-400/80 border-orange-500/20 bg-orange-500/8" },
  { key: "tvdb",      label: "TVDB",         url: (id: string | number) => `https://www.thetvdb.com/?id=${id}&tab=series`,      color: "text-green-400/80 border-green-500/20 bg-green-500/8"   },
  { key: "tmdb",      label: "TMDB",         url: (id: string | number) => `https://www.themoviedb.org/tv/${id}`,               color: "text-sky-400/80 border-sky-500/20 bg-sky-500/8"         },
  { key: "kitsu",     label: "Kitsu",        url: (id: string | number) => `https://kitsu.app/anime/${id}`,                     color: "text-pink-400/80 border-pink-500/20 bg-pink-500/8"      },
  { key: "ap",        label: "AnimePlanet",  url: (id: string | number) => `https://www.anime-planet.com/anime/${id}`,          color: "text-purple-400/80 border-purple-500/20 bg-purple-500/8" },
  { key: "imdb",      label: "IMDb",         url: (id: string | number) => `https://www.imdb.com/title/${id}`,                  color: "text-amber-400/80 border-amber-500/20 bg-amber-500/8"   },
] as const;

const RATING_STYLES: Record<string, { label: string; color: string }> = {
  anikitty: { label: "AniKitty", color: "border-primary/30 bg-primary/12 text-zinc-200" },
  anilist: { label: "AniList", color: "border-teal-500/25 bg-teal-500/10 text-teal-300" },
  mal:     { label: "MAL", color: "border-blue-500/25 bg-blue-500/10 text-blue-300" },
  tvdb:    { label: "TVDB", color: "border-green-500/25 bg-green-500/10 text-green-300" },
  tmdb:    { label: "TMDB", color: "border-sky-500/25 bg-sky-500/10 text-sky-300" },
  imdb:    { label: "IMDb", color: "border-amber-500/25 bg-amber-500/10 text-amber-300" },
  kitsu:   { label: "Kitsu", color: "border-pink-500/25 bg-pink-500/10 text-pink-300" },
};

// Map a display genre ("Slice of Life") to a searchable slug, when one exists.
const GENRE_SLUGS = new Set(GENRE_OPTIONS.map((g) => g.value));
function genreSearchSlug(genre: string): string | null {
  const slug = genre.toLowerCase().replace(/\s+/g, "-");
  return GENRE_SLUGS.has(slug) ? slug : null;
}

export default function AnimeDetail({ slug }: { slug: string }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const bookmarkOptions = useBookmarkLabels();
  const showAdultContent = useSettingsStore((s) => s.showAdultContent);
  const { data: anime, isLoading, isError, isFetching, refetch } = useGetAnimeDetails(slug);
  const { auth } = useAuthStore();
  const { bookmarks, createOrUpdateBookMark } = useBookMarks({
    animeID: slug,
    page: 1,
    per_page: 1,
  });
  const [selected, setSelected] = useState(bookmarks?.[0]?.status || "");

  useEffect(() => {
    const status = bookmarks?.[0]?.status;
    if (status) setSelected(status);
  }, [bookmarks?.[0]?.status]);

  const anilistId = anime?.anime.info.anilistId;

  const { data: banner } = useGetAnimeBanner(anilistId!);
  const { data: mappingData } = useGetAnimeMappings(anilistId);
  const { data: episodesData } = useGetAllEpisodes(slug);
  const watchedEpisodes = useEpisodeProgress(slug);

  const rawEpisodeCount =
    episodesData?.episodes?.length ?? episodesData?.totalEpisodes ?? 0;

  const watchedEpisodeCount = useMemo(() => {
    return watchedEpisodes.filter((w) => {
      const duration = w.duration ?? 0;
      if (duration > 0) return w.current / duration >= 0.95;
      return w.current > 10;
    }).length;
  }, [watchedEpisodes]);

  const defaultTab = useMemo(() => {
    const tab = searchParams.get("tab");
    const valid = new Set([
      "overview",
      "episodes",
      "subtitles",
      "media",
      "art",
      "characters",
      "voices",
      "relations",
      "reviews",
      "comments",
    ]);
    return tab && valid.has(tab) ? tab : "overview";
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Record this anime for the home "Recently viewed" rail.
  const viewedInfo = anime?.anime?.info;
  useEffect(() => {
    if (viewedInfo?.id && viewedInfo.name && viewedInfo.poster) {
      recordRecentlyViewed({
        id: String(viewedInfo.id),
        name: viewedInfo.name,
        poster: viewedInfo.poster,
      });
    }
  }, [viewedInfo?.id, viewedInfo?.name, viewedInfo?.poster]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "overview") params.delete("tab");
    else params.set("tab", value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    requestAnimationFrame(() => {
      document.getElementById("anime-tabs-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  // First-party "AniKitty Score" aggregate from user reviews.
  const [anikittyAgg, setAnikittyAgg] = useState<{ average: number; count: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/anime/${slug}/reviews?limit=1`, withAuth())
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const agg = d?.aggregate;
        setAnikittyAgg(agg && agg.count > 0 ? { average: agg.average, count: agg.count } : null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const providerRatings = (() => {
    if (!anime) return [];
    const list = [...(mappingData?.metadata?.ratings ?? [])];
    const rating = anime.anime.info.stats?.rating;
    const aid = anime.anime.info.anilistId;
    if (rating && rating !== "N/A" && !list.some((r) => r.provider === "anilist")) {
      const match = rating.match(/([\d.]+)/);
      list.unshift({
        provider: "anilist",
        score: match ? parseFloat(match[1]) : null,
        label: rating,
        url: aid ? `https://anilist.co/anime/${aid}` : null,
      });
    }
    if (anikittyAgg) {
      list.unshift({
        provider: "anikitty",
        score: anikittyAgg.average,
        label: anikittyAgg.average.toFixed(1),
        url: null,
        votes: anikittyAgg.count,
      });
    }
    return list;
  })();

  const handleSelect = async (value: string) => {
    if (!auth) return;
    const prev = selected;
    setSelected(value);
    try {
      await createOrUpdateBookMark(
        slug,
        anime?.anime.info.name!,
        anime?.anime.info.poster!,
        value,
      );
    } catch {
      setSelected(prev);
      toast.error(t("anime.listError"), { style: { background: "red" } });
    }
  };

  if (isError && !anime) {
    return (
      <QueryRetryPanel
        message={t("anime.loadError")}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
        backHref={ROUTES.HOME}
      />
    );
  }

  if (isLoading || !anime) return <AnimeDetailSkeleton />;

  const info     = anime.anime.info;
  const moreInfo = anime.anime.moreInfo;
  const stats    = info.stats;
  const hasDub   = (stats?.episodes?.dub ?? 0) > 0;
  const isAiring = moreInfo.status === "Currently Airing";

  // Adult titles stay on the normal anime page — hide unless setting is on.
  if (info.isAdult && !showAdultContent) {
    return (
      <Container className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-sm text-muted-foreground max-w-md">
          {t("settings.adultLocked")}
        </p>
        <Link
          href={ROUTES.SETTINGS}
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          {t("settings.openSettings")}
        </Link>
      </Container>
    );
  }

  const mappings  = mappingData?.mappings;
  const mapImages = mappingData?.images;
  const extMeta   = mappingData?.metadata;
  const tmdb      = extMeta?.tmdb;
  const tmdbUrl   = mappings?.themoviedb_id
    ? `https://www.themoviedb.org/tv/${mappings.themoviedb_id}`
    : null;

  const totalEpisodeCount = rawEpisodeCount;
  const plannedTotal =
    episodesData?.plannedTotal && episodesData.plannedTotal > 0
      ? episodesData.plannedTotal
      : undefined;
  const episodeCountLabel =
    totalEpisodeCount > 0 && plannedTotal && plannedTotal > totalEpisodeCount
      ? `${totalEpisodeCount} / ${plannedTotal}`
      : totalEpisodeCount > 0
        ? String(totalEpisodeCount)
        : stats?.episodes?.sub ?? null;

  const malScoreLabel =
    extMeta?.ratings?.find((r) => r.provider === "mal")?.label ??
    (moreInfo.malscore !== "N/A" ? moreInfo.malscore : null);

  const bannerSrc =
    resolveAnimeBackdropUrl({
      images: mapImages,
      anilistBanner: banner?.Media.bannerImage,
      infoBanner: info.banner,
      poster: info.poster,
    }) || info.poster;

  const clearLogo = pickAnimeClearLogo(mapImages);

  const hasArtTab =
    Boolean(mapImages?.fanart || mapImages?.banner || mapImages?.poster) ||
    Boolean(
      mapImages?.artworks &&
        Object.values(mapImages.artworks).some((items) => (items?.length ?? 0) > 0),
    );

  const fanartItems = mapImages?.artworks?.fanart ?? [];
  const tvdbFanartItems = fanartItems.filter((item) => item.title === "TVDB");
  const communityFanartItems = fanartItems.filter((item) => item.title !== "TVDB");

  const externalLinks: { label: string; url: string; color: string }[] = [];
  if (info.anilistId)           externalLinks.push({ ...DB_LINKS[0], url: DB_LINKS[0].url(info.anilistId) });
  if (mappings?.mal_id)         externalLinks.push({ ...DB_LINKS[1], url: DB_LINKS[1].url(mappings.mal_id) });
  if (mappings?.anidb_id)       externalLinks.push({ ...DB_LINKS[2], url: DB_LINKS[2].url(mappings.anidb_id) });
  if (mappings?.thetvdb_id)     externalLinks.push({ ...DB_LINKS[3], url: DB_LINKS[3].url(mappings.thetvdb_id) });
  if (mappings?.themoviedb_id)  externalLinks.push({ ...DB_LINKS[4], url: DB_LINKS[4].url(mappings.themoviedb_id) });
  if (mappings?.kitsu_id)       externalLinks.push({ ...DB_LINKS[5], url: DB_LINKS[5].url(mappings.kitsu_id) });
  if (mappings?.animeplanet_id) externalLinks.push({ ...DB_LINKS[6], url: DB_LINKS[6].url(mappings.animeplanet_id) });
  if (mappings?.imdb_id)        externalLinks.push({ ...DB_LINKS[7], url: DB_LINKS[7].url(mappings.imdb_id) });

  const tabItems = [
    { value: "overview", label: t("anime.tabs.overview") },
    {
      value: "episodes",
      label: t("anime.tabs.episodes"),
      ...(totalEpisodeCount > 0 ? { badge: totalEpisodeCount } : {}),
    },
    { value: "subtitles", label: t("anime.tabs.subtitles") },
    { value: "media", label: t("anime.tabs.media") },
    ...(hasArtTab ? [{ value: "art", label: t("anime.tabs.art") }] : []),
    ...(info.charactersVoiceActors.length > 0
      ? [
          { value: "characters", label: t("anime.tabs.characters") },
          { value: "voices", label: t("anime.tabs.voiceActors") },
        ]
      : []),
    ...(anime.relatedAnimes?.length > 0
      ? [{ value: "relations", label: t("anime.tabs.relations") }]
      : []),
    { value: "reviews", label: t("anime.tabs.reviews") },
    { value: "comments", label: t("anime.tabs.comments") },
  ];

  return (
    <div className="w-full min-h-screen">
      {/* ── Banner ── */}
      <div className="h-[40vh] sm:h-[44vh] md:h-[58vh] w-full relative">
        <Image
          src={bannerSrc}
          alt={info.name}
          fill
          className="object-cover object-top"
          unoptimized
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-background/50 dark:via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent" />
        <div className="absolute bottom-4 right-4 left-4 sm:left-auto z-10 flex flex-col items-stretch sm:items-end gap-2.5 sm:max-w-md md:bottom-10 md:right-10">
          <WatchTrailer videoHref={info.promotionalVideos[0]?.source} inline />
          {info.anilistId ? <AnimeThemePlayer anilistId={info.anilistId} /> : null}
        </div>
      </div>

      <Container className="pb-[calc(var(--mobile-nav-total)+1.5rem)] sm:pb-28">
        {/* ── Hero ── */}
        <div className="flex md:mt-[-14rem] mt-[-2rem] sm:mt-[-3.5rem] md:flex-row flex-col md:items-end gap-5 sm:gap-6 md:gap-8">
          {/* Poster: smaller on mobile, full-size on md+ */}
          <div className="shrink-0 relative self-center md:self-auto">
            <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-primary/20 via-zinc-600/10 to-transparent blur-xl pointer-events-none" />
            <AnimeCard
              title={info.name}
              poster={info.poster}
              href={`${ROUTES.ANIME_DETAILS}/${info.id}`}
              displayDetails={false}
              variant="lg"
              className="shadow-[0_24px_64px_rgba(0,0,0,0.75)] ring-1 ring-white/8 w-[130px] sm:w-[160px] md:w-auto"
            />
            {isAiring && (
              <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-emerald-500 text-black text-[9px] font-black px-2 py-1 rounded-lg shadow-lg shadow-emerald-500/30">
                <Radio className="w-2.5 h-2.5" />
                {t("anime.airing")}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:gap-3.5 pb-4 md:pb-10 min-w-0 flex-1">
            <div>
              <AnimeClearLogo
                name={info.name}
                logoUrl={clearLogo}
                size="lg"
              />
              {moreInfo.japanese && (
                <p className="text-xs sm:text-sm text-muted-foreground dark:text-white/35 mt-1.5 font-mono tracking-wide">
                  {moreInfo.japanese}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {stats?.rating && (
                <StatPill icon={<Star className="w-3 h-3 fill-current" />} label={stats.rating} gold />
              )}
              {stats?.type && <StatPill icon={<Film className="w-3 h-3" />} label={stats.type} />}
              {stats?.episodes?.sub !== undefined && (
                <StatPill
                  label={
                    plannedTotal && plannedTotal > totalEpisodeCount && totalEpisodeCount > 0
                      ? `${totalEpisodeCount} / ${plannedTotal} ${t("card.sub")}`
                      : `${stats.episodes.sub} ${t("card.sub")}`
                  }
                  teal
                />
              )}
              {hasDub && (
                <StatPill label={`${stats!.episodes!.dub} ${t("card.dub")}`} purple />
              )}
              {(moreInfo as any)?.duration && (
                <StatPill label={(moreInfo as any).duration} />
              )}
              {watchedEpisodeCount > 0 && totalEpisodeCount > 0 && (
                <StatPill
                  label={t("anime.watchProgress", {
                    watched: watchedEpisodeCount,
                    total: totalEpisodeCount,
                  })}
                  teal
                />
              )}
              {moreInfo?.status && !isAiring && <StatPill label={moreInfo.status} />}
              {moreInfo?.premiered && <StatPill label={moreInfo.premiered} />}
            </div>

            {providerRatings.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                {providerRatings.map((rating) => {
                  const style = RATING_STYLES[rating.provider] ?? {
                    label: rating.provider,
                    color: "border-border dark:border-white/15 bg-muted/50 dark:bg-white/5 text-muted-foreground dark:text-white/70",
                  };
                  const card = (
                    <div className={cn("shrink-0 rounded-xl border px-3 py-2 min-w-[5.5rem]", style.color)}>
                      <span className="text-[9px] font-mono uppercase tracking-wider opacity-70 block">
                        {style.label}
                      </span>
                      <span className="text-sm font-bold tabular-nums">{rating.label}</span>
                    </div>
                  );
                  return rating.url ? (
                    <a
                      key={rating.provider}
                      href={rating.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:opacity-90 transition-opacity"
                    >
                      {card}
                    </a>
                  ) : (
                    <div key={rating.provider}>{card}</div>
                  );
                })}
              </div>
            )}

            {moreInfo?.genres && (moreInfo.genres as string[]).length > 0 && (
              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                {(moreInfo.genres as string[]).map((g) => {
                  const slug = genreSearchSlug(g);
                  const className =
                    "px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] rounded-lg border border-primary/15 text-zinc-200/55 bg-primary/[0.06] hover:bg-primary/10 hover:text-zinc-100/80 transition-colors";
                  return slug ? (
                    <Link key={g} href={`${ROUTES.SEARCH}?genres=${slug}`} className={className}>
                      {g}
                    </Link>
                  ) : (
                    <span key={g} className={cn(className, "cursor-default")}>
                      {g}
                    </span>
                  );
                })}
              </div>
            )}

            {info.description && (
              <div className="max-w-2xl">
                <p className="text-sm text-muted-foreground dark:text-white/50 leading-relaxed line-clamp-3 md:line-clamp-4">
                  {cleanAniListText(info.description as string)}
                </p>
                <button
                  type="button"
                  onClick={() => handleTabChange("overview")}
                  className="site-focus mt-1.5 text-[11px] font-semibold text-zinc-300/80 hover:text-zinc-200 transition-colors rounded-md"
                >
                  {t("anime.readMore")}
                </button>
                {totalEpisodeCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleTabChange("episodes")}
                    className="site-focus mt-1.5 ml-3 text-[11px] font-semibold text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/75 transition-colors rounded-md"
                  >
                    {t("anime.browseEpisodes")}
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap mt-1">
              <WatchButton />
              <AnimeShareButton />
              <AnimeEpisodeAlertButton
                anilistId={slug}
                animeTitle={info.name}
                animeThumbnail={info.poster}
                japaneseTitle={moreInfo.japanese as string | undefined}
                malId={mappings?.mal_id ?? null}
                fallbackSub={stats?.episodes?.sub ?? undefined}
                status={isAiring ? "RELEASING" : undefined}
                hasDub={hasDub}
                isAiring={isAiring}
              />
              {auth && (
                <Select
                  placeholder={t("anime.addToList")}
                  value={bookmarks?.[0]?.status || selected}
                  options={bookmarkOptions}
                  onChange={handleSelect}
                  placeholderIcon={Heart}
                />
              )}
              {auth && (bookmarks?.[0]?.status || selected) !== "completed" && (
                <MarkWatchedButton
                  animeId={slug}
                  anilistId={typeof anilistId === "number" ? anilistId : undefined}
                  title={info.name}
                  poster={info.poster}
                  totalEpisodes={stats?.episodes?.sub ?? undefined}
                />
              )}
              {auth && (bookmarks?.[0]?.status || selected) === "completed" && (
                <RewatchStepper animeId={slug} initial={bookmarks?.[0]?.rewatchCount ?? 0} />
              )}
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div id="anime-tabs-panel" className="scroll-mt-[calc(var(--nav-total-height)+0.75rem)] mt-6 sm:mt-10">
          <div className="anime-sticky-chrome sticky top-[var(--nav-total-height)] z-30 -mx-4 px-4 py-2 mb-3 bg-background/95 backdrop-blur-md border-b border-border/80 dark:border-white/10 sm:static sm:mx-0 sm:px-0 sm:py-0 sm:mb-4 sm:bg-transparent sm:backdrop-blur-none sm:border-b-0">
            <AnimeQuickNav
              tabs={tabItems}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="hidden sm:flex items-center justify-start w-full sm:w-fit h-fit bg-transparent border-b border-border dark:border-white/8 rounded-none gap-0 px-0 pb-0 overflow-x-auto scrollbar-hide">
            {tabItems.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-sm font-semibold px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-white data-[state=active]:bg-primary/[0.06] text-muted-foreground dark:text-white/35 hover:text-muted-foreground dark:text-white/65 transition-all bg-transparent whitespace-nowrap"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="mt-8 space-y-5">
            <OverviewPanel title={t("anime.synopsis")}>
              {tmdb?.tagline ? (
                <p className="text-sm italic text-sky-300/75 mb-4 leading-relaxed">
                  &ldquo;{tmdb.tagline}&rdquo;
                </p>
              ) : null}
              <AniListRichText
                text={info.description as string}
                className="text-sm text-muted-foreground dark:text-white/65 leading-8"
              />
            </OverviewPanel>

            {moreInfo.synonyms && (
              <OverviewPanel title={t("anime.alternativeTitles")}>
                <div className="flex flex-wrap gap-2">
                  {moreInfo.japanese && (
                    <span className="px-3 py-1.5 text-[12px] rounded-lg border border-border dark:border-white/10 text-muted-foreground dark:text-white/55 bg-muted/40 dark:bg-white/4">
                      {moreInfo.japanese}
                    </span>
                  )}
                  {String(moreInfo.synonyms).split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
                    <span key={s} className="px-3 py-1.5 text-[12px] rounded-lg border border-border dark:border-white/8 text-muted-foreground dark:text-white/40 bg-muted/30 dark:bg-white/[0.02]">{s}</span>
                  ))}
                </div>
              </OverviewPanel>
            )}

            {moreInfo.studios && (
              <OverviewPanel title={t("anime.studios")}>
                <div className="flex flex-wrap gap-2">
                  {String(moreInfo.studios).split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
                    <span key={s} className="px-3 py-1.5 text-[12px] rounded-lg border border-border dark:border-white/12 text-muted-foreground dark:text-white/65 bg-muted/50 dark:bg-white/5 font-medium">{s}</span>
                  ))}
                  {moreInfo.producers?.map((p) => (
                    <span key={p} className="px-3 py-1.5 text-[12px] rounded-lg border border-border dark:border-white/8 text-muted-foreground dark:text-white/35 bg-muted/30 dark:bg-white/[0.02]">{p}</span>
                  ))}
                </div>
              </OverviewPanel>
            )}

            {providerRatings.length > 0 && (
              <OverviewPanel title={t("anime.ratings")}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {providerRatings.map((rating) => {
                    const style = RATING_STYLES[rating.provider] ?? {
                      label: rating.provider,
                      color: "border-border dark:border-white/15 bg-muted/50 dark:bg-white/5 text-muted-foreground dark:text-white/70",
                    };
                    const inner = (
                      <div className={cn("rounded-xl border px-4 py-3 h-full transition-colors hover:bg-muted/40 dark:bg-white/[0.03]", style.color)}>
                        <span className="text-[10px] font-mono uppercase tracking-wider opacity-70 block mb-1">
                          {style.label}
                        </span>
                        <span className="text-lg font-bold tabular-nums">{rating.label}</span>
                        {rating.votes != null && rating.votes > 0 && (
                          <span className="text-[10px] font-mono text-muted-foreground dark:text-white/35 block mt-1">
                            {t("anime.ratingsVotes", { count: rating.votes.toLocaleString() })}
                          </span>
                        )}
                      </div>
                    );
                    if (rating.provider === "anikitty") {
                      return (
                        <button
                          key={rating.provider}
                          type="button"
                          onClick={() => handleTabChange("reviews")}
                          className="text-left hover:opacity-90 transition-opacity"
                        >
                          {inner}
                        </button>
                      );
                    }
                    return rating.url ? (
                      <a
                        key={rating.provider}
                        href={rating.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:opacity-90 transition-opacity"
                      >
                        {inner}
                      </a>
                    ) : (
                      <div key={rating.provider}>{inner}</div>
                    );
                  })}
                </div>
                {extMeta?.mal && (extMeta.mal.rank || extMeta.mal.popularity || extMeta.mal.members) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {extMeta.mal.rank ? (
                      <MalStatChip
                        href={extMeta.mal.url ?? undefined}
                        label={t("anime.detailFields.malRank")}
                        value={`#${extMeta.mal.rank.toLocaleString()}`}
                      />
                    ) : null}
                    {extMeta.mal.popularity ? (
                      <MalStatChip
                        href={extMeta.mal.url ?? undefined}
                        label={t("anime.detailFields.malPopularity")}
                        value={`#${extMeta.mal.popularity.toLocaleString()}`}
                      />
                    ) : null}
                    {extMeta.mal.members ? (
                      <MalStatChip
                        href={extMeta.mal.url ?? undefined}
                        label={t("anime.detailFields.malMembers")}
                        value={formatMalMemberCount(extMeta.mal.members)}
                      />
                    ) : null}
                  </div>
                )}
                {tmdb && (tmdb.popularity || tmdb.episodes || tmdb.seasons) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tmdb.popularity ? (
                      <TmdbStatChip
                        href={tmdbUrl ?? undefined}
                        label={t("anime.detailFields.tmdbPopularity")}
                        value={tmdb.popularity.toLocaleString()}
                      />
                    ) : null}
                    {tmdb.episodes ? (
                      <TmdbStatChip
                        href={tmdbUrl ?? undefined}
                        label={t("anime.detailFields.tmdbEpisodes")}
                        value={String(tmdb.episodes)}
                      />
                    ) : null}
                    {tmdb.seasons ? (
                      <TmdbStatChip
                        href={tmdbUrl ?? undefined}
                        label={t("anime.detailFields.tmdbSeasons")}
                        value={String(tmdb.seasons)}
                      />
                    ) : null}
                  </div>
                )}
              </OverviewPanel>
            )}

            {extMeta?.mal?.themes && extMeta.mal.themes.length > 0 && (
              <OverviewPanel title={t("anime.detailFields.malThemes")}>
                <div className="flex flex-wrap gap-2">
                  {extMeta.mal.themes.map((theme) => (
                    <span
                      key={theme}
                      className="px-3 py-1.5 text-[12px] rounded-lg border border-blue-500/20 text-blue-300/90 bg-blue-500/8 font-medium"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </OverviewPanel>
            )}

            {tmdb?.genres && tmdb.genres.length > 0 && (
              <OverviewPanel title={t("anime.detailFields.tmdbGenres")}>
                <div className="flex flex-wrap gap-2">
                  {tmdb.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-3 py-1.5 text-[12px] rounded-lg border border-sky-500/20 text-sky-300/90 bg-sky-500/8 font-medium"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </OverviewPanel>
            )}

            {(tmdb?.production?.length || tmdb?.creators?.length) ? (
              <OverviewPanel title={t("anime.detailFields.tmdbProduction")}>
                <div className="flex flex-wrap gap-2">
                  {tmdb?.creators?.map((creator) => (
                    <span
                      key={`creator-${creator}`}
                      className="px-3 py-1.5 text-[12px] rounded-lg border border-sky-500/25 text-sky-200/85 bg-sky-500/10 font-medium"
                    >
                      {creator}
                    </span>
                  ))}
                  {tmdb?.production?.map((company) => (
                    <span
                      key={`prod-${company}`}
                      className="px-3 py-1.5 text-[12px] rounded-lg border border-border dark:border-white/8 text-muted-foreground dark:text-white/35 bg-muted/30 dark:bg-white/[0.02]"
                    >
                      {company}
                    </span>
                  ))}
                </div>
              </OverviewPanel>
            ) : null}

            <OverviewPanel title={t("anime.details")}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {info.nextAiringEpisode?.airingAt &&
                  info.nextAiringEpisode.airingAt * 1000 > Date.now() && (
                    <div className="col-span-2 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 dark:bg-primary/[0.06]">
                      <span className="text-[10px] font-mono text-primary/80 uppercase tracking-wider block mb-1">
                        {t("anime.detailFields.upcomingEp")}
                      </span>
                      <NextEpisodeCountdown
                        airingAt={info.nextAiringEpisode.airingAt}
                        episode={info.nextAiringEpisode.episode}
                        variant="inline"
                        className="text-[13px] text-foreground/90 dark:text-white/85 font-semibold"
                      />
                    </div>
                  )}
                {[
                  { label: t("anime.detailFields.type"), value: stats?.type },
                  { label: t("anime.detailFields.episodes"), value: episodeCountLabel },
                  { label: t("anime.detailFields.duration"), value: (moreInfo as any).duration ?? (tmdb?.episodeRuntime ? `${tmdb.episodeRuntime} min` : null) },
                  { label: t("anime.detailFields.status"), value: moreInfo.status },
                  { label: t("anime.detailFields.source"), value: moreInfo.source },
                  { label: t("anime.detailFields.aired"), value: moreInfo.aired ?? tmdb?.firstAirDate },
                  { label: t("anime.detailFields.premiered"), value: moreInfo.premiered ?? tmdb?.firstAirDate },
                  { label: t("anime.detailFields.score"), value: malScoreLabel },
                  { label: t("anime.detailFields.malRank"), value: extMeta?.mal?.rank ? `#${extMeta.mal.rank.toLocaleString()}` : null },
                  { label: t("anime.detailFields.malPopularity"), value: extMeta?.mal?.popularity ? `#${extMeta.mal.popularity.toLocaleString()}` : null },
                  { label: t("anime.detailFields.malMembers"), value: extMeta?.mal?.members ? formatMalMemberCount(extMeta.mal.members) : null },
                  { label: t("anime.detailFields.malContentRating"), value: extMeta?.mal?.contentRating },
                  { label: t("anime.detailFields.malBroadcast"), value: extMeta?.mal?.broadcast },
                  { label: t("anime.detailFields.malSeason"), value: extMeta?.mal?.season },
                  { label: t("anime.detailFields.malLicensors"), value: extMeta?.mal?.licensors?.length ? extMeta.mal.licensors.join(", ") : null },
                  { label: t("anime.detailFields.malSource"), value: extMeta?.mal?.source && extMeta.mal.source !== moreInfo.source ? extMeta.mal.source : null },
                  { label: t("anime.detailFields.tvdbStatus"), value: extMeta?.tvdb?.status },
                  { label: t("anime.detailFields.network"), value: extMeta?.tvdb?.network ?? tmdb?.networks?.[0] },
                  { label: t("anime.detailFields.tmdbNetworks"), value: tmdb?.networks?.length ? tmdb.networks.join(", ") : null },
                  { label: t("anime.detailFields.country"), value: extMeta?.tvdb?.country ?? tmdb?.originCountry?.join(", ") },
                  { label: t("anime.detailFields.tmdbStatus"), value: tmdb?.status },
                  { label: t("anime.detailFields.tmdbSeasons"), value: tmdb?.seasons },
                  { label: t("anime.detailFields.tmdbEpisodes"), value: tmdb?.episodes },
                  { label: t("anime.detailFields.tmdbPopularity"), value: tmdb?.popularity ? tmdb.popularity.toLocaleString() : null },
                  { label: t("anime.detailFields.tmdbOriginalName"), value: tmdb?.originalName && tmdb.originalName !== info.name ? tmdb.originalName : null },
                  { label: t("anime.detailFields.tmdbFirstAirDate"), value: tmdb?.firstAirDate && tmdb.firstAirDate !== moreInfo.aired ? tmdb.firstAirDate : null },
                  { label: t("anime.detailFields.tmdbLastAirDate"), value: tmdb?.lastAirDate },
                  { label: t("anime.detailFields.tmdbOriginCountry"), value: tmdb?.originCountry?.length ? tmdb.originCountry.join(", ") : null },
                  { label: t("anime.detailFields.tmdbLanguages"), value: tmdb?.spokenLanguages?.length ? tmdb.spokenLanguages.join(", ") : null },
                  { label: t("anime.detailFields.tmdbCreators"), value: tmdb?.creators?.length ? tmdb.creators.join(", ") : null },
                  { label: t("anime.detailFields.tmdbProduction"), value: tmdb?.production?.length ? tmdb.production.join(", ") : null },
                  { label: t("anime.detailFields.tmdbProductionCountries"), value: tmdb?.productionCountries?.length ? tmdb.productionCountries.join(", ") : null },
                  { label: t("anime.detailFields.tmdbShowType"), value: tmdb?.showType },
                  { label: t("anime.detailFields.tmdbEpisodeRuntime"), value: tmdb?.episodeRuntime ? `${tmdb.episodeRuntime} min` : null },
                  { label: t("anime.detailFields.tmdbNextEpisode"), value: formatTmdbEpisode(tmdb?.nextEpisode) },
                  { label: t("anime.detailFields.tmdbLastEpisode"), value: formatTmdbEpisode(tmdb?.lastEpisode) },
                ].filter((r) => r.value).map((row) => (
                  <div key={row.label} className="rounded-xl bg-muted/30 dark:bg-white/[0.02] border border-border dark:border-white/8 px-4 py-3 hover:border-border dark:border-white/14 transition-colors">
                    <span className="text-[10px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-wider block mb-1">{row.label}</span>
                    <span className="text-[13px] text-foreground/85 dark:text-white/75 font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </OverviewPanel>

            {externalLinks.length > 0 && (
              <OverviewPanel title={t("anime.externalLinks")}>
                <div className="flex flex-wrap gap-2">
                  {externalLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all hover:scale-[1.02] hover:opacity-90", link.color)}
                    >
                      {link.label}
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  ))}
                </div>
              </OverviewPanel>
            )}
          </TabsContent>

          {/* ── Episodes ── */}
          <TabsContent value="episodes" className="mt-6">
            <div className="site-panel p-4 sm:p-5">
              <AnimeEpisodes
                animeId={info.id}
                subOrDub={
                  stats?.episodes?.sub != null
                    ? { sub: stats.episodes.sub, dub: stats.episodes.dub ?? 0 }
                    : undefined
                }
              />
            </div>
          </TabsContent>

          {/* ── Subtitles ── */}
          <TabsContent value="subtitles" className="mt-6">
            <AnimeSubtitles anilistId={info.anilistId} title={info.name} />
          </TabsContent>

          {/* ── Media ── */}
          <TabsContent value="media" className="mt-6">
            <AnimeMediaDownloads anilistId={info.anilistId} hasDub={hasDub} />
          </TabsContent>

          {/* ── Art ── */}
          {hasArtTab && mapImages && (
            <TabsContent value="art" className="mt-6">
              <div className="space-y-10">
                {communityFanartItems.length > 0 && (
                  <ArtSection
                    label={t("anime.artSections.communityFanart")}
                    items={communityFanartItems}
                    wide
                  />
                )}
                {tvdbFanartItems.length > 0 && (
                  <ArtSection
                    label={t("anime.artSections.tvdbFanart")}
                    items={tvdbFanartItems}
                    wide
                  />
                )}
                {(mapImages.artworks?.backgrounds?.length ?? 0) > 0 && (
                  <ArtSection label={t("anime.artSections.backgrounds")} items={mapImages.artworks!.backgrounds} wide />
                )}
                {(mapImages.artworks?.posters?.length ?? 0) > 0 && (
                  <ArtSection label={t("anime.artSections.posters")} items={mapImages.artworks!.posters} />
                )}
                {(mapImages.artworks?.banners?.length ?? 0) > 0 && (
                  <ArtSection label={t("anime.artSections.banners")} items={mapImages.artworks!.banners} wide />
                )}
                {(mapImages.artworks?.clearArt?.length ?? 0) > 0 && (
                  <ArtSection label={t("anime.artSections.clearArt")} items={mapImages.artworks!.clearArt} wide transparent />
                )}
                {(mapImages.artworks?.clearLogo?.length ?? 0) > 0 && (
                  <ArtSection label={t("anime.artSections.clearLogo")} items={mapImages.artworks!.clearLogo} wide transparent />
                )}
                {!(mapImages.artworks?.backgrounds?.length) &&
                  !(mapImages.artworks?.posters?.length) &&
                  !(mapImages.artworks?.banners?.length) && (
                    <div className="space-y-8">
                      {mapImages.fanart && <ArtSection label={t("anime.artSections.fanart")} items={[{ image: mapImages.fanart }]} wide />}
                      {mapImages.banner && <ArtSection label={t("anime.artSections.banner")} items={[{ image: mapImages.banner }]} wide />}
                      {mapImages.poster && <ArtSection label={t("anime.artSections.poster")} items={[{ image: mapImages.poster }]} />}
                    </div>
                  )}
              </div>
            </TabsContent>
          )}

          {/* ── Characters ── */}
          {info.charactersVoiceActors.length > 0 && (
            <TabsContent value="characters" className="mt-6">
              <h3 className="text-[10px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-widest mb-5">{t("anime.charactersAndVa")}</h3>
              <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
                {info.charactersVoiceActors.map((character, idx) => (
                  <CharacterCard key={idx} character={character} className="self-center justify-self-center" />
                ))}
              </div>
            </TabsContent>
          )}

          {/* ── Voice Actors ── */}
          {info.charactersVoiceActors.length > 0 && (
            <TabsContent value="voices" className="mt-6">
              <h3 className="text-[10px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-widest mb-5">{t("anime.voiceActorsAndRoles")}</h3>
              <VoiceActorsPanel characters={info.charactersVoiceActors} />
            </TabsContent>
          )}

          {/* ── Relations ── */}
          {anime.relatedAnimes && anime.relatedAnimes.length > 0 && (
            <TabsContent value="relations" className="mt-6">
              <h3 className="text-[10px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-widest mb-5">{t("anime.relatedSeries")}</h3>
              <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-5">
                {anime.relatedAnimes.map((relation) => (
                  <AnimeCard
                    key={relation.id}
                    title={relation.name}
                    subTitle={relation.jname}
                    poster={relation.poster}
                    className="self-center justify-self-center"
                    href={`${ROUTES.ANIME_DETAILS}/${relation.id}`}
                  />
                ))}
              </div>
            </TabsContent>
          )}

          {/* ── Reviews ── */}
          <TabsContent value="reviews" className="mt-6">
            <div className="site-panel p-5 sm:p-6">
              <AnimeReviews
                animeId={slug}
                animeTitle={info.name}
                poster={info.poster}
                anilistId={typeof anilistId === "number" ? anilistId : undefined}
              />
            </div>
          </TabsContent>

          {/* ── Comments ── */}
          <TabsContent value="comments" className="mt-6">
            <div className="site-panel p-5 sm:p-6">
              <CommentSection
                animeId={info.id}
                episodes={episodesData?.episodes.map((ep) => ({
                  episodeId: ep.episodeId,
                  number: ep.number,
                  title: ep.title,
                }))}
              />
            </div>
          </TabsContent>
        </Tabs>
        </div>

        {anime.recommendedAnimes.length > 0 && (
          <AnimeCarousel anime={anime.recommendedAnimes as IAnime[]} title={t("common.recommended")} className="mt-16" />
        )}
      </Container>
    </div>
  );
}

const MalStatChip = ({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) => {
  const inner = (
  <>
    <span className="text-[10px] font-mono uppercase tracking-wider text-blue-300/70 block">{label}</span>
    <span className="text-sm font-bold tabular-nums text-blue-100">{value}</span>
  </>
  );
  const className =
    "rounded-xl border border-blue-500/20 bg-blue-500/8 px-3 py-2 transition-colors hover:bg-blue-500/12";
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  }
  return <div className={className}>{inner}</div>;
};

const TmdbStatChip = ({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) => {
  const inner = (
    <>
      <span className="text-[10px] font-mono uppercase tracking-wider text-sky-300/70 block">{label}</span>
      <span className="text-sm font-bold tabular-nums text-sky-100">{value}</span>
    </>
  );
  const className =
    "rounded-xl border border-sky-500/20 bg-sky-500/8 px-3 py-2 transition-colors hover:bg-sky-500/12";
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  }
  return <div className={className}>{inner}</div>;
};

function formatTmdbEpisode(
  ep: { episodeNumber: number; name?: string | null; airDate?: string | null } | null | undefined,
): string | null {
  if (!ep?.episodeNumber) return null;
  const parts = [`EP ${ep.episodeNumber}`];
  if (ep.name) parts.push(ep.name);
  if (ep.airDate) parts.push(ep.airDate);
  return parts.join(" · ");
}

const OverviewPanel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="site-panel p-5 sm:p-6">
    <h3 className="text-[10px] font-mono text-muted-foreground dark:text-white/35 uppercase tracking-widest mb-4">{title}</h3>
    {children}
  </section>
);

const ArtSection = ({
  label, items, wide = false, transparent = false,
}: {
  label: string;
  items: { image: string; thumbnail?: string; title?: string; sourceUrl?: string }[];
  wide?: boolean;
  transparent?: boolean;
}) => {
  const t = useT();
  return (
  <div>
    <div className="flex items-center gap-3 mb-4">
      <h3 className="text-[10px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-widest">{label}</h3>
      <span className="text-[10px] font-mono text-muted-foreground/50 dark:text-white/15">{items.length}</span>
    </div>
    <div className={cn("grid gap-3", wide ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5")}>
      {items.map((item, i) => (
        <a
          key={i}
          href={item.sourceUrl ?? item.image}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("group relative rounded-xl overflow-hidden ring-1 ring-white/8 hover:ring-white/25 transition-all block", wide ? "aspect-[16/9]" : "aspect-[2/3]", transparent && "bg-muted/50 dark:bg-white/5")}
        >
          <Image
            src={item.thumbnail ?? item.image}
            alt={item.title ?? `${label} ${i + 1}`}
            fill
            unoptimized
            loading="lazy"
            sizes={wide ? "(max-width: 640px) 100vw, 33vw" : "(max-width: 640px) 50vw, 20vw"}
            className={cn("object-cover transition-transform duration-300 group-hover:scale-105", transparent && "object-contain p-4")}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-muted dark:bg-black/30 transition-colors flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100">
            <span className="text-[11px] font-mono text-foreground/90 dark:text-white/80 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-full border border-border dark:border-white/15 max-w-[90%] truncate">
              {item.title ?? t("anime.fullSize")}
            </span>
          </div>
        </a>
      ))}
    </div>
  </div>
  );
};

function AnimeDetailSkeleton() {
  return (
    <div className="w-full min-h-screen animate-pulse">
      <div className="h-[35vh] sm:h-[42vh] md:h-[58vh] w-full bg-muted/50 dark:bg-white/[0.04]" />
      <Container className="pb-28">
        <div className="flex md:mt-[-14rem] mt-[-3rem] sm:mt-[-4rem] md:flex-row flex-col md:items-end gap-4 sm:gap-6 md:gap-8">
          <div className="shrink-0 self-center md:self-auto w-[130px] sm:w-[160px] md:w-[220px] aspect-[2/3] rounded-2xl bg-muted/60 dark:bg-white/[0.06]" />
          <div className="flex flex-col gap-3 flex-1 min-w-0 pb-4 md:pb-10">
            <div className="h-10 sm:h-12 w-3/4 max-w-md rounded-lg bg-muted/60 dark:bg-white/[0.06]" />
            <div className="h-4 w-1/2 max-w-xs rounded bg-muted/40 dark:bg-white/[0.04]" />
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-7 w-20 rounded-full bg-muted/40 dark:bg-white/[0.04]" />
              ))}
            </div>
            <div className="h-16 w-full max-w-2xl rounded-lg bg-muted/30 dark:bg-white/[0.03]" />
            <div className="flex gap-2 mt-1">
              <div className="h-10 w-28 rounded-xl bg-muted/50 dark:bg-white/[0.05]" />
              <div className="h-10 w-32 rounded-xl bg-muted/40 dark:bg-white/[0.04]" />
            </div>
          </div>
        </div>
        <div className="mt-8 flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 w-24 shrink-0 rounded-lg bg-muted/40 dark:bg-white/[0.04]" />
          ))}
        </div>
        <div className="mt-6 h-64 rounded-xl bg-muted/30 dark:bg-white/[0.03]" />
      </Container>
    </div>
  );
}

const StatPill = ({
  icon, label, gold, teal, purple,
}: {
  icon?: React.ReactNode;
  label: string;
  gold?: boolean;
  teal?: boolean;
  purple?: boolean;
}) => (
  <span className={cn(
    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono border font-medium",
    gold ? "bg-amber-500/10 border-amber-500/20 text-amber-400/80"
      : teal ? "bg-teal-500/10 border-teal-500/20 text-teal-400/80"
      : purple ? "bg-purple-500/10 border-purple-500/20 text-purple-400/80"
      : "bg-muted/50 dark:bg-white/5 border-border dark:border-white/10 text-muted-foreground dark:text-white/45",
  )}>
    {icon}
    {label}
  </span>
);
