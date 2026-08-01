"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Search, Sparkles } from "lucide-react";
import Container from "@/components/layout/container";
import { cn } from "@/lib/core/utils";
import {
  CHANGELOG_CATEGORIES,
  CHANGELOG_CATEGORY_META,
  type ChangelogCategory,
} from "@/lib/changelog/changelog-shared";
import type { ChangelogEntry } from "@/lib/changelog/changelog-server";

type Response = { entries: ChangelogEntry[]; page: number; hasMore: boolean };

async function fetchChangelog(q: string, category: string): Promise<Response> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  const res = await fetch(`/api/changelog?${params}`);
  if (!res.ok) throw new Error("Failed to load changelog");
  return res.json();
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function EntryCard({ entry, className }: { entry: ChangelogEntry; className?: string }) {
  const grouped = useMemo(() => {
    const map = new Map<ChangelogCategory, string[]>();
    for (const item of entry.items) {
      const list = map.get(item.category) ?? [];
      list.push(item.text);
      map.set(item.category, list);
    }
    return CHANGELOG_CATEGORIES.filter((c) => map.has(c)).map((c) => ({
      category: c,
      texts: map.get(c)!,
    }));
  }, [entry.items]);

  return (
    <article
      className={cn(
        "rounded-xl border border-border dark:border-white/10 bg-card dark:bg-white/[0.03] p-5 sm:p-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Link
          href={`/changelog/${entry.slug}`}
          className="text-lg font-bold tracking-tight text-foreground dark:text-white hover:underline"
        >
          Version {entry.version}
        </Link>
        <span className="text-xs font-mono text-muted-foreground dark:text-white/40">
          {formatDate(entry.releasedAt)}
        </span>
      </div>
      {entry.title ? (
        <p className="mt-1 text-sm font-semibold text-foreground/90 dark:text-white/80">
          {entry.title}
        </p>
      ) : null}
      {entry.summary ? (
        <p className="mt-1.5 text-sm text-muted-foreground dark:text-white/55">{entry.summary}</p>
      ) : null}

      <div className="mt-4 flex flex-col gap-4">
        {grouped.map(({ category, texts }) => {
          const meta = CHANGELOG_CATEGORY_META[category];
          return (
            <div key={category}>
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground dark:text-white/50">
                <span aria-hidden>{meta.emoji}</span>
                {meta.label}
              </p>
              <ul className="mt-1.5 flex flex-col gap-1 pl-1">
                {texts.map((text, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-foreground/85 dark:text-white/75"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default function ChangelogContent({ initialEntries }: { initialEntries: ChangelogEntry[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ChangelogCategory | "">("");

  const { data, isLoading } = useQuery({
    queryKey: ["changelog", query, category],
    queryFn: () => fetchChangelog(query, category),
    initialData: query || category ? undefined : { entries: initialEntries, page: 1, hasMore: false },
    placeholderData: keepPreviousData,
  });

  const entries = data?.entries ?? [];
  const featured = !query && !category ? entries.find((e) => e.isFeatured) : undefined;
  const rest = featured ? entries.filter((e) => e.id !== featured.id) : entries;

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white sm:text-3xl">
            Changelog
          </h1>
          <p className="mt-2 text-sm text-muted-foreground dark:text-white/50">
            Everything new, improved, and fixed on AniKitty.
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground dark:text-white/35" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search updates…"
              className="w-full rounded-lg border border-border dark:border-white/10 bg-background dark:bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory("")}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors",
              category === ""
                ? "border-primary/40 bg-primary/15 text-foreground dark:text-white"
                : "border-border dark:border-white/10 text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/75",
            )}
          >
            All Updates
          </button>
          {CHANGELOG_CATEGORIES.map((c) => {
            const meta = CHANGELOG_CATEGORY_META[c];
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory((v) => (v === c ? "" : c))}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors",
                  category === c
                    ? "border-primary/40 bg-primary/15 text-foreground dark:text-white"
                    : "border-border dark:border-white/10 text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/75",
                )}
              >
                {meta.emoji} {meta.label}
              </button>
            );
          })}
        </div>

        {featured ? (
          <div className="mb-8 overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-transparent to-transparent p-5 sm:p-6">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Featured Update
            </p>
            <EntryCard entry={featured} className="mt-3 border-0 bg-transparent p-0" />
          </div>
        ) : null}

        {isLoading && entries.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground dark:text-white/40">
            Loading…
          </p>
        ) : rest.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground dark:text-white/40">
            No updates found.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {rest.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
