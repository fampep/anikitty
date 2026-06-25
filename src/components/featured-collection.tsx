import React from "react";
import Container from "./container";
import FeaturedCollectionCard from "./featured-collection-card";
import { SectionHeading } from "./section-heading";
import { IAnime, LatestCompletedAnime } from "@/types/anime";
import { Layers } from "lucide-react";

type Props = {
  featuredAnime: [
    mostFavorite: { title: string; anime: IAnime[] },
    mostPopular: { title: string; anime: IAnime[] },
    latestCompleted: { title: string; anime: LatestCompletedAnime[] }
  ];
  loading: boolean;
};

const FeaturedCollection = ({ featuredAnime, loading }: Props) => {
  if (loading) return <LoadingSkeleton />;
  return (
    <Container className="flex flex-col gap-5 items-center lg:items-start py-8">
      <SectionHeading icon={<Layers className="w-4 h-4" />} title="Featured Collection" subtitle="Curated lists across all time" />
      <div className="grid w-full gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {featuredAnime.map((category, idx) => (
          <FeaturedCollectionCard
            title={category.title}
            key={idx}
            index={idx}
            anime={category.anime}
          />
        ))}
      </div>
    </Container>
  );
};

const LoadingSkeleton = () => (
  <Container className="flex flex-col gap-5 py-10 items-center lg:items-start">
    <div className="flex items-center gap-3">
      <div className="w-0.5 h-5 bg-white/20 animate-pulse" />
      <div className="h-6 w-48 animate-pulse bg-white/8 rounded" />
    </div>
    <div className="grid w-full gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((_, idx) => (
        <div
          key={idx}
          className="rounded-xl h-[18rem] animate-pulse bg-white/5"
        />
      ))}
    </div>
  </Container>
);

export default FeaturedCollection;
