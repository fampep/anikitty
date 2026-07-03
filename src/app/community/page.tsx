"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import Container from "@/components/layout/container";
import { MessageSquare, MessagesSquare } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";

const LatestComments = dynamic(() => import("@/components/home/latest-comments"));

export default function CommunityPage() {
  const t = useT();

  return (
    <div className="min-h-screen pt-8 pb-24">
      <Container className="pb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-0.5 h-6 bg-white/35 shrink-0" />
              <MessageSquare className="w-5 h-5 text-white/50" />
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                {t("community.title")}
              </h1>
            </div>
            <p className="text-sm text-white/35 font-mono pl-[3.25rem]">
              {t("community.subtitle")}
            </p>
          </div>
          <Link
            href={ROUTES.FORUM}
            className="inline-flex items-center gap-2 shrink-0 self-start rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/70 hover:border-violet-400/25 hover:bg-violet-500/[0.08] hover:text-white transition-all"
          >
            <MessagesSquare className="w-4 h-4 text-violet-300/80" />
            {t("community.forumCta")}
          </Link>
        </div>
      </Container>

      <LatestComments />
    </div>
  );
}
