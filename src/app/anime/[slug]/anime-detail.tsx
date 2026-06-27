"use client";
import React, { useState } from "react";
import Image from "next/image";

import Container from "@/components/container";
import AnimeCard from "@/components/anime-card";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import WatchButton from "@/components/watch-button";
import { IAnime } from "@/types/anime";
import AnimeCarousel from "@/components/anime-carousel";
import AnimeEpisodes from "@/components/anime-episodes";
import CharacterCard from "@/components/common/character-card";
import { ROUTES } from "@/constants/routes";
import Select from "@/components/common/select";
import {
  ExternalLink,
  Film,
  Heart,
  Radio,
  Star,
} from "lucide-react";
import { useGetAnimeDetails } from "@/query/get-anime-details";
import Loading from "@/app/loading";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import useBookMarks from "@/hooks/use-get-bookmark";
import { useGetAnimeBanner } from "@/query/get-banner-anime";
import { useGetAnimeMappings } from "@/query/get-anime-mappings";
import { useGetAllEpisodes } from "@/query/get-all-episodes";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useT } from "@/providers/i18n-provider";
import { useBookmarkLabels } from "@/hooks/use-bookmark-labels";

const WatchTrailer = dynamic(() => import("@/components/watch-trailer"), { ssr: false });
const CommentSection = dynamic(() => import("@/components/comment-section"), {
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-white/[0.04] border border-white/8" />,
});
const AnimeSubtitles = dynamic(() => import("@/components/anime-subtitles"), {
  loading: () => <div className="h-40 animate-pulse rounded-xl bg-white/[0.04] border border-white/8" />,
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

export default function AnimeDetail({ slug }: { slug: string }) {
  const t = useT();
  const bookmarkOptions = useBookmarkLabels();
  const { data: anime, isLoading } = useGetAnimeDetails(slug);
  const { auth } = useAuthStore();
  const { bookmarks, createOrUpdateBookMark } = useBookMarks({
    animeID: slug,
    page: 1,
    per_page: 1,
  });
  const [selected, setSelected] = useState(bookmarks?.[0]?.status || "");

  const anilistId = anime?.anime.info.anilistId;

  const { data: banner } = useGetAnimeBanner(anilistId!);
  const { data: mappingData } = useGetAnimeMappings(anilistId);
  const { data: episodesData } = useGetAllEpisodes(slug);

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

  if (isLoading || !anime) return <Loading />;

  const info     = anime.anime.info;
  const moreInfo = anime.anime.moreInfo;
  const stats    = info.stats;
  const hasDub   = (stats?.episodes?.dub ?? 0) > 0;
  const isAiring = moreInfo.status === "Currently Airing";

  const mappings  = mappingData?.mappings;
  const mapImages = mappingData?.images;

  const bannerSrc =
    mapImages?.fanart ||
    (banner?.Media.bannerImage as string | undefined) ||
    info.poster;

  const externalLinks: { label: string; url: string; color: string }[] = [];
  if (info.anilistId)           externalLinks.push({ ...DB_LINKS[0], url: DB_LINKS[0].url(info.anilistId) });
  if (mappings?.mal_id)         externalLinks.push({ ...DB_LINKS[1], url: DB_LINKS[1].url(mappings.mal_id) });
  if (mappings?.anidb_id)       externalLinks.push({ ...DB_LINKS[2], url: DB_LINKS[2].url(mappings.anidb_id) });
  if (mappings?.thetvdb_id)     externalLinks.push({ ...DB_LINKS[3], url: DB_LINKS[3].url(mappings.thetvdb_id) });
  if (mappings?.themoviedb_id)  externalLinks.push({ ...DB_LINKS[4], url: DB_LINKS[4].url(mappings.themoviedb_id) });
  if (mappings?.kitsu_id)       externalLinks.push({ ...DB_LINKS[5], url: DB_LINKS[5].url(mappings.kitsu_id) });
  if (mappings?.animeplanet_id) externalLinks.push({ ...DB_LINKS[6], url: DB_LINKS[6].url(mappings.animeplanet_id) });
  if (mappings?.imdb_id)        externalLinks.push({ ...DB_LINKS[7], url: DB_LINKS[7].url(mappings.imdb_id) });

  return (
    <div className="w-full min-h-screen">
      {/* ── Banner ── */}
      <div className="h-[35vh] sm:h-[42vh] md:h-[58vh] w-full relative">
        <Image
          src={bannerSrc}
          alt={info.name}
          fill
          className="object-cover object-top"
          unoptimized
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />
        <WatchTrailer videoHref={info.promotionalVideos[0]?.source} />
      </div>

      <Container className="pb-28">
        {/* ── Hero ── */}
        <div className="flex md:mt-[-14rem] mt-[-3rem] sm:mt-[-4rem] md:flex-row flex-col md:items-end gap-4 sm:gap-6 md:gap-8">
          {/* Poster: smaller on mobile, full-size on md+ */}
          <div className="shrink-0 relative self-center md:self-auto">
            <AnimeCard
              title={info.name}
              poster={info.poster}
              href={`${ROUTES.ANIME_DETAILS}/${info.id}`}
              displayDetails={false}
              variant="lg"
              className="shadow-[0_32px_80px_rgba(0,0,0,0.9)] ring-1 ring-white/8 w-[130px] sm:w-[160px] md:w-auto"
            />
            {isAiring && (
              <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-emerald-500 text-black text-[9px] font-black px-2 py-1 rounded-full shadow-lg shadow-emerald-500/30">
                <Radio className="w-2.5 h-2.5" />
                {t("anime.airing")}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2.5 sm:gap-3 pb-4 md:pb-10 min-w-0 flex-1">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-white leading-tight tracking-tight">
                {info.name}
              </h1>
              {moreInfo.japanese && (
                <p className="text-xs sm:text-sm text-white/30 mt-1 font-mono">{moreInfo.japanese}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {stats?.rating && (
                <StatPill icon={<Star className="w-3 h-3 fill-current" />} label={stats.rating} gold />
              )}
              {stats?.type && <StatPill icon={<Film className="w-3 h-3" />} label={stats.type} />}
              {stats?.episodes?.sub !== undefined && (
                <StatPill label={`${stats.episodes.sub} ${t("card.sub")}`} />
              )}
              {hasDub && (
                <StatPill label={`${stats!.episodes!.dub} ${t("card.dub")}`} purple />
              )}
              {(moreInfo as any)?.duration && (
                <StatPill label={(moreInfo as any).duration} />
              )}
              {moreInfo?.status && !isAiring && <StatPill label={moreInfo.status} />}
              {moreInfo?.premiered && <StatPill label={moreInfo.premiered} />}
            </div>

            {moreInfo?.genres && (moreInfo.genres as string[]).length > 0 && (
              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                {(moreInfo.genres as string[]).map((g) => (
                  <span
                    key={g}
                    className="px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] rounded-full border border-white/10 text-white/40 bg-white/4 hover:bg-white/8 hover:text-white/60 transition-colors cursor-default"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {info.description && (
              <p className="text-[12px] sm:text-[13px] text-white/45 leading-relaxed line-clamp-3 md:line-clamp-4 max-w-2xl">
                {info.description}
              </p>
            )}

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap mt-1">
              <WatchButton />
              {auth && (
                <Select
                  placeholder={t("anime.addToList")}
                  value={bookmarks?.[0]?.status || selected}
                  options={bookmarkOptions}
                  onChange={handleSelect}
                  placeholderIcon={Heart}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="overview" className="w-full mt-6 sm:mt-10">
          <TabsList className="flex items-center justify-start w-full sm:w-fit h-fit bg-transparent border-b border-white/8 rounded-none gap-0 px-0 pb-0 overflow-x-auto scrollbar-hide">
            {[
              { value: "overview", label: t("anime.tabs.overview") },
              { value: "episodes", label: t("anime.tabs.episodes") },
              { value: "subtitles", label: t("anime.tabs.subtitles") },
              ...(mapImages ? [{ value: "art", label: t("anime.tabs.art") }] : []),
              ...(info.charactersVoiceActors.length > 0
                ? [{ value: "characters", label: t("anime.tabs.characters") }]
                : []),
              ...(anime.seasons.length > 0
                ? [{ value: "relations", label: t("anime.tabs.relations") }]
                : []),
              { value: "comments", label: t("anime.tabs.comments") },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-sm font-semibold px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:text-white data-[state=active]:bg-transparent text-white/35 hover:text-white/65 transition-all bg-transparent whitespace-nowrap"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="mt-8 space-y-8">
            <div>
              <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-4">{t("anime.synopsis")}</h3>
              <p className="text-sm text-white/60 leading-8">{info.description}</p>
            </div>

            {moreInfo.synonyms && (
              <div>
                <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-3">{t("anime.alternativeTitles")}</h3>
                <div className="flex flex-wrap gap-2">
                  {moreInfo.japanese && (
                    <span className="px-3 py-1.5 text-[12px] rounded-lg border border-white/10 text-white/55 bg-white/4">
                      {moreInfo.japanese}
                    </span>
                  )}
                  {String(moreInfo.synonyms).split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
                    <span key={s} className="px-3 py-1.5 text-[12px] rounded-lg border border-white/8 text-white/40 bg-white/[0.02]">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {moreInfo.studios && (
              <div>
                <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-3">{t("anime.studios")}</h3>
                <div className="flex flex-wrap gap-2">
                  {String(moreInfo.studios).split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
                    <span key={s} className="px-3 py-1.5 text-[12px] rounded-lg border border-white/12 text-white/65 bg-white/5 font-medium">{s}</span>
                  ))}
                  {moreInfo.producers?.map((p) => (
                    <span key={p} className="px-3 py-1.5 text-[12px] rounded-lg border border-white/8 text-white/35 bg-white/[0.02]">{p}</span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-3">{t("anime.details")}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[
                  { label: t("anime.detailFields.type"), value: stats?.type },
                  { label: t("anime.detailFields.episodes"), value: stats?.episodes?.sub },
                  { label: t("anime.detailFields.duration"), value: (moreInfo as any).duration },
                  { label: t("anime.detailFields.status"), value: moreInfo.status },
                  { label: t("anime.detailFields.aired"), value: moreInfo.aired },
                  { label: t("anime.detailFields.premiered"), value: moreInfo.premiered },
                  { label: t("anime.detailFields.score"), value: moreInfo.malscore },
                  { label: t("anime.detailFields.rating"), value: stats?.rating },
                ].filter((r) => r.value).map((row) => (
                  <div key={row.label} className="rounded-xl bg-white/3 border border-white/6 px-4 py-3">
                    <span className="text-[10px] font-mono text-white/25 uppercase tracking-wider block mb-1">{row.label}</span>
                    <span className="text-[13px] text-white/70 font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {externalLinks.length > 0 && (
              <div>
                <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-3">{t("anime.externalLinks")}</h3>
                <div className="flex flex-wrap gap-2">
                  {externalLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all hover:opacity-80", link.color)}
                    >
                      {link.label}
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Episodes ── */}
          <TabsContent value="episodes" className="mt-6">
            <AnimeEpisodes animeId={info.id} />
          </TabsContent>

          {/* ── Subtitles ── */}
          <TabsContent value="subtitles" className="mt-6">
            <AnimeSubtitles anilistId={info.anilistId} />
          </TabsContent>

          {/* ── Art ── */}
          {mapImages && Object.values(mapImages).some(Boolean) && (
            <TabsContent value="art" className="mt-6">
              <div className="space-y-10">
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
              <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-5">{t("anime.charactersAndVa")}</h3>
              <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
                {info.charactersVoiceActors.map((character, idx) => (
                  <CharacterCard key={idx} character={character} className="self-center justify-self-center" />
                ))}
              </div>
            </TabsContent>
          )}

          {/* ── Relations ── */}
          {anime.seasons.length > 0 && (
            <TabsContent value="relations" className="mt-6">
              <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-5">{t("anime.relatedSeries")}</h3>
              <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-5">
                {anime.seasons.map((relation, idx) =>
                  !relation.isCurrent && (
                    <AnimeCard
                      key={idx}
                      title={relation.name}
                      subTitle={relation.title}
                      poster={relation.poster}
                      className="self-center justify-self-center"
                      href={`${ROUTES.ANIME_DETAILS}/${relation.id}`}
                    />
                  ),
                )}
              </div>
            </TabsContent>
          )}

          {/* ── Comments ── */}
          <TabsContent value="comments" className="mt-6">
            <div className="rounded-xl border border-white/8 bg-[#080808] p-5">
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

        {anime.recommendedAnimes.length > 0 && (
          <AnimeCarousel anime={anime.recommendedAnimes as IAnime[]} title={t("common.recommended")} className="mt-16" />
        )}
      </Container>
    </div>
  );
}

const ArtSection = ({
  label, items, wide = false, transparent = false,
}: {
  label: string;
  items: { image: string; thumbnail?: string }[];
  wide?: boolean;
  transparent?: boolean;
}) => {
  const t = useT();
  return (
  <div>
    <div className="flex items-center gap-3 mb-4">
      <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{label}</h3>
      <span className="text-[10px] font-mono text-white/15">{items.length}</span>
    </div>
    <div className={cn("grid gap-3", wide ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5")}>
      {items.map((item, i) => (
        <a
          key={i}
          href={item.image}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("group relative rounded-xl overflow-hidden ring-1 ring-white/8 hover:ring-white/25 transition-all block", transparent && "bg-white/5")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.thumbnail ?? item.image}
            alt={`${label} ${i + 1}`}
            className={cn("w-full object-cover transition-transform duration-300 group-hover:scale-105", wide ? "aspect-[16/9]" : "aspect-[2/3]", transparent && "object-contain p-4")}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100">
            <span className="text-[11px] font-mono text-white/80 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/15">{t("anime.fullSize")}</span>
          </div>
        </a>
      ))}
    </div>
  </div>
  );
};

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
    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono border font-medium",
    gold ? "bg-amber-500/10 border-amber-500/20 text-amber-400/80"
      : teal ? "bg-teal-500/10 border-teal-500/20 text-teal-400/80"
      : purple ? "bg-purple-500/10 border-purple-500/20 text-purple-400/80"
      : "bg-white/5 border-white/10 text-white/45",
  )}>
    {icon}
    {label}
  </span>
);
