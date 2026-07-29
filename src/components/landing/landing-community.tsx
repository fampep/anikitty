"use client";

import Link from "next/link";
import { ArrowRight, MessageSquare } from "lucide-react";
import FramedAvatar from "@/components/common/framed-avatar";
import { CosmeticUsername } from "@/components/common/user-cosmetics";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import {
  useLatestComments,
  type LatestCommentItem,
} from "@/query/home/get-community-latest";

function commentHref(c: LatestCommentItem) {
  const hash = `#comment-${c.id}`;
  if (c.episodeId) {
    return `${ROUTES.WATCH}?anime=${encodeURIComponent(c.animeId)}&episode=${encodeURIComponent(c.episodeId)}${hash}`;
  }
  return `${ROUTES.ANIME_DETAILS}/${c.animeId}${hash}`;
}

function snippet(body: string, max = 110) {
  const clean = body.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

export default function LandingCommunity() {
  const t = useT();
  const { data, isLoading, isError } = useLatestComments(6, true);
  const comments = data ?? [];

  // Wait for data before painting — avoid skeleton→empty collapse that jumps scroll up.
  if (isLoading || isError || comments.length === 0) return null;

  return (
    <section className="relative z-10 px-4 sm:px-6 md:px-12 py-14 sm:py-16 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <p className="site-label mb-2 flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3" />
              {t("landing.communityLabel")}
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-white/90">
              {t("landing.communityTitle")}
            </h2>
          </div>
          <Link
            href={ROUTES.COMMUNITY}
            prefetch
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/40 hover:text-white/75 transition-colors"
          >
            {t("landing.seeAll")}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {comments.map((c) => (
            <li key={c.id}>
              <Link
                href={commentHref(c)}
                className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5 hover:border-white/14 transition-colors h-full"
              >
                <FramedAvatar
                  username={c.username}
                  url={c.avatarUrl ?? undefined}
                  frameSlug={c.equippedFrame}
                  className="w-9 h-9 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-white/80 mb-1 truncate">
                    <CosmeticUsername username={c.username} iconSlug={c.equippedIcon} />
                  </p>
                  <p className="text-[13px] text-white/50 leading-relaxed line-clamp-2">
                    {c.isSpoiler ? t("comments.spoilerBadge") : snippet(c.body || t("home.sharedGif"))}
                  </p>
                  {c.animeTitle ? (
                    <p className="text-[10px] text-white/28 font-mono mt-1.5 truncate">
                      {c.animeTitle}
                      {c.episodeNumber != null ? ` · EP ${c.episodeNumber}` : ""}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
