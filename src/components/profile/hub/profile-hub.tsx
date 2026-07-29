"use client";

import React, { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ContinueWatching from "@/components/home/continue-watching";
import AnimeLists from "@/components/profile/anime-lists";
import AnimeHeatmap from "@/components/profile/anime-heatmap";
import ProfileBioContent from "@/components/profile/profile-bio-content";
import ProfileHubTabs, { buildDefaultHubTabs } from "@/components/profile/profile-hub-tabs";
import ProfileStatsCards from "@/components/profile/hub/profile-stats-cards";
import ProfileBackToTop from "@/components/profile/profile-back-to-top";
import ProfileLibraryBreakdownBar, {
  type LibrarySegment,
} from "@/components/profile/profile-library-breakdown-bar";
import { useProfileHubData } from "@/hooks/use-profile-hub-data";
import {
  HUB_TAB_TO_STATUS,
  LIST_STATUS_STYLES,
  resolveInitialHubTab,
  syncHubTabToUrl,
  type ProfileActivityItem,
  type ProfileHubTab,
} from "@/lib/profile/hub";
import { deriveFavoriteShowcase } from "@/lib/profile/activity-events";
import type { AnimeAggregate } from "@/lib/history/types";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";
import {
  Activity,
  BookOpen,
  CheckCircle,
  Clock,
  Flame,
  Heart,
  List,
  PauseCircle,
  Pencil,
  Star,
  Trophy,
  UserRound,
  XCircle,
  type LucideIcon,
} from "lucide-react";

type ProfileCounts = {
  watching: number;
  completed: number;
  plan: number;
  onHold: number;
  dropped: number;
};

type Props = {
  username: string;
  isOwn: boolean;
  bio: string | null;
  counts: ProfileCounts;
  showContinue: boolean;
  showAbout: boolean;
  showWatchlist: boolean;
  showActivity: boolean;
  showLibraryStats: boolean;
  showAchievements: boolean;
  onEditBio?: () => void;
  achievementsSlot?: React.ReactNode;
};

const STATUS_META: {
  key: keyof ProfileCounts;
  tab: ProfileHubTab;
  listStatus: string;
  icon: LucideIcon;
  labelKey: string;
}[] = [
  { key: "watching", tab: "watching", listStatus: "watching", icon: Clock, labelKey: "profile.stats.watching" },
  { key: "completed", tab: "completed", listStatus: "completed", icon: CheckCircle, labelKey: "profile.stats.completed" },
  { key: "plan", tab: "planning", listStatus: "plan to watch", icon: BookOpen, labelKey: "profile.stats.planToWatch" },
  { key: "onHold", tab: "overview", listStatus: "on hold", icon: PauseCircle, labelKey: "profile.stats.onHold" },
  { key: "dropped", tab: "dropped", listStatus: "dropped", icon: XCircle, labelKey: "profile.stats.dropped" },
];

function PosterTile({ item, badge }: { item: AnimeAggregate; badge?: React.ReactNode }) {
  return (
    <Link
      href={`/anime/${encodeURIComponent(item.animeId)}`}
      className="group flex flex-col gap-1.5 min-w-0"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.04]">
        {item.poster ? (
          <Image
            src={item.poster}
            alt=""
            fill
            sizes="120px"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground/50">
            —
          </div>
        )}
        {badge && <div className="absolute left-1.5 top-1.5">{badge}</div>}
      </div>
      <p className="line-clamp-2 text-[11px] font-medium leading-snug text-foreground/85 dark:text-white/75">
        {item.title}
      </p>
    </Link>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border dark:border-white/10 py-12 text-center px-4">
      <p className="text-sm font-semibold text-foreground/80 dark:text-white/70">{title}</p>
      <p className="text-xs text-muted-foreground dark:text-white/35 max-w-sm">{desc}</p>
    </div>
  );
}

