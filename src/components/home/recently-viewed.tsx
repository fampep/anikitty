"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { History } from "lucide-react";
import { getRecentlyViewed, type RecentlyViewedAnime } from "@/lib/core/recently-viewed";
import { useT } from "@/providers/i18n-provider";
import type { IAnime } from "@/types/anime";

const AnimeSections = dynamic(() => import("@/components/home/anime-sections"));

/** "Recently viewed" — anime the user opened, from local history. */
export default function RecentlyViewed() {
  const t = useT();
  const [items, setItems] = useState<RecentlyViewedAnime[]>([]);

  useEffect(() => {
    const load = () => setItems(getRecentlyViewed());
    load();
    window.addEventListener("anikitty:recently-viewed", load);
    return () => window.removeEventListener("anikitty:recently-viewed", load);
  }, []);

  if (items.length === 0) return null;

  const mapped: IAnime[] = items.map((a) => ({
    id: a.id,
    name: a.name,
    jname: "",
    poster: a.poster,
    episodes: { sub: 0, dub: 0 },
  }));

  return (
    <AnimeSections
      sectionId="recently-viewed"
      title={t("home.recentlyViewed")}
      icon={<History className="w-4 h-4" />}
      trendingAnime={mapped}
      loading={false}
      layout="row"
    />
  );
}
