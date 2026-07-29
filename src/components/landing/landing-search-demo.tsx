"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { trackEvent } from "@/lib/analytics";

type Suggestion = {
  id: string;
  name: string;
  poster?: string;
  type?: string;
};

const SAMPLE_QUERIES = ["Frieren", "One Piece", "Demon Slayer", "Jujutsu Kaisen"] as const;

export default function LandingSearchDemo() {
  const t = useT();
  const [query, setQuery] = useState<string>(SAMPLE_QUERIES[0]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(() => {
      fetch(`/api/search/suggestion?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          const list = (d.data?.suggestions ?? []) as Array<{
            id: string | number;
            name?: string;
            title?: string;
            poster?: string;
            jname?: string;
            type?: string;
          }>;
          setSuggestions(
            list.slice(0, 5).map((s) => ({
              id: String(s.id),
              name: s.name || s.title || s.jname || String(s.id),
              poster: s.poster,
              type: s.type,
            })),
          );
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <section className="relative z-10 px-4 sm:px-6 md:px-12 py-14 sm:py-16 border-t border-white/[0.06]">
      <div className="max-w-3xl mx-auto">
        <p className="site-label mb-2 text-center">{t("landing.searchLabel")}</p>
        <h2 className="text-xl sm:text-2xl font-bold text-white/90 text-center mb-3">
          {t("landing.searchTitle")}
        </h2>
        <p className="text-sm text-white/40 text-center max-w-md mx-auto mb-8 leading-relaxed">
          {t("landing.searchDesc")}
        </p>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06]">
            <Search className="w-4 h-4 text-white/35 shrink-0" />
            <span className="text-sm text-white/70 font-medium truncate">{query}</span>
          </div>

          <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-white/[0.05]">
            {SAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setQuery(q);
                  trackEvent("landing_search_sample", { q });
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  query === q
                    ? "bg-white/12 text-white border border-white/15"
                    : "bg-white/[0.03] text-white/40 border border-white/[0.06] hover:text-white/70"
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          <ul className="divide-y divide-white/[0.04] min-h-[180px]">
            {loading && suggestions.length === 0
              ? Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="px-4 py-3 animate-pulse">
                    <div className="h-10 rounded-lg bg-white/[0.04]" />
                  </li>
                ))
              : suggestions.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`${ROUTES.ANIME_DETAILS}/${s.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="relative h-10 w-7 shrink-0 overflow-hidden rounded-md bg-white/[0.05] ring-1 ring-white/10">
                        {s.poster ? (
                          <Image src={s.poster} alt="" fill className="object-cover" sizes="28px" unoptimized />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-white/85 truncate">{s.name}</p>
                        {s.type ? (
                          <p className="text-[10px] text-white/30 font-mono uppercase">{s.type}</p>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                ))}
            {!loading && suggestions.length === 0 ? (
              <li className="px-4 py-8 text-center text-[13px] text-white/35">
                {t("landing.searchEmpty")}
              </li>
            ) : null}
          </ul>

          <div className="px-4 py-3 border-t border-white/[0.05]">
            <Link
              href={`${ROUTES.SEARCH}?q=${encodeURIComponent(query)}`}
              prefetch
              className="text-[12px] font-semibold text-white/45 hover:text-white/80 transition-colors"
            >
              {t("landing.searchOpenFull")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
