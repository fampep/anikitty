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
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3 rounded-xl border border-fuchsia-500/15 bg-gradient-to-r from-fuchsia-500/[0.06] to-violet-500/[0.04]">
        <p className="text-[12px] text-white/50 leading-relaxed flex-1 min-w-0">
          {t("home.donationSlim")}
        </p>
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
