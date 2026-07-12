"use client";

import React, { useId, useState, useRef, useEffect } from "react";
import { SearchIcon, X, ArrowRight } from "lucide-react";
import useDebounce from "@/hooks/use-debounce";
import { useSearchAnime } from "@/query/search/search-anime";
import Image from "next/image";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/core/utils";
import { useRouter } from "next/navigation";
import { useT } from "@/providers/i18n-provider";

const SearchBar = ({
  className,
  onAnimeClick,
  autoFocus,
  defaultValue = "",
  onSubmitQuery,
}: {
  className?: string;
  onAnimeClick?: () => void;
  autoFocus?: boolean;
  defaultValue?: string;
  onSubmitQuery?: (query: string) => void;
}) => {
  const t = useT();
  const [searchValue, setSearchValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debouncedValue = useDebounce(searchValue, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const listboxId = useId();
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  const { data: searchResults, isLoading } = useSearchAnime(debouncedValue);

  const results = searchResults ?? [];
  const hasResults = results.length > 0;
  // Navigable rows: each result plus a trailing "view all results" row.
  const optionCount = hasResults ? results.length + 1 : 0;
  const viewAllIndex = hasResults ? results.length : -1;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!autoFocus) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [autoFocus]);

  useEffect(() => {
    setSearchValue(defaultValue);
  }, [defaultValue]);

  // Reset the highlighted option whenever the result set or query changes.
  useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedValue, searchResults]);

  const handleClear = () => {
    setSearchValue("");
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleSelect = () => {
    setSearchValue("");
    setIsOpen(false);
    setActiveIndex(-1);
    onAnimeClick?.();
  };

  const submitQuery = () => {
    const q = searchValue.trim();
    if (!q) return;
    if (onSubmitQuery) {
      onSubmitQuery(q);
    } else {
      router.push(`${ROUTES.SEARCH}?q=${encodeURIComponent(q)}`);
    }
    handleSelect();
  };

  const navigateToOption = (index: number) => {
    if (index === viewAllIndex) {
      router.push(`${ROUTES.SEARCH}?q=${encodeURIComponent(searchValue.trim())}`);
      handleSelect();
      return;
    }
    const anime = results[index];
    if (!anime) return;
    router.push(`${ROUTES.ANIME_DETAILS}/${anime.id}`);
    handleSelect();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (e.key === "ArrowDown" && optionCount > 0) {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => (prev + 1) % optionCount);
      return;
    }

    if (e.key === "ArrowUp" && optionCount > 0) {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => (prev <= 0 ? optionCount - 1 : prev - 1));
      return;
    }

    if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < optionCount) {
        e.preventDefault();
        navigateToOption(activeIndex);
        return;
      }
      if (searchValue.trim()) submitQuery();
    }
  };

  const showDropdown = isOpen && searchValue.trim().length > 0;

  // Keep the highlighted option scrolled into view during keyboard nav.
  useEffect(() => {
    if (activeIndex < 0) return;
    document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: "nearest" });
    // optionId is stable per render; listboxId is stable for the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative flex items-center">
        <SearchIcon className="absolute left-3 h-4 w-4 text-muted-foreground dark:text-white/40 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            showDropdown && activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
          value={searchValue}
          onChange={(e) => {
            setSearchValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t("search.placeholder")}
          className="w-full h-9 pl-9 pr-8 bg-accent dark:bg-white/[0.06] border border-border dark:border-white/[0.1] rounded-xl text-sm text-foreground dark:text-white/90 placeholder:text-muted-foreground dark:placeholder:text-white/35 focus:outline-none focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/20 transition-all"
        />
        {searchValue && (
          <button
            type="button"
            onClick={handleClear}
            aria-label={t("search.clear")}
            className="absolute right-2.5 text-muted-foreground dark:text-white/35 hover:text-foreground dark:hover:text-white/70 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute top-[calc(100%+8px)] left-0 z-50 max-h-[70vh] overflow-y-auto overscroll-contain w-full rounded-2xl border border-border dark:border-white/[0.08] bg-[#0a0a10] shadow-[0_16px_48px_rgba(0,0,0,0.7)]"
        >
          {isLoading && (
            <div className="flex flex-col gap-0 p-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-md animate-pulse">
                  <div className="h-14 w-10 bg-accent dark:bg-white/8 rounded shrink-0" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="h-3 bg-accent dark:bg-white/8 rounded w-3/4" />
                    <div className="h-2.5 bg-muted/50 dark:bg-white/5 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && hasResults && (
            <div className="flex flex-col">
              {results.map((anime, index) => (
                <Link
                  key={anime.id}
                  id={optionId(index)}
                  href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
                  role="option"
                  aria-selected={activeIndex === index}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={handleSelect}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 transition-colors group",
                    activeIndex === index
                      ? "bg-accent dark:bg-white/10"
                      : "hover:bg-accent dark:hover:bg-white/8",
                  )}
                >
                  <div className="h-14 w-10 overflow-hidden rounded shrink-0 bg-accent dark:bg-white/8">
                    {anime.poster && (
                      <Image
                        src={anime.poster}
                        alt={anime.name}
                        height={56}
                        width={40}
                        sizes="40px"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <p className="text-sm text-foreground dark:text-white/85 font-medium line-clamp-1 group-hover:text-foreground dark:hover:text-white transition-colors">
                      {anime.name || anime.jname}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground dark:text-white/40">
                      {anime.type && (
                        <span className="bg-accent dark:bg-white/10 px-1.5 py-0.5 rounded text-muted-foreground dark:text-white/60 font-mono text-[10px]">
                          {anime.type}
                        </span>
                      )}
                      {anime.moreInfo?.join(" · ")}
                    </div>
                  </div>
                </Link>
              ))}

              <Link
                id={optionId(viewAllIndex)}
                href={`${ROUTES.SEARCH}?q=${encodeURIComponent(searchValue.trim())}`}
                role="option"
                aria-selected={activeIndex === viewAllIndex}
                onMouseEnter={() => setActiveIndex(viewAllIndex)}
                onClick={handleSelect}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 border-t border-border dark:border-white/10 text-muted-foreground dark:text-white/50 hover:text-foreground/90 dark:hover:text-white/80 transition-colors text-sm font-medium",
                  activeIndex === viewAllIndex
                    ? "bg-muted/50 dark:bg-white/5 text-foreground/90 dark:text-white/80"
                    : "hover:bg-muted/50 dark:hover:bg-white/5",
                )}
              >
                <span>{t("search.viewAllResults", { query: searchValue.trim() })}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {!isLoading && debouncedValue && (!searchResults || searchResults.length === 0) && (
            <div className="px-4 py-6 text-center">
              <p className="text-muted-foreground dark:text-white/35 text-sm">{t("search.noResultsFor", { query: debouncedValue })}</p>
              <Link
                href={`${ROUTES.SEARCH}?q=${encodeURIComponent(searchValue.trim())}`}
                onClick={handleSelect}
                className="text-muted-foreground dark:text-white/50 hover:text-foreground/90 dark:hover:text-white/80 text-xs mt-1 inline-block"
              >
                {t("search.browseAllLink")}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
