"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import useDebounce from "@/hooks/use-debounce";
import { Mic, Search, Loader2 } from "lucide-react";
import { useT } from "@/providers/i18n-provider";

type VaResult = {
  id: number;
  name: string;
  native: string | null;
  image: string | null;
  language: string | null;
};

const LANGUAGE_KEYS = [
  { value: "", labelKey: "voiceActorsPage.allLanguages" },
  { value: "Japanese", labelKey: "voiceActorsPage.langJapanese" },
  { value: "English", labelKey: "voiceActorsPage.langEnglish" },
  { value: "Korean", labelKey: "voiceActorsPage.langKorean" },
  { value: "Chinese", labelKey: "voiceActorsPage.langChinese" },
  { value: "Spanish", labelKey: "voiceActorsPage.langSpanish" },
  { value: "French", labelKey: "voiceActorsPage.langFrench" },
  { value: "German", labelKey: "voiceActorsPage.langGerman" },
] as const;

export default function VoiceActorsPage() {
  const t = useT();
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("");
  const [results, setResults] = useState<VaResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const debounced = useDebounce(query, 350);

  useEffect(() => {
    if (debounced.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch(`/api/voice-actors/search?q=${encodeURIComponent(debounced)}&language=${encodeURIComponent(language)}`)
      .then((r) => r.json())
      .then((d: { results?: VaResult[]; error?: string }) => {
        if (cancelled) return;
        setResults(d.results ?? []);
        if (d.error) setError(true);
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced, language]);

  const showEmpty = useMemo(
    () => !loading && debounced.trim().length >= 2 && results.length === 0,
    [loading, debounced, results.length],
  );

  return (
    <Container className="mt-16 sm:mt-20 pb-24 max-w-4xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-zinc-300">
          <Mic className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-bold text-foreground dark:text-white tracking-tight">
          {t("voiceActorsPage.title")}
        </h1>
      </div>
      <p className="text-sm text-muted-foreground dark:text-white/45 mb-6">
        {t("voiceActorsPage.subtitle")}
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-white/35 pointer-events-none" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("voiceActorsPage.searchPlaceholder")}
            className="w-full rounded-xl border border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.03] pl-10 pr-3 py-2.5 text-sm text-foreground dark:text-white/85 placeholder:text-muted-foreground/70 dark:placeholder:text-white/25 focus:outline-none focus:border-primary/40"
          />
        </div>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label={t("voiceActorsPage.languageFilter")}
          className="rounded-xl border border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.03] px-3 py-2.5 text-sm text-foreground dark:text-white/85 focus:outline-none focus:border-primary/40"
        >
          {LANGUAGE_KEYS.map((l) => (
            <option key={l.value || "all"} value={l.value}>
              {t(l.labelKey)}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex justify-center py-16 text-muted-foreground dark:text-white/40">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {error && !loading && (
        <p className="py-10 text-center text-sm text-muted-foreground dark:text-white/40 font-mono">
          {t("voiceActorsPage.searchUnavailable")}
        </p>
      )}

      {showEmpty && !error && (
        <p className="py-10 text-center text-sm text-muted-foreground dark:text-white/35 font-mono">
          {t("voiceActorsPage.noResults", { query: debounced })}
        </p>
      )}

      {!loading && debounced.trim().length < 2 && (
        <p className="py-10 text-center text-sm text-muted-foreground/70 dark:text-white/25 font-mono">
          {t("voiceActorsPage.minChars")}
        </p>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {results.map((va) => (
            <Link
              key={va.id}
              href={`${ROUTES.VOICE_ACTOR}/${va.id}`}
              className="group flex items-center gap-3 rounded-xl border border-border dark:border-white/8 bg-muted/20 dark:bg-white/[0.02] p-2.5 hover:border-primary/30 hover:bg-primary/[0.04] transition-colors"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
                {va.image ? (
                  <Image src={va.image} alt={va.name} fill sizes="48px" className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary/10 text-zinc-300">
                    <Mic className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-foreground/90 dark:text-white/85 line-clamp-1 group-hover:text-zinc-200">
                  {va.name}
                </p>
                {va.language && (
                  <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground/70 dark:text-white/30">
                    {va.language}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
