"use client";

import Link from "next/link";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { DISCORD_INVITE_URL, FAQ_LAST_UPDATED } from "@/constants/site-meta";
import { useT } from "@/providers/i18n-provider";
import {
  HelpCircle,
  Tv2,
  User,
  MessageSquare,
  Shield,
  Database,
  ExternalLink,
  Coffee,
} from "lucide-react";
import { cn } from "@/lib/core/utils";

type FaqItem = { q: string; a: string };
type FaqSection = { id: string; title: string; icon: React.ReactNode; items: FaqItem[] };

function FaqBlock({ item }: { item: FaqItem }) {
  return (
    <details className="group site-panel overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-foreground dark:text-white/85 hover:bg-muted/40 dark:bg-white/[0.03] transition-colors [&::-webkit-details-marker]:hidden">
        <span>{item.q}</span>
        <span className="text-muted-foreground/80 dark:text-white/25 text-lg leading-none group-open:rotate-45 transition-transform shrink-0">
          +
        </span>
      </summary>
      <div className="px-5 pb-4 pt-0 text-sm text-muted-foreground dark:text-white/50 leading-relaxed border-t border-border dark:border-white/[0.06]">
        <div className="pt-3">{item.a}</div>
      </div>
    </details>
  );
}

export default function FaqContent() {
  const t = useT();

  const sections: FaqSection[] = [
    {
      id: "basics",
      title: t("faq.sections.basics"),
      icon: <HelpCircle className="w-4 h-4" />,
      items: [
        { q: t("faq.basics.whatIsQ"), a: t("faq.basics.whatIsA") },
        { q: t("faq.basics.accountQ"), a: t("faq.basics.accountA") },
        { q: t("faq.basics.freeQ"), a: t("faq.basics.freeA") },
      ],
    },
    {
      id: "watching",
      title: t("faq.sections.watching"),
      icon: <Tv2 className="w-4 h-4" />,
      items: [
        { q: t("faq.watching.streamingQ"), a: t("faq.watching.streamingA") },
        { q: t("faq.watching.providersQ"), a: t("faq.watching.providersA") },
        { q: t("faq.watching.subDubQ"), a: t("faq.watching.subDubA") },
        { q: t("faq.watching.playerSettingsQ"), a: t("faq.watching.playerSettingsA") },
        { q: t("faq.watching.continueQ"), a: t("faq.watching.continueA") },
        { q: t("faq.watching.recommendationsQ"), a: t("faq.watching.recommendationsA") },
        { q: t("faq.watching.recentlyViewedQ"), a: t("faq.watching.recentlyViewedA") },
        { q: t("faq.watching.voiceActorsQ"), a: t("faq.watching.voiceActorsA") },
        { q: t("faq.watching.anilistQ"), a: t("faq.watching.anilistA") },
        { q: t("faq.watching.subtitlesQ"), a: t("faq.watching.subtitlesA") },
        { q: t("faq.watching.scheduleQ"), a: t("faq.watching.scheduleA") },
      ],
    },
    {
      id: "account",
      title: t("faq.sections.account"),
      icon: <User className="w-4 h-4" />,
      items: [
        { q: t("faq.accountSection.createQ"), a: t("faq.accountSection.createA") },
        { q: t("faq.accountSection.profileQ"), a: t("faq.accountSection.profileA") },
        { q: t("faq.accountSection.ninjaQ"), a: t("faq.accountSection.ninjaA") },
        { q: t("faq.accountSection.levelsQ"), a: t("faq.accountSection.levelsA") },
        { q: t("faq.accountSection.achievementsQ"), a: t("faq.accountSection.achievementsA") },
        { q: t("faq.accountSection.passkeysQ"), a: t("faq.accountSection.passkeysA") },
        { q: t("faq.accountSection.twoFactorQ"), a: t("faq.accountSection.twoFactorA") },
        { q: t("faq.accountSection.sessionsQ"), a: t("faq.accountSection.sessionsA") },
      ],
    },
    {
      id: "community",
      title: t("faq.sections.community"),
      icon: <MessageSquare className="w-4 h-4" />,
      items: [
        { q: t("faq.community.chatQ"), a: t("faq.community.chatA") },
        { q: t("faq.community.forumQ"), a: t("faq.community.forumA") },
        { q: t("faq.community.commentsQ"), a: t("faq.community.commentsA") },
        { q: t("faq.community.followQ"), a: t("faq.community.followA") },
        { q: t("faq.community.friendsQ"), a: t("faq.community.friendsA") },
        { q: t("faq.community.notificationsQ"), a: t("faq.community.notificationsA") },
        { q: t("faq.community.blockQ"), a: t("faq.community.blockA") },
        { q: t("faq.community.reportQ"), a: t("faq.community.reportA") },
        { q: t("faq.community.w2gQ"), a: t("faq.community.w2gA") },
      ],
    },
    {
      id: "support",
      title: t("faq.sections.support"),
      icon: <Coffee className="w-4 h-4" />,
      items: [
        { q: t("faq.support.adsQ"), a: t("faq.support.adsA") },
        { q: t("faq.support.disableQ"), a: t("faq.support.disableA") },
        { q: t("faq.support.kofiQ"), a: t("faq.support.kofiA") },
      ],
    },
    {
      id: "privacy",
      title: t("faq.sections.privacy"),
      icon: <Database className="w-4 h-4" />,
      items: [
        { q: t("faq.privacy.dataQ"), a: t("faq.privacy.dataA") },
        { q: t("faq.privacy.browserQ"), a: t("faq.privacy.browserA") },
        { q: t("faq.privacy.thirdPartyQ"), a: t("faq.privacy.thirdPartyA") },
        { q: t("faq.privacy.notDoQ"), a: t("faq.privacy.notDoA") },
        { q: t("faq.privacy.deleteQ"), a: t("faq.privacy.deleteA") },
        { q: t("faq.privacy.cookiesQ"), a: t("faq.privacy.cookiesA") },
      ],
    },
    {
      id: "security",
      title: t("faq.sections.security"),
      icon: <Shield className="w-4 h-4" />,
      items: [
        { q: t("faq.security.passwordQ"), a: t("faq.security.passwordA") },
        { q: t("faq.security.httpsQ"), a: t("faq.security.httpsA") },
        { q: t("faq.security.rateLimitQ"), a: t("faq.security.rateLimitA") },
        { q: t("faq.security.moderationQ"), a: t("faq.security.moderationA") },
      ],
    },
  ];

  const lastUpdated = t("faq.lastUpdated", {
    date: new Date(FAQ_LAST_UPDATED).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  });

  return (
    <div className="min-h-screen pt-8 pb-24">
      <Container className="max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-0.5 h-6 bg-muted/30 dark:bg-white/35 shrink-0" />
          <HelpCircle className="w-5 h-5 text-muted-foreground dark:text-white/50" />
          <h1 className="text-2xl md:text-3xl font-bold text-foreground dark:text-white tracking-tight">{t("faq.title")}</h1>
        </div>
        <p className="text-sm text-muted-foreground dark:text-white/35 font-mono ml-[1.375rem] pl-8 mb-10 max-w-2xl leading-relaxed">
          {t("faq.subtitle")} {lastUpdated}.
        </p>

        <nav className="flex flex-wrap gap-2 mb-10">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.03] text-muted-foreground dark:text-white/45 hover:text-foreground/90 dark:text-white/80 hover:border-border dark:border-white/20 transition-colors"
            >
              {s.icon}
              {s.title}
            </a>
          ))}
        </nav>

        <div className="flex flex-col gap-12">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="text-violet-400/70">{section.icon}</span>
                <h2 className="text-lg font-bold text-foreground dark:text-white/90">{section.title}</h2>
              </div>
              <div className="flex flex-col gap-2">
                {section.items.map((item) => (
                  <FaqBlock key={item.q} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className={cn("mt-14 site-panel p-5 sm:p-6")}>
          <p className="text-sm font-semibold text-foreground/90 dark:text-white/80 mb-2">{t("faq.stillQuestions")}</p>
          <p className="text-sm text-muted-foreground dark:text-white/45 leading-relaxed mb-4">{t("faq.contactDesc")}</p>
          <div className="flex flex-wrap gap-3">
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 dark:bg-white/5 border border-border dark:border-white/12 text-sm text-muted-foreground dark:text-white/70 hover:bg-accent dark:hover:bg-white/8 hover:text-foreground dark:hover:text-white transition-colors"
            >
              {t("footer.discord")}
              <ExternalLink className="w-3.5 h-3.5 opacity-50" />
            </a>
            <a
              href="https://github.com/fampep/anikitty"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 dark:bg-white/5 border border-border dark:border-white/12 text-sm text-muted-foreground dark:text-white/70 hover:bg-accent dark:hover:bg-white/8 hover:text-foreground dark:hover:text-white transition-colors"
            >
              {t("footer.github")}
              <ExternalLink className="w-3.5 h-3.5 opacity-50" />
            </a>
            <Link
              href={ROUTES.SETTINGS}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/20 border border-violet-400/25 text-sm text-violet-200 hover:bg-violet-600/30 transition-colors"
            >
              {t("faq.accountSettings")}
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
