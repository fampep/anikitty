"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import type { FaqItem } from "@/lib/faq/types";
import { useT } from "@/providers/i18n-provider";

/** Compact seeded fallback when `/api/faq` is empty (no full FAQ seed on the client). */
const FALLBACK = [
  {
    id: "what-is-anikitty",
    title: "What is AniKitty?",
    answer:
      "AniKitty is a free, ad-free anime streaming site with no subscription paywall. Browse the catalog, watch episodes in sub or dub where available, and join community features when signed in.",
  },
  {
    id: "do-i-need-an-account",
    title: "Do I need an account?",
    answer:
      "No — you can browse and watch without signing in. An account unlocks watchlist, synced progress, comments, forum, and more.",
  },
  {
    id: "is-anikitty-free",
    title: "Is AniKitty really free?",
    answer:
      "Yes. There is no paid subscription and no ads. Watching stays free for everyone. Optional Ko-fi tips unlock donator rank.",
  },
  {
    id: "how-streaming-works",
    title: "How does streaming work?",
    answer:
      "AniKitty does not host video files — streams are resolved through third-party sources via KittyAPI with multi-source playback.",
  },
  {
    id: "how-create-account",
    title: "How do I create an account?",
    answer:
      "Use the Log in button, switch to Create account, and sign up with a username, email, and password — or connect Discord when available.",
  },
] as const;

function firstParagraph(answer: string, max = 160) {
  const plain = answer
    .replace(/\*\*/g, "")
    .replace(/^[-*]\s+/gm, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)[0] ?? "";
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max - 1)}…`;
}

export default function LandingFaq() {
  const t = useT();
  const [items, setItems] = useState<{ id: string; title: string; answer: string }[]>([...FALLBACK]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/faq")
      .then((r) => r.json())
      .then((data: { articles?: FaqItem[] }) => {
        if (cancelled) return;
        const articles = (data.articles ?? [])
          .slice()
          .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
          .slice(0, 5)
          .map((a) => ({ id: a.id, title: a.title, answer: a.answer }));
        if (articles.length) setItems(articles);
      })
      .catch(() => {
        /* keep seeded fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="relative z-10 px-4 sm:px-6 md:px-12 py-14 sm:py-16 border-t border-white/[0.06]">
      <div className="max-w-3xl mx-auto">
        <p className="site-label mb-2 text-center">{t("landing.faqLabel")}</p>
        <h2 className="text-xl sm:text-2xl font-bold text-white/90 text-center mb-3">
          {t("landing.faqTitle")}
        </h2>
        <p className="text-sm text-white/40 text-center mb-8 leading-relaxed">
          {t("landing.faqDesc")}
        </p>

        <ul className="space-y-2">
          {items.map((item) => {
            const open = openId === item.id;
            return (
              <li
                key={item.id}
                className="rounded-xl border border-white/[0.07] bg-white/[0.025] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                  aria-expanded={open}
                >
                  <span className="text-[13px] sm:text-sm font-semibold text-white/85">
                    {item.title}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 text-white/35 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open ? (
                  <div className="px-4 pb-4">
                    <p className="text-[13px] text-white/45 leading-relaxed mb-3">
                      {firstParagraph(item.answer)}
                    </p>
                    <Link
                      href={`${ROUTES.FAQ}#${item.id}`}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-white/50 hover:text-white/80 transition-colors"
                    >
                      {t("landing.faqReadMore")}
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        <div className="mt-6 text-center">
          <Link
            href={ROUTES.FAQ}
            prefetch
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/40 hover:text-white/75 transition-colors"
          >
            {t("landing.faqAll")}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
