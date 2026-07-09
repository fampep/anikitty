"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import Container from "@/components/layout/container";
import { MessageSquare, MessagesSquare } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";

const CommunityActivityFeed = dynamic(() => import("@/components/community/community-activity-feed"));

export default function CommunityPage() {
  const t = useT();

  return (
    <div className="min-h-screen pt-8 pb-24">
      <Container className="pb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-0.5 h-6 bg-muted/30 dark:bg-white/35 shrink-0" />
              <MessageSquare className="w-5 h-5 text-muted-foreground dark:text-white/50" />
              <h1 className="text-2xl md:text-3xl font-bold text-foreground dark:text-white tracking-tight">
                {t("community.title")}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground dark:text-white/35 font-mono pl-[3.25rem]">
              {t("community.subtitle")}
            </p>
          </div>
          <Link
            href={ROUTES.FORUM}
            className="inline-flex items-center gap-2 shrink-0 self-start rounded-xl border border-border dark:border-white/10 bg-muted/50 dark:bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-muted-foreground dark:text-white/70 hover:border-violet-400/25 hover:bg-violet-500/[0.08] hover:text-foreground dark:hover:text-white transition-all"
          >
            <MessagesSquare className="w-4 h-4 text-violet-300/80" />
            {t("community.forumCta")}
          </Link>
        </div>
      </Container>

      <CommunityActivityFeed />
    </div>
  );
}