function ActivityRow({ item, t }: { item: ProfileActivityItem; t: ReturnType<typeof useT> }) {
  const label =
    item.kind === "episode"
      ? t("profile.hub.activityEpisode", { ep: item.episodeNumber ?? "?" })
      : item.kind === "finished"
        ? t("profile.hub.activityFinished")
        : item.kind === "started"
          ? t("profile.hub.activityStarted")
          : item.kind === "favorite"
            ? t("profile.hub.activityFavorited", { score: item.score ?? 0 })
            : item.kind === "rated"
              ? t("profile.hub.activityRated", { score: item.score ?? 0 })
              : item.detail ?? "";

  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50 dark:hover:bg-white/[0.04]"
    >
      <div className="relative h-11 w-8 shrink-0 overflow-hidden rounded-md bg-muted/40 dark:bg-white/[0.06]">
        {item.poster ? (
          <Image src={item.poster} alt="" fill sizes="32px" className="object-cover" unoptimized />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground/90 dark:text-white/80">{item.title}</p>
        <p className="text-[11px] text-muted-foreground dark:text-white/40">{label}</p>
      </div>
      <span className="shrink-0 text-[10px] font-mono text-muted-foreground/70 dark:text-white/30">
        {item.relative}
      </span>
    </Link>
  );
}

function SectionLabel({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.04] text-muted-foreground dark:text-white/45">
        {icon}
      </span>
      <h2 className="text-base font-bold text-foreground/90 dark:text-white/80">{title}</h2>
      {count != null && (
        <span className="rounded-full bg-muted dark:bg-white/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground dark:text-white/50">
          {count}
        </span>
      )}
    </div>
  );
}

