"use client";

import Link from "next/link";
import { Coffee, ExternalLink } from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { kofiDonationUrl } from "@/lib/social/donation-config";
import { useT } from "@/providers/i18n-provider";

export default function HomeDonationSlim() {
  const t = useT();

  return (
    <Container className="py-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3.5 rounded-xl border border-zinc-500/15 bg-gradient-to-r from-zinc-500/[0.08] via-zinc-500/[0.05] to-transparent">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-500/15 border border-zinc-400/20 text-zinc-300">
            <Coffee className="h-4 w-4" />
          </span>
          <p className="text-[12px] text-muted-foreground dark:text-white/50 leading-relaxed pt-1.5">
            {t("home.donationSlim")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={kofiDonationUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 site-brand-btn px-3.5 py-2 text-xs"
          >
            <Coffee className="h-3.5 w-3.5" />
            {t("home.donationGoalCta")}
            <ExternalLink className="h-3 w-3 opacity-70" />
          </a>
          <Link href={ROUTES.DONATE} className="site-ghost-btn py-2 text-xs">
            {t("home.donationGoalLearn")}
          </Link>
        </div>
      </div>
    </Container>
  );
}
