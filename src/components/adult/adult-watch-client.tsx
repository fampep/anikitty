"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import Container from "@/components/layout/container";
import { AniKittyPlayer } from "@/components/custom-player";
import { ROUTES } from "@/constants/routes";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";

type StreamPayload = {
  file: string;
  headers?: Record<string, string>;
  title?: string;
  seriesTitle?: string;
  seriesSlug?: string;
  episodeNumber?: number;
  episodeSlug?: string;
  poster?: string | null;
  error?: string;
};

export default function AdultWatchClient() {
  const t = useT();
  const searchParams = useSearchParams();
  const showAdult = useSettingsStore((s) => s.showAdultContent);

  const slug = (searchParams.get("slug") || "").trim();
  const id = (searchParams.get("id") || "").trim();
  const ep = (searchParams.get("ep") || "").trim();
  const episodeSlug = (searchParams.get("episodeSlug") || "").trim();

  const [stream, setStream] = useState<StreamPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const qs = new URLSearchParams({ adult: "1" });
    if (slug) qs.set("seriesSlug", slug);
    if (id) qs.set("seriesId", id);
    if (ep) qs.set("episode", ep);
    if (episodeSlug) qs.set("episodeSlug", episodeSlug);
    return qs.toString();
  }, [slug, id, ep, episodeSlug]);

  useEffect(() => {
    if (!showAdult || (!slug && !id)) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetch(`/api/adult/stream?${query}`, { credentials: "include" })
      .then(async (res) => {
        const json = (await res.json()) as StreamPayload;
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        if (!cancelled) setStream(json);
      })
      .catch((err) => {
        if (!cancelled) {
          setStream(null);
          setError(err instanceof Error ? err.message : "Failed to load stream");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showAdult, query, slug, id]);

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

  return (
    <Container className="py-4 md:py-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            18+
          </p>
          <h1 className="text-lg font-semibold tracking-tight">
            {stream?.seriesTitle || t("adult.title")}
            {stream?.title ? (
              <span className="text-muted-foreground"> · {stream.title}</span>
            ) : null}
          </h1>
        </div>
        {slug ? (
          <Link
            href={`${ROUTES.ADULT}/${encodeURIComponent(slug)}${id ? `?id=${id}` : ""}`}
            className="text-sm text-muted-foreground underline"
          >
            {t("adult.backToSeries")}
          </Link>
        ) : null}
      </div>

      {loading ? (
        <div className="flex aspect-video items-center justify-center rounded-xl bg-zinc-950 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error || !stream?.file ? (
        <div className="flex aspect-video items-center justify-center rounded-xl bg-zinc-950 px-4 text-center text-sm text-destructive">
          {error || t("adult.streamFailed")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-black">
          <AniKittyPlayer
            key={stream.file}
            src={stream.file}
            poster={stream.poster || undefined}
            title={stream.title}
            seriesTitle={stream.seriesTitle}
            episodeNumber={stream.episodeNumber}
            headers={stream.headers}
          />
        </div>
      )}
    </Container>
  );
}