export default function ProfileHub({
  username,
  isOwn,
  bio,
  counts,
  showContinue,
  showAbout,
  showWatchlist,
  showActivity,
  showLibraryStats,
  showAchievements,
  onEditBio,
  achievementsSlot,
}: Props) {
  const t = useT();
  const [activeTab, setActiveTab] = useState<ProfileHubTab>(() => resolveInitialHubTab());
  const hub = useProfileHubData(username, isOwn);

  const handleTabChange = useCallback((tab: ProfileHubTab) => {
    setActiveTab(tab);
    syncHubTabToUrl(tab);
  }, []);

  const hubTabs = useMemo(() => {
    const all = buildDefaultHubTabs(t, {
      watching: counts.watching,
      completed: counts.completed,
      plan: counts.plan,
      dropped: counts.dropped,
      favorites: hub.favorites.length,
      reviews: hub.reviews.length,
    });
    return all.filter((tab) => {
      if (
        tab.id === "watching" ||
        tab.id === "completed" ||
        tab.id === "planning" ||
        tab.id === "dropped"
      ) {
        return showWatchlist;
      }
      if (tab.id === "activity") return showActivity;
      return true;
    });
  }, [t, counts, hub.favorites.length, hub.reviews.length, showWatchlist, showActivity]);

  // If URL tab is hidden by section settings, fall back to overview.
  React.useEffect(() => {
    if (!hubTabs.some((t) => t.id === activeTab)) {
      handleTabChange("overview");
    }
  }, [hubTabs, activeTab, handleTabChange]);

  const totalAnime =
    counts.watching + counts.completed + counts.plan + counts.onHold + counts.dropped;

  const librarySegments: LibrarySegment[] = STATUS_META.map((s) => ({
    key: s.key,
    count: counts[s.key],
    color: LIST_STATUS_STYLES[s.key]?.bar ?? "bg-muted",
    label: t(s.labelKey),
  }));

  const showcase = useMemo(
    () => deriveFavoriteShowcase(hub.aggregates),
    [hub.aggregates],
  );

  const unlockedMilestones = hub.milestones.filter((m) => m.unlocked);

  return (
    <div className="min-w-0">
      <ProfileHubTabs tabs={hubTabs} active={activeTab} onChange={handleTabChange} />

      {activeTab === "overview" && (
        <div className="flex flex-col gap-8">
          {showContinue && isOwn && (
            <section>
              <SectionLabel
                icon={<Clock className="h-4 w-4" />}
                title={t("profile.hub.continueWatching")}
              />
              <ContinueWatching loading={false} />
            </section>
          )}

          {(isOwn || hub.stats.totalEpisodes > 0 || totalAnime > 0) && (
            <section>
              <SectionLabel
                icon={<List className="h-4 w-4" />}
                title={t("profile.hub.sideStats")}
              />
              <ProfileStatsCards
                stats={hub.stats}
                counts={counts}
                streak={hub.stats.currentStreak || hub.streaks.current}
                loading={hub.loading}
              />
            </section>
          )}

          {showAbout && (
            <section>
              <SectionLabel icon={<UserRound className="h-4 w-4" />} title={t("profile.aboutMe")} />
              <div className="site-panel p-5">
                {bio ? (
                  <ProfileBioContent bio={bio} />
                ) : isOwn ? (
                  <div className="flex flex-col items-center gap-4 py-2 text-center sm:flex-row sm:text-left">
                    <p className="flex-1 text-sm text-muted-foreground/70 dark:text-white/30">
                      {t("profile.noBioOwn")}
                    </p>
                    {onEditBio && (
                      <button
                        type="button"
                        onClick={onEditBio}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-primary/20"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {t("profile.addBioCta")}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm italic text-muted-foreground/70 dark:text-white/30">
                    {t("profile.noBio")}
                  </p>
                )}
              </div>
            </section>
          )}

          {showLibraryStats && (
            <section className="site-panel p-5">
              <SectionLabel icon={<List className="h-4 w-4" />} title={t("profile.libraryStats")} />
              <ProfileLibraryBreakdownBar segments={librarySegments} total={totalAnime} />
              <div className="mt-2 flex flex-col divide-y divide-border dark:divide-white/6">
                {STATUS_META.filter((s) => s.tab !== "overview" || s.key === "onHold").map((s) => {
                  const Icon = s.icon;
                  const jumpTab = s.key === "onHold" ? "watching" : s.tab;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => handleTabChange(jumpTab)}
                      className="flex w-full items-center justify-between py-2.5 text-left text-sm text-muted-foreground dark:text-white/50 hover:text-foreground dark:hover:text-white/80"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Icon className={cn("h-4 w-4", LIST_STATUS_STYLES[s.key]?.icon)} />
                        {t(s.labelKey)}
                      </span>
                      <span className="font-bold tabular-nums text-foreground/80 dark:text-white/70">
                        {counts[s.key]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {showAchievements && achievementsSlot}
        </div>
      )}

      {showWatchlist &&
        (activeTab === "watching" ||
          activeTab === "completed" ||
          activeTab === "planning" ||
          activeTab === "dropped") && (
          <section>
            <SectionLabel
              icon={<List className="h-4 w-4" />}
              title={t(`profile.hub.${activeTab}`)}
              count={
                activeTab === "watching"
                  ? counts.watching
                  : activeTab === "completed"
                    ? counts.completed
                    : activeTab === "planning"
                      ? counts.plan
                      : counts.dropped
              }
            />
            <AnimeLists
              status={HUB_TAB_TO_STATUS[activeTab]}
              username={username}
              isOwn={isOwn}
            />
          </section>
        )}

      {activeTab === "favorites" && (
        <section className="flex flex-col gap-8">
          <div>
            <SectionLabel
              icon={<Heart className="h-4 w-4" />}
              title={t("profile.hub.showcaseAnime")}
              count={showcase.anime.length}
            />
            {showcase.anime.length === 0 ? (
              <EmptyState
                title={t("profile.hub.emptyFavorites")}
                desc={t("profile.hub.emptyFavoritesDesc")}
              />
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {showcase.anime.map((a) => (
                  <PosterTile
                    key={a.animeId}
                    item={a}
                    badge={
                      a.score != null ? (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                          <Star className="h-2.5 w-2.5 fill-current" />
                          {a.score}
                        </span>
                      ) : null
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {showcase.movies.length > 0 && (
            <div>
              <SectionLabel
                icon={<Heart className="h-4 w-4" />}
                title={t("profile.hub.showcaseMovies")}
                count={showcase.movies.length}
              />
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {showcase.movies.map((a) => (
                  <PosterTile key={a.animeId} item={a} />
                ))}
              </div>
            </div>
          )}

          {showcase.studios.length > 0 && (
            <div>
              <SectionLabel
                icon={<Trophy className="h-4 w-4" />}
                title={t("profile.hub.showcaseStudios")}
              />
              <div className="flex flex-wrap gap-2">
                {showcase.studios.map((s) => (
                  <span
                    key={s.name}
                    className="rounded-lg border border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.03] px-2.5 py-1 text-xs text-foreground/80 dark:text-white/70"
                  >
                    {s.name}{" "}
                    <span className="font-mono text-muted-foreground dark:text-white/35">
                      ×{s.count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === "reviews" && (
        <section>
          <SectionLabel
            icon={<Star className="h-4 w-4" />}
            title={t("profile.hub.reviews")}
            count={hub.reviews.length}
          />
          {hub.reviews.length === 0 ? (
            <EmptyState
              title={t("profile.hub.emptyReviews")}
              desc={t("profile.hub.emptyReviewsDesc")}
            />
          ) : (
            <div className="flex flex-col divide-y divide-border dark:divide-white/6">
              {hub.reviews.map((a) => (
                <Link
                  key={a.animeId}
                  href={`/anime/${encodeURIComponent(a.animeId)}`}
                  className="flex items-center gap-3 py-3 transition-colors hover:bg-accent/40 dark:hover:bg-white/[0.03] px-1 rounded-lg"
                >
                  <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-muted/40">
                    {a.poster ? (
                      <Image src={a.poster} alt="" fill sizes="40px" className="object-cover" unoptimized />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground dark:text-white/85">
                      {a.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground dark:text-white/40">
                      {a.status ?? "—"}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-sm font-bold text-amber-300">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {a.score}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "activity" && showActivity && (
        <div className="flex flex-col gap-8">
          <section>
            <SectionLabel
              icon={<Activity className="h-4 w-4" />}
              title={t("profile.hub.heatmapTitle")}
            />
            <div className="site-panel p-5">
              <AnimeHeatmap username={username} />
            </div>
          </section>

          <section>
            <SectionLabel
              icon={<Clock className="h-4 w-4" />}
              title={t("profile.hub.activity")}
            />
            {hub.activity.length === 0 ? (
              <EmptyState
                title={t("profile.hub.emptyActivity")}
                desc={
                  isOwn
                    ? t("profile.hub.emptyActivityDesc")
                    : t("profile.hub.emptyStatsPublic")
                }
              />
            ) : (
              <div className="site-panel divide-y divide-border dark:divide-white/6 p-2">
                {hub.activity.slice(0, 40).map((item) => (
                  <ActivityRow key={item.id} item={item} t={t} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === "statistics" && (
        <div className="flex flex-col gap-8">
          {!isOwn && hub.episodes.length === 0 && hub.aggregates.length === 0 && !hub.loading ? (
            <EmptyState
              title={t("profile.hub.emptyStats")}
              desc={t("profile.hub.emptyStatsPublic")}
            />
          ) : (
            <>
              <ProfileStatsCards
                stats={hub.stats}
                counts={counts}
                streak={hub.stats.currentStreak || hub.streaks.current}
                loading={hub.loading}
              />

              {showLibraryStats && (
                <div className="site-panel p-5">
                  <SectionLabel
                    icon={<List className="h-4 w-4" />}
                    title={t("profile.hub.libraryBreakdown")}
                  />
                  <ProfileLibraryBreakdownBar segments={librarySegments} total={totalAnime} />
                </div>
              )}

              {(unlockedMilestones.length > 0 || hub.milestones.length > 0) && isOwn && (
                <div className="site-panel p-5">
                  <SectionLabel
                    icon={<Flame className="h-4 w-4" />}
                    title={t("profile.hub.milestones")}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    {hub.milestones.map((m) => (
                      <div
                        key={m.id}
                        className={cn(
                          "rounded-xl border px-3 py-2.5",
                          m.unlocked
                            ? "border-amber-400/25 bg-amber-500/10"
                            : "border-border dark:border-white/8 bg-muted/20 dark:bg-white/[0.02]",
                        )}
                      >
                        <p className="text-xs font-semibold text-foreground/85 dark:text-white/75">
                          {m.id.replace(/_/g, " ")}
                        </p>
                        <p className="mt-1 text-[11px] font-mono text-muted-foreground dark:text-white/40">
                          {m.progress}/{m.target}
                          {m.unlocked ? ` · ${t("profile.hub.milestoneUnlocked")}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hub.stats.genreDist.length > 0 && (
                <div className="site-panel p-5">
                  <SectionLabel
                    icon={<Trophy className="h-4 w-4" />}
                    title={t("profile.hub.statsFavGenre")}
                  />
                  <div className="flex flex-wrap gap-2">
                    {hub.stats.genreDist.slice(0, 12).map((g) => (
                      <span
                        key={g.label}
                        className="rounded-lg border border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.03] px-2.5 py-1 text-xs text-foreground/80 dark:text-white/70"
                      >
                        {g.label}{" "}
                        <span className="font-mono text-muted-foreground dark:text-white/35">
                          ×{g.count}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <ProfileBackToTop />
    </div>
  );
}
