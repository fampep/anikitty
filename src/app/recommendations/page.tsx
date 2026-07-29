"use client";

import Link from "next/link";
import Image from "next/image";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/store/auth-store";
import { useGetRecommendations } from "@/query/home/get-recommendations";
import { useT } from "@/providers/i18n-provider";
import { DiscoveryHero, DiscoverySection } from "@/components/discovery/discovery-shared";
import { Sparkles } from "lucide-react";

type RecItem = {
  id: string;
  name: string;
  poster: string;
  type?: string;
  score?: number | null;
  year?: number | null;
  reason?: string;
  reasonKind?: string;
};

export default function RecommendationsPage() {
  const t = useT();
  const auth = useAuthStore((s) => s.auth);
  const { data, isLoading } = useGetRecommendations(Boolean(auth));

  const items = (data?.data ?? []) as RecItem[];

  return (
    <Container className="pt-8 pb-24">
      <DiscoveryHero
        title={t("discovery.recommendations.title")}
        subtitle={t("discovery.recommendations.subtitle")}
      />

      {!auth && (
        <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] px-5 py-8 text-center">
          <Sparkles className="w-6 h-6 mx-auto text-zinc-300 mb-3" />
          <p className="text-sm text-muted-foreground">{t("discovery.recommendations.signIn")}</p>
          <Link href={ROUTES.HOME} className="text-sm text-primary mt-3 inline-block">
            {t("common.backHome")}
          </Link>
        </div>
      )}

      {auth && !isLoading && data && !data.hasHistory && (
        <div className="rounded-2xl border border-border dark:border-white/10 px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">{t("home.recommendationsHint")}</p>
          <Link href={ROUTES.TRENDING} className="text-sm text-primary mt-3 inline-block">
            {t("home.recommendationsCta")}
          </Link>
        </div>
      )}

      {auth && (
        <DiscoverySection title={t("discovery.recommendations.forYou")} count={items.length}>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-muted/30 dark:bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={`${ROUTES.ANIME_DETAILS}/${item.id}`}
                  className="group flex gap-3 rounded-xl border border-border dark:border-white/8 bg-muted/20 dark:bg-white/[0.02] p-3 hover:border-white/20 transition-colors"
                >
                  <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg">
                    {item.poster && (
                      <Image
                        src={item.poster}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-[1.03]"
                        unoptimized
                        sizes="64px"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex flex-col justify-center">
                    <p className="text-sm font-semibold text-foreground dark:text-white/90 line-clamp-2">
                      {item.name}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground dark:text-white/35 mt-1">
                      {[item.type, item.year, item.score ? `${(item.score / 10).toFixed(1)}★` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {item.reason && (
                      <p className="text-xs text-muted-foreground dark:text-white/45 mt-2 line-clamp-2">
                        {item.reason}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
              {!isLoading && items.length === 0 && data?.hasHistory && (
                <p className="col-span-full text-sm text-muted-foreground py-8 text-center">
                  {t("discovery.empty")}
                </p>
              )}
            </div>
          )}
        </DiscoverySection>
      )}
    </Container>
  );
}
