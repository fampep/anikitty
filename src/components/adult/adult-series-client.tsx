"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";

type SeriesPayload = {
  id: number;
  slug: string;
  title: string;
  poster: string;
  synopsis?: string;
  year?: number | null;
  score?: number | null;
  genres?: string[];
  episodes: {
    id: number;
    number: number;
    slug: string;
    title: string;
  }[];
  error?: string;
};

export default function AdultSeriesClient() {
  const t = useT();
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const showAdult = useSettingsStore((s) => s.showAdultContent);
  const slug = decodeURIComponent(params.slug || "");
  const id = searchParams.get("id");

  const [data, setData] = useState<SeriesPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!showAdult || !slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ adult: "1", slug });
    if (id) qs.set("id", id);
    void fetch(`/api/adult/series?${qs}`, { credentials: "include" })
      .then(async (res) => {
        const json = (await res.json()) as SeriesPayload;
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showAdult, slug, id]);

  if (!showAdult) {
    return (
      <Container className="py-8">
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <ShieldAlert className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("adult.gateDesc")}</p>
          <Link href={ROUTES.SETTINGS} className="text-sm underline">
            {t("adult.openSettings")}
          </Link>
        </div>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">{t("adult.loading")}</span>
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container className="py-16 text-center text-sm text-destructive">
        {error || t("adult.notFound")}
      </Container>
    );
  }

  return (
    <Container className="py-6 md:py-8">
      <div className="mb-8 grid gap-6 md:grid-cols-[180px_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={data.poster}
          alt=""
          className="aspect-[2/3] w-full max-w-[180px] rounded-xl object-cover"
        />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            18+
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{data.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {[data.year, data.score != null ? `★ ${data.score}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {data.genres?.length ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {data.genres.slice(0, 8).join(" · ")}
            </p>
          ) : null}
          {data.synopsis ? (
            <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {data.synopsis.slice(0, 1200)}
            </p>
          ) : null}
        </div>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {t("adult.episodes")}
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {data.episodes.map((ep) => (
          <Link
            key={ep.id}
            href={`${ROUTES.ADULT_WATCH}?slug=${encodeURIComponent(data.slug)}&id=${data.id}&ep=${ep.number}&episodeSlug=${encodeURIComponent(ep.slug)}`}
            className="rounded-xl border border-border/80 bg-card/40 px-3 py-3 text-sm transition hover:bg-muted/40"
          >
            <span className="font-medium">{ep.title}</span>
          </Link>
        ))}
      </div>
    </Container>
  );
}
