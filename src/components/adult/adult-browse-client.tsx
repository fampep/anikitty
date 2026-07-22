"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, ShieldAlert } from "lucide-react";
import AnimeCard from "@/components/anime/anime-card";
import Container from "@/components/layout/container";
import Pagination from "@/components/common/pagination";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/core/utils";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";

type BrowseItem = {
  id: number;
  slug: string;
  title: string;
  poster: string;
};

type BrowsePage = {
  items: BrowseItem[];
  page: number;
  totalPages: number;
  totalResults: number;
  error?: string;
};

function AdultGateEmpty() {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <ShieldAlert className="h-10 w-10 text-muted-foreground" />
      <div className="max-w-md space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("adult.gateTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("adult.gateDesc")}
        </p>
      </div>
      <Link
        href={ROUTES.SETTINGS}
        className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
      >
        {t("adult.openSettings")}
      </Link>
    </div>
  );
}

export default function AdultBrowseClient() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showAdult = useSettingsStore((s) => s.showAdultContent);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const q = (searchParams.get("q") || "").trim();

  const [query, setQuery] = useState(q);
  const [data, setData] = useState<BrowsePage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!showAdult) return;
    setLoading(true);
    setError(null);
    try {
      const path = q
        ? `/api/adult/search?adult=1&q=${encodeURIComponent(q)}`
        : `/api/adult/browse?adult=1&page=${page}`;
      const res = await fetch(path, { credentials: "include" });
      const json = (await res.json()) as BrowsePage;
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [showAdult, page, q]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setQuery(q);
  }, [q]);

  if (!showAdult) {
    return (
      <Container className="py-8">
        <AdultGateEmpty />
      </Container>
    );
  }

  return (
    <Container className="py-6 md:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            18+
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{t("adult.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("adult.subtitle")}</p>
        </div>
        <form
          className="flex w-full max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const next = query.trim();
            const params = new URLSearchParams();
            if (next) params.set("q", next);
            router.push(`${ROUTES.ADULT}${params.toString() ? `?${params}` : ""}`);
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("adult.searchPlaceholder")}
              className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <button
            type="submit"
            className="h-10 rounded-xl bg-foreground px-4 text-sm font-medium text-background"
          >
            {t("adult.search")}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">{t("adult.loading")}</span>
        </div>
      ) : error ? (
        <p className="py-16 text-center text-sm text-destructive">{error}</p>
      ) : !data?.items?.length ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          {t("adult.empty")}
        </p>
      ) : (
        <>
          <div
            className={cn(
              "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
            )}
          >
            {data.items.map((item) => (
              <AnimeCard
                key={item.id}
                href={`${ROUTES.ADULT}/${encodeURIComponent(item.slug)}?id=${item.id}`}
                title={item.title}
                poster={item.poster}
                displayDetails
              />
            ))}
          </div>
          {!q && data.totalPages > 1 ? (
            <div className="mt-8 flex justify-center">
              <Pagination
                currentPage={data.page}
                totalPages={data.totalPages}
                handlePageChange={(p) => router.push(`${ROUTES.ADULT}?page=${p}`)}
                handlePreviousPage={() =>
                  router.push(`${ROUTES.ADULT}?page=${Math.max(1, data.page - 1)}`)
                }
                handleNextPage={() =>
                  router.push(
                    `${ROUTES.ADULT}?page=${Math.min(data.totalPages, data.page + 1)}`,
                  )
                }
              />
            </div>
          ) : null}
        </>
      )}
    </Container>
  );
}
