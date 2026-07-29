"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AnimeQuickNav from "@/components/anime/anime-quick-nav";
import AniListRichText from "@/components/anime/anilist-rich-text";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import VoiceActorCreditCard from "@/components/voice-actor/voice-actor-credit-card";
import { cn } from "@/lib/core/utils";
import {
  formatVaBirthday,
  mergeVaRoles,
  VA_MAX_MEDIA_PAGES,
  VA_MEDIA_CATEGORY_ORDER,
  VA_ROLE_KEY_ORDER,
  type VaFuzzyDate,
  type VaMediaCategory,
  type VaRole,
  type VaRoleKey,
} from "@/lib/core/voice-actors";
import { useT } from "@/providers/i18n-provider";
import { ExternalLink, Loader2 } from "lucide-react";

const REVEAL_PAGE = 36;
const FETCH_BATCH = 3;

type Profile = {
  id: number;
  name: string;
  native: string | null;
  description: string | null;
  home: string | null;
  gender: string | null;
  age: number | null;
  birthday: VaFuzzyDate | null;
  favourites: number | null;
  siteUrl: string | null;
  language: string | null;
  primaryOccupations: string[];
};

type Props = {
  profile: Profile;
  initialRoles: VaRole[];
  initialPage: number;
  initialHasNextPage: boolean;
};

type CategoryTab = "overview" | "all" | VaMediaCategory;
type RoleFilter = "all" | VaRoleKey;

type FilmographyPageResult = {
  roles: VaRole[];
  page: number;
  hasNextPage: boolean;
};

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70 dark:text-white/30">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground/85 dark:text-white/75">{value}</dd>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.03] px-4 py-3">
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70 dark:text-white/30">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold tabular-nums text-foreground dark:text-white">{value}</p>
    </div>
  );
}

