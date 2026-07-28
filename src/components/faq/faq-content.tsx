"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Container from "@/components/layout/container";
import FaqSearch from "@/components/faq/faq-search";
import FaqSidebar from "@/components/faq/faq-sidebar";
import FaqPopular from "@/components/faq/faq-popular";
import FaqAccordionItem from "@/components/faq/faq-accordion-item";
import FaqHelpFooter from "@/components/faq/faq-help-footer";
import {
  categoriesWithContent,
  getPopularFaqItems,
} from "@/lib/faq/faq-helpers";
import { toFaqCategoryMeta } from "@/lib/faq/faq-icons";
import type { FaqCategoryId, FaqItem, FaqPayload } from "@/lib/faq/types";
import { FAQ_LAST_UPDATED, DISCORD_INVITE_URL } from "@/constants/site-meta";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";

function matchesQuery(item: FaqItem, q: string) {
  if (!q) return true;
  const hay = `${item.title}\n${item.answer}\n${item.tags.join(" ")}\n${item.category}`.toLowerCase();
  return hay.includes(q);
}

async function fetchFaq(): Promise<FaqPayload> {
  const res = await fetch("/api/faq");
  if (!res.ok) throw new Error("Failed to load FAQ");
  return res.json();
}

type Props = {
  initialData: FaqPayload;
};

