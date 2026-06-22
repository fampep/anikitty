"use client";

import React, { useState, useRef, useEffect } from "react";
import { SearchIcon, X, ArrowRight } from "lucide-react";
import useDebounce from "@/hooks/use-debounce";
import { useSearchAnime } from "@/query/search-anime";
import Image from "next/image";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const SearchBar = ({
  className,
  onAnimeClick,
}: {
  className?: string;
  onAnimeClick?: () => void;
}) => {
  const [searchValue, setSearchValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const debouncedValue = useDebounce(searchValue, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const { data: searchResults, isLoading } = useSearchAnime(debouncedValue);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClear = () => {
    setSearchValue("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleSelect = () => {
    setSearchValue("");
    setIsOpen(false);
    onAnimeClick?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchValue.trim()) {
      router.push(`${ROUTES.SEARCH}?q=${encodeURIComponent(searchValue.trim())}`);
      handleSelect();
    }
    if (e.key === "Escape") setIsOpen(false);
  };

  const showDropdown = isOpen && searchValue.trim().length > 0;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Input */}
      <div className="relative flex items-center">
        <SearchIcon className="absolute left-3 h-4 w-4 text-green-600 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={searchValue}
          onChange={(e) => {
            setSearchValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search anime..."
          className="w-full h-9 pl-9 pr-8 bg-green-950/40 border border-green-900/60 rounded-lg text-sm text-green-100 placeholder-green-700 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-800 transition-colors"
        />
        {searchValue && (
          <button
            onClick={handleClear}
            className="absolute right-2.5 text-green-700 hover:text-green-400 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-[calc(100%+6px)] left-0 w-full z-50 bg-[#020f04] border border-green-900/60 rounded-lg shadow-xl shadow-black/50 overflow-hidden">
          {/* Loading skeletons */}
          {isLoading && (
            <div className="flex flex-col gap-0 p-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-md animate-pulse">
                  <div className="h-14 w-10 bg-green-950/60 rounded shrink-0" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="h-3 bg-green-950/60 rounded w-3/4" />
                    <div className="h-2.5 bg-green-950/40 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {!isLoading && searchResults && searchResults.length > 0 && (
            <div className="flex flex-col">
              {searchResults.map((anime) => (
                <Link
                  key={anime.id}
                  href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
                  onClick={handleSelect}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-green-950/50 transition-colors group"
                >
                  <div className="h-14 w-10 overflow-hidden rounded shrink-0 bg-green-950/40">
                    {anime.poster && (
                      <Image
                        src={anime.poster}
                        alt={anime.name}
                        height={56}
                        width={40}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <p className="text-sm text-green-100 font-medium line-clamp-1 group-hover:text-green-300 transition-colors">
                      {anime.name || anime.jname}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-green-700">
                      {anime.type && (
                        <span className="bg-green-900/40 px-1.5 py-0.5 rounded text-green-500 font-mono text-[10px]">
                          {anime.type}
                        </span>
                      )}
                      {anime.moreInfo?.join(" · ")}
                    </div>
                  </div>
                </Link>
              ))}

              {/* View all */}
              <Link
                href={`${ROUTES.SEARCH}?q=${encodeURIComponent(searchValue.trim())}`}
                onClick={handleSelect}
                className="flex items-center justify-between px-3 py-2.5 border-t border-green-900/40 text-green-500 hover:text-green-300 hover:bg-green-950/30 transition-colors text-sm font-medium"
              >
                <span>View all results for &ldquo;{searchValue.trim()}&rdquo;</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {/* No results */}
          {!isLoading && debouncedValue && (!searchResults || searchResults.length === 0) && (
            <div className="px-4 py-6 text-center">
              <p className="text-green-700 text-sm">No results for &ldquo;{debouncedValue}&rdquo;</p>
              <Link
                href={`${ROUTES.SEARCH}?q=${encodeURIComponent(searchValue.trim())}`}
                onClick={handleSelect}
                className="text-green-500 hover:text-green-300 text-xs mt-1 inline-block"
              >
                Browse all anime →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
