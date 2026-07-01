"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";

type Snippet = {
  id: string;
  body: string;
  username: string;
  animeId: string;
  episodeNumber?: number | null;
};

export default function LandingCommunitySnippets() {
  const t = useT();
  const [comments, setComments] = useState<Snippet[]>([]);

  useEffect(() => {
    fetch("/api/comments/latest")
      .then((r) => r.json())
      .then((d) => setComments((d.comments ?? []).slice(0, 3)))
      .catch(() => {});
  }, []);

  if (!comments.length) return null;

  return (
    <section className="relative z-10 px-4 sm:px-6 md:px-12 py-10 sm:py-12 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-3.5 h-3.5 text-emerald-400/70" />
          <p className="site-label">{t("landing.communityLabel")}</p>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-white/85 mb-5">{t("landing.communityTitle")}</h2>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {comments.map((c) => (
            <Link
              key={c.id}
              href={`${ROUTES.ANIME_DETAILS}/${c.animeId}`}
              className="site-panel-hover p-4 block min-h-[88px]"
            >
              <p className="text-[11px] font-semibold text-white/50 mb-1.5 truncate">
                {c.username}
                {c.episodeNumber ? ` · Ep ${c.episodeNumber}` : ""}
              </p>
              <p className="text-[12px] text-white/60 line-clamp-2 leading-relaxed">{c.body}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