export default function FaqContent({ initialData }: Props) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["faq-content"],
    queryFn: fetchFaq,
    initialData,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const articles = data?.articles ?? [];
  const categoryMeta = useMemo(
    () => (data?.categories ?? []).map(toFaqCategoryMeta),
    [data?.categories],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const popular = useMemo(() => getPopularFaqItems(articles, 6), [articles]);

  const filteredItems = useMemo(
    () =>
      articles
        .filter((item) => matchesQuery(item, normalizedQuery))
        .sort((a, b) => a.order - b.order || b.popularity - a.popularity),
    [articles, normalizedQuery],
  );

  const categories = useMemo(
    () => categoriesWithContent(categoryMeta, filteredItems),
    [categoryMeta, filteredItems],
  );

  const grouped = useMemo(() => {
    const map = new Map<FaqCategoryId, FaqItem[]>();
    for (const cat of categories) map.set(cat.id, []);
    for (const item of filteredItems) {
      const list = map.get(item.category);
      if (list) list.push(item);
    }
    return categories
      .map((cat) => ({ cat, items: map.get(cat.id) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [categories, filteredItems]);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const { cat, items } of grouped) out[cat.id] = items.length;
    return out;
  }, [grouped]);

  const openQuestion = useCallback(
    (id: string, opts?: { scroll?: boolean; replaceHash?: boolean }) => {
      setOpenId(id);
      const item = articles.find((x) => x.id === id);
      if (item) setActiveCategory(item.category);
      if (opts?.replaceHash !== false) {
        const url = `${ROUTES.FAQ}#${id}`;
        window.history.replaceState(null, "", url);
      }
      if (opts?.scroll !== false) {
        requestAnimationFrame(() => {
          const el = document.getElementById(id);
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
          el?.querySelector<HTMLElement>("button[aria-expanded]")?.focus({ preventScroll: true });
        });
      }
    },
    [articles],
  );

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      if (articles.some((item) => item.id === hash)) {
        openQuestion(hash, { replaceHash: false });
      } else if (categoryMeta.some((c) => c.id === hash)) {
        setActiveCategory(hash);
        document.getElementById(`faq-cat-${hash}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [openQuestion, articles, categoryMeta]);

  useEffect(() => {
    if (normalizedQuery) return;
    const sectionEls = grouped
      .map(({ cat }) => document.getElementById(`faq-cat-${cat.id}`))
      .filter((el): el is HTMLElement => Boolean(el));
    if (sectionEls.length === 0 || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) {
          setActiveCategory(visible[0].target.id.replace(/^faq-cat-/, ""));
        }
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.25, 0.5] },
    );
    for (const el of sectionEls) observer.observe(el);
    return () => observer.disconnect();
  }, [grouped, normalizedQuery]);

  const navigateCategory = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
    window.history.replaceState(null, "", `${ROUTES.FAQ}#${categoryId}`);
    document.getElementById(`faq-cat-${categoryId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const lastUpdated = t("faq.lastUpdated", {
    date: new Date(FAQ_LAST_UPDATED).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  });

  const empty = filteredItems.length === 0;

  return (
    <div className="min-h-screen pb-24 pt-8">
      <Container className="max-w-6xl">
        <header className="mb-6 md:mb-8">
          <div className="mb-2 flex items-center gap-3">
            <div className="h-6 w-0.5 shrink-0 bg-muted/30 dark:bg-white/35" />
            <HelpCircle className="h-5 w-5 text-muted-foreground dark:text-white/50" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white md:text-3xl">
              {t("faq.title")}
            </h1>
          </div>
          <p className="ml-[1.375rem] max-w-2xl pl-8 font-mono text-sm leading-relaxed text-muted-foreground dark:text-white/35">
            {t("faq.subtitle")} {lastUpdated}.
          </p>
        </header>

        <FaqSearch
          value={query}
          onChange={setQuery}
          sticky
          resultCount={normalizedQuery ? filteredItems.length : null}
          className="mb-6 max-w-2xl md:mb-8"
        />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
          {!empty ? (
            <FaqSidebar
              categories={categories}
              activeId={activeCategory}
              counts={counts}
              onNavigate={navigateCategory}
            />
          ) : (
            <div className="hidden lg:block" />
          )}

          <div className="min-w-0">
            {!normalizedQuery ? (
              <FaqPopular
                items={popular}
                onSelect={(id) => openQuestion(id)}
                className="mb-8 animate-in fade-in slide-in-from-bottom-1 duration-300"
              />
            ) : null}

            {empty ? (
              <div className="site-panel animate-in fade-in duration-200 space-y-6 p-6 text-center sm:p-8">
                <p className="font-mono text-sm text-muted-foreground dark:text-white/40">
                  {t("faq.noSearchResults")}
                </p>
                <FaqPopular
                  items={popular}
                  onSelect={(id) => {
                    setQuery("");
                    openQuestion(id);
                  }}
                  titleKey="faq.popularFallback"
                  className="border-0 bg-transparent p-0 shadow-none"
                />
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  <a
                    href={DISCORD_INVITE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="site-ghost-btn px-3 py-2 text-xs"
                  >
                    {t("footer.discord")}
                  </a>
                  <a
                    href="https://github.com/fampep/anikitty/issues/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="site-ghost-btn px-3 py-2 text-xs"
                  >
                    {t("faq.reportBug")}
                  </a>
                  <Link href={ROUTES.CHAT} className="site-ghost-btn px-3 py-2 text-xs">
                    {t("faq.openChat")}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-10">
                {grouped.map(({ cat, items }) => {
                  const Icon = cat.icon;
                  return (
                    <section
                      key={cat.id}
                      id={`faq-cat-${cat.id}`}
                      className="scroll-mt-28 animate-in fade-in slide-in-from-bottom-1 duration-300"
                    >
                      <div className="mb-3.5 flex items-center gap-2.5">
                        <span className="text-muted-foreground/80 dark:text-white/40">
                          <Icon className="h-4 w-4" />
                        </span>
                        <h2 className="text-lg font-bold text-foreground dark:text-white/90">
                          {t(cat.labelKey)}
                        </h2>
                        <span className="font-mono text-[10px] text-muted-foreground/70 dark:text-white/25">
                          {items.length}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2" role="list">
                        {items.map((item) => (
                          <div key={item.id} role="listitem">
                            <FaqAccordionItem
                              item={item}
                              allItems={articles}
                              open={openId === item.id}
                              highlight={normalizedQuery || undefined}
                              onToggle={() => {
                                if (openId === item.id) {
                                  setOpenId(null);
                                  window.history.replaceState(null, "", ROUTES.FAQ);
                                } else {
                                  openQuestion(item.id, { scroll: false });
                                }
                              }}
                              onOpenRelated={(id) => openQuestion(id)}
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}

            <FaqHelpFooter />
          </div>
        </div>
      </Container>
    </div>
  );
}
