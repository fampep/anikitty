"use client";

import Link from "next/link";
import { Coffee, ExternalLink, Heart } from "lucide-react";
import Container from "@/components/layout/container";
import CommunityHero from "@/components/community/community-hero";
import { useT } from "@/providers/i18n-provider";
import {
  KOFI_URL,
  kofiDonationUrl,
  kofiDonationUrlForUsername,
} from "@/lib/social/donation-config";
import { useAuthStore } from "@/store/auth-store";
import { ROUTES } from "@/constants/routes";

export default function DonationContent() {
  const t = useT();
  const { auth } = useAuthStore();
  const username = auth?.username ?? "";

  const kofiPayUrl = username
    ? kofiDonationUrlForUsername(username)
    : kofiDonationUrl();

  return (
    <div className="flex min-h-screen flex-col pb-12 pb-safe pt-page">
      <Container className="max-w-2xl flex flex-col gap-6">
        <CommunityHero
          icon={<Coffee className="w-5 h-5" />}
          title={t("donate.title")}
          subtitle={t("donate.subtitle")}
        >
          <a
            href={kofiPayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="site-brand-btn px-4 py-2.5 text-sm hover:from-violet-500 hover:to-violet-400"
          >
            <Coffee className="w-4 h-4" />
            {t("donate.donateCta")}
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
        </CommunityHero>

        <section className="site-panel p-5 sm:p-6 space-y-4">
          <p className="text-sm text-white/55 leading-relaxed">{t("donate.body")}</p>
          <p className="text-sm text-white/45 leading-relaxed">{t("donate.faqVoluntary")}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href={kofiPayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="site-brand-btn px-5 py-2.5 text-sm"
            >
              <Heart className="w-4 h-4" />
              {t("donate.supportOnKofi")}
            </a>
            <a
              href={KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="site-ghost-btn py-2.5"
            >
              {t("donate.kofiCta")}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <Link href={ROUTES.FAQ} className="site-ghost-btn py-2.5">
              {t("donate.readFaq")}
            </Link>
          </div>
        </section>
      </Container>
    </div>
  );
}