export default function VoiceActorDetailClient({
  profile,
  initialRoles,
  initialPage,
  initialHasNextPage,
}: Props) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [roles, setRoles] = useState(initialRoles);
  const [isHydrating, setIsHydrating] = useState(initialHasNextPage);
  const [fetchError, setFetchError] = useState(false);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [visible, setVisible] = useState(REVEAL_PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchedPagesRef = useRef(new Set<number>([initialPage]));
  const pageCacheRef = useRef(new Map<number, FilmographyPageResult>());
  const inflightRef = useRef(new Map<number, Promise<FilmographyPageResult>>());

  const tabFromUrl = searchParams.get("tab") ?? "overview";
  const activeTab: CategoryTab = useMemo(() => {
    const valid = new Set<string>(["overview", "all", ...VA_MEDIA_CATEGORY_ORDER]);
    return valid.has(tabFromUrl) ? (tabFromUrl as CategoryTab) : "overview";
  }, [tabFromUrl]);

  useEffect(() => {
    let cancelled = false;
    fetchedPagesRef.current = new Set([initialPage]);
    pageCacheRef.current = new Map();
    inflightRef.current = new Map();
    setRoles(initialRoles);
    setIsHydrating(initialHasNextPage);
    setFetchError(false);

    const fetchPage = (page: number): Promise<FilmographyPageResult> => {
      const cached = pageCacheRef.current.get(page);
      if (cached) return Promise.resolve(cached);

      const existing = inflightRef.current.get(page);
      if (existing) return existing;

      const promise = (async () => {
        const res = await fetch(`/api/voice-actors/${profile.id}/filmography?page=${page}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          roles?: VaRole[];
          page?: number;
          hasNextPage?: boolean;
        };
        const result: FilmographyPageResult = {
          roles: data.roles ?? [],
          page: data.page ?? page,
          hasNextPage: Boolean(data.hasNextPage),
        };
        pageCacheRef.current.set(page, result);
        pageCacheRef.current.set(result.page, result);
        fetchedPagesRef.current.add(result.page);
        return result;
      })();

      inflightRef.current.set(page, promise);
      return promise.finally(() => {
        inflightRef.current.delete(page);
      });
    };

    async function hydrate() {
      if (!initialHasNextPage) {
        setIsHydrating(false);
        return;
      }

      let page = initialPage;
      let hasNext: boolean = initialHasNextPage;

      try {
        while (!cancelled && hasNext && page < VA_MAX_MEDIA_PAGES) {
          const batch: number[] = [];
          for (let i = 1; i <= FETCH_BATCH && page + i <= VA_MAX_MEDIA_PAGES; i++) {
            const p = page + i;
            if (!fetchedPagesRef.current.has(p) && !pageCacheRef.current.has(p)) {
              batch.push(p);
            }
          }
          if (batch.length === 0) break;

          const results = await Promise.all(batch.map((p) => fetchPage(p)));
          if (cancelled) return;

          results.sort((a, b) => a.page - b.page);
          const incoming: VaRole[] = [];
          hasNext = true;
          for (const result of results) {
            incoming.push(...result.roles);
            page = result.page;
            if (!result.hasNextPage) {
              hasNext = false;
              break;
            }
          }
          setRoles((prev) => mergeVaRoles(prev, incoming));
          hasNext = hasNext && page < VA_MAX_MEDIA_PAGES;
        }
      } catch {
        if (!cancelled) setFetchError(true);
      } finally {
        if (!cancelled) setIsHydrating(false);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [profile.id, initialRoles, initialPage, initialHasNextPage]);

  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(VA_MEDIA_CATEGORY_ORDER.map((c) => [c, 0])) as Record<
      VaMediaCategory,
      number
    >;
    for (const role of roles) counts[role.anime.category] += 1;
    return counts;
  }, [roles]);

  const roleCounts = useMemo(() => {
    const counts = Object.fromEntries(VA_ROLE_KEY_ORDER.map((k) => [k, 0])) as Record<
      VaRoleKey,
      number
    >;
    for (const role of roles) counts[role.roleKey] += 1;
    return counts;
  }, [roles]);

  const years = useMemo(() => {
    const ys = roles.map((r) => r.anime.year).filter((y): y is number => typeof y === "number");
    if (ys.length === 0) return { first: null as number | null, latest: null as number | null };
    return { first: Math.min(...ys), latest: Math.max(...ys) };
  }, [roles]);

  const tabItems = useMemo(() => {
    const items: Array<{ value: string; label: string; badge?: number | string }> = [
      { value: "overview", label: t("voiceActor.tabs.overview") },
      {
        value: "all",
        label: t("voiceActor.tabs.all"),
        badge: isHydrating ? `${roles.length}+` : roles.length || undefined,
      },
    ];
    for (const cat of VA_MEDIA_CATEGORY_ORDER) {
      const count = categoryCounts[cat];
      if (count <= 0) continue;
      items.push({
        value: cat,
        label: t(`voiceActor.tabs.${cat}` as "voiceActor.tabs.tv"),
        badge: count,
      });
    }
    return items;
  }, [t, roles.length, categoryCounts, isHydrating]);

  useEffect(() => {
    if (activeTab === "overview" || activeTab === "all") return;
    if (categoryCounts[activeTab] > 0) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tab");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [activeTab, categoryCounts, router, searchParams]);

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "overview") params.delete("tab");
    else params.set("tab", value);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
    setRoleFilter("all");
    setVisible(REVEAL_PAGE);
    requestAnimationFrame(() => {
      const el = document.getElementById("va-tabs-panel");
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nav =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--nav-total-height"),
        ) || 64;
      // Sticky tabs already in view — avoid bounce-back on every tab click.
      if (rect.top <= nav + 12 && rect.bottom > nav + 96) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const filteredRoles = useMemo(() => {
    let list = roles;
    if (activeTab !== "overview" && activeTab !== "all") {
      list = list.filter((r) => r.anime.category === activeTab);
    }
    if (roleFilter !== "all") {
      list = list.filter((r) => r.roleKey === roleFilter);
    }
    return list;
  }, [roles, activeTab, roleFilter]);

  const roleChips = useMemo(() => {
    const source =
      activeTab === "overview" || activeTab === "all"
        ? roles
        : roles.filter((r) => r.anime.category === activeTab);
    const present = new Set(source.map((r) => r.roleKey));
    return VA_ROLE_KEY_ORDER.filter((k) => present.has(k));
  }, [roles, activeTab]);

  useEffect(() => {
    setVisible(REVEAL_PAGE);
  }, [activeTab, roleFilter]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (visible >= filteredRoles.length) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible((prev) => Math.min(prev + REVEAL_PAGE, filteredRoles.length));
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, filteredRoles.length, activeTab, roleFilter]);

  const birthday = formatVaBirthday(profile.birthday);
  const shown = activeTab === "overview" ? [] : filteredRoles.slice(0, visible);
  const hasMoreVisible = activeTab !== "overview" && visible < filteredRoles.length;

  const overviewMeta: Array<{ label: string; value: string }> = [];
  if (profile.native) overviewMeta.push({ label: t("voiceActor.fields.native"), value: profile.native });
  if (birthday) overviewMeta.push({ label: t("voiceActor.fields.birthday"), value: birthday });
  if (profile.age != null) overviewMeta.push({ label: t("voiceActor.fields.age"), value: String(profile.age) });
  if (profile.gender) overviewMeta.push({ label: t("voiceActor.fields.gender"), value: profile.gender });
  if (profile.home) overviewMeta.push({ label: t("voiceActor.fields.home"), value: profile.home });
  if (profile.language) overviewMeta.push({ label: t("voiceActor.fields.language"), value: profile.language });
  if (profile.favourites != null && profile.favourites > 0) {
    overviewMeta.push({
      label: t("voiceActor.fields.favourites"),
      value: profile.favourites.toLocaleString(),
    });
  }
  if (profile.primaryOccupations.length > 0) {
    overviewMeta.push({
      label: t("voiceActor.fields.occupations"),
      value: profile.primaryOccupations.join(", "),
    });
  }

  const allChipCount =
    activeTab === "all" || activeTab === "overview"
      ? roles.length
      : categoryCounts[activeTab as VaMediaCategory] ?? 0;

  const creditsPanel = activeTab === "overview" ? null : (
    <div className="space-y-5">
      {roleChips.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            type="button"
            onClick={() => setRoleFilter("all")}
            className={cn("site-chip snap-start shrink-0", roleFilter === "all" && "site-chip-active")}
          >
            {t("voiceActor.roles.all")}
            <span className="ml-0.5 text-[9px] font-mono opacity-70">{allChipCount}</span>
          </button>
          {roleChips.map((key) => {
            const count =
              activeTab === "all"
                ? roleCounts[key]
                : roles.filter((r) => r.anime.category === activeTab && r.roleKey === key).length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setRoleFilter(key)}
                className={cn("site-chip snap-start shrink-0", roleFilter === key && "site-chip-active")}
              >
                {t(`voiceActor.roles.${key}` as "voiceActor.roles.main")}
                <span className="ml-0.5 text-[9px] font-mono opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {isHydrating && (
        <p className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground dark:text-white/35">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t("voiceActor.loadingFilmography", { count: roles.length })}
        </p>
      )}

      {fetchError && (
        <p className="text-[11px] font-mono text-amber-400/90">{t("voiceActor.partialLoad")}</p>
      )}

      {shown.length === 0 && !isHydrating ? (
        <p className="py-12 text-center text-sm text-muted-foreground dark:text-white/35 font-mono">
          {t("voiceActor.noRoles")}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {shown.map((role) => (
              <VoiceActorCreditCard
                key={`${role.anime.id}-${role.character?.id ?? ""}`}
                role={role}
              />
            ))}
          </div>
          {hasMoreVisible && (
            <div ref={sentinelRef} className="flex justify-center py-8 text-muted-foreground dark:text-white/35">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              <span className="sr-only">{t("voiceActor.loadingMore")}</span>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div id="va-tabs-panel" className="scroll-mt-[calc(var(--nav-total-height)+0.75rem)] mt-6 sm:mt-10">
      <div className="anime-sticky-chrome sticky top-[var(--nav-total-height)] z-30 -mx-4 px-4 py-2 mb-3 bg-background/95 backdrop-blur-md border-b border-border/80 dark:border-white/10 sm:mx-0 sm:px-0 sm:mb-4">
        <AnimeQuickNav tabs={tabItems} activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsContent value="overview" className="mt-8 space-y-5">
          {overviewMeta.length > 0 && (
            <section className="site-panel p-5 sm:p-6">
              <h3 className="text-[10px] font-mono text-muted-foreground dark:text-white/35 uppercase tracking-widest mb-4">
                {t("voiceActor.sections.details")}
              </h3>
              <dl className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-4">
                {overviewMeta.map((item) => (
                  <MetaItem key={item.label} label={item.label} value={item.value} />
                ))}
              </dl>
              {profile.siteUrl && (
                <a
                  href={profile.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground dark:text-white/40 hover:text-foreground dark:hover:text-white/70 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  {t("voiceActor.anilistProfile")}
                </a>
              )}
            </section>
          )}

          {profile.description && (
            <section className="site-panel p-5 sm:p-6">
              <h3 className="text-[10px] font-mono text-muted-foreground dark:text-white/35 uppercase tracking-widest mb-4">
                {t("voiceActor.sections.biography")}
              </h3>
              <AniListRichText
                text={profile.description}
                className="text-sm text-muted-foreground dark:text-white/65 leading-8"
              />
            </section>
          )}

          <section className="site-panel p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-[10px] font-mono text-muted-foreground dark:text-white/35 uppercase tracking-widest">
                {t("voiceActor.sections.statistics")}
              </h3>
              {isHydrating && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground dark:text-white/35">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t("voiceActor.statsUpdating")}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <StatCard
                label={t("voiceActor.stats.totalCredits")}
                value={isHydrating ? `${roles.length}+` : String(roles.length)}
              />
              <StatCard label={t("voiceActor.stats.main")} value={String(roleCounts.main)} />
              <StatCard label={t("voiceActor.stats.supporting")} value={String(roleCounts.supporting)} />
              <StatCard label={t("voiceActor.stats.background")} value={String(roleCounts.background)} />
              {VA_MEDIA_CATEGORY_ORDER.filter((c) => categoryCounts[c] > 0).map((cat) => (
                <StatCard
                  key={cat}
                  label={t(`voiceActor.tabs.${cat}` as "voiceActor.tabs.tv")}
                  value={String(categoryCounts[cat])}
                />
              ))}
              {years.first != null && (
                <StatCard label={t("voiceActor.stats.firstAppearance")} value={String(years.first)} />
              )}
              {years.latest != null && (
                <StatCard label={t("voiceActor.stats.latestAppearance")} value={String(years.latest)} />
              )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          {activeTab === "all" ? creditsPanel : null}
        </TabsContent>

        {VA_MEDIA_CATEGORY_ORDER.map((cat) => (
          <TabsContent key={cat} value={cat} className="mt-6">
            {activeTab === cat ? creditsPanel : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
