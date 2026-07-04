"use client";

import React from "react";
import Container from "@/components/layout/container";
import FeaturedCollectionCard from "./featured-collection-card";
import { SectionHeading } from "./section-heading";
import { IAnime } from "@/types/anime";
import { Layers } from "lucide-react";
import { useT } from "@/providers/i18n-provider";

type FeaturedCategory = {
  title: string;
  anime: IAnime[];
};

type Props = {
  featuredAnime: FeaturedCategory[];
  loading: boolean;
  sectionId?: string;
};

const FeaturedCollection = ({ featuredAnime, loading, sectionId }: Props) => {
  const t = useT();
  if (loading) return <LoadingSkeleton sectionId={sectionId} />;
  return (
    <Container id={sectionId} className="flex flex-col gap-5 items-center lg:items-start py-8 scroll-mt-[calc(var(--nav-height)+1rem)]">
      <SectionHeading icon={<Layers className="w-4 h-4" />} title={t("home.featuredCollection")} subtitle={t("home.featuredSubtitle")} />
      <div className="grid w-full gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {featuredAnime.map((category, idx) => (
          <FeaturedCollectionCard
            title={category.title}
            key={idx}
            index={idx}
            anime={category.anime ?? []}
          />
        ))}
      </div>
    </Container>
  );
};

const LoadingSkeleton = ({ sectionId }: { sectionId?: string }) => (
  <Container id={sectionId} className="flex flex-col gap-5 py-10 items-center lg:items-start scroll-mt-[calc(var(--nav-height)+1rem)]">
    <div className="flex items-center gap-3">
      <div className="w-0.5 h-5 bg-white/20 animate-pulse" />
      <div className="h-6 w-48 animate-pulse bg-accent dark:bg-white/8 rounded" />
    </div>
    <div className="grid w-full gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((_, idx) => (
        <div
          key={idx}
          className="rounded-xl h-[18rem] animate-pulse bg-muted/50 dark:bg-white/5"
        />
      ))}
    </div>
  </Container>
);

export default FeaturedCollection;
