"use client";

import { useEffect, useRef, useState } from "react";
import { GifImage } from "@/components/shared/gif-image";

export function GifUrlPanel({
  onAttach,
  onClose,
}: {
  onAttach: (url: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const isValid = url.trim().startsWith("http");

  return (
    <div
      ref={panelRef}
      className="absolute bottom-full mb-2 left-0 z-50 w-80 rounded-xl border border-border dark:border-white/10 bg-[#0d0d0d] shadow-2xl shadow-black/80 overflow-hidden"
    >
      <div className="px-4 pt-3.5 pb-3 border-b border-border dark:border-white/6">
        <p className="text-[10px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-widest mb-2.5">Attach GIF</p>
        <input
          ref={inputRef}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && isValid && (onAttach(url.trim()), onClose())
          }
          placeholder="https://media.giphy.com/…"
          className="w-full bg-muted/50 dark:bg-white/5 border border-border dark:border-white/8 rounded-lg px-3 py-2 text-sm text-foreground dark:text-white placeholder:text-muted-foreground/70 dark:placeholder:text-white/20 outline-none focus:border-white/22 transition-colors"
        />
      </div>
      {isValid && (
        <div className="px-4 py-3 border-b border-border dark:border-white/6 bg-muted/30 dark:bg-white/[0.02]">
          <GifImage
            src={url.trim()}
            alt="preview"
            className="max-h-28 w-auto rounded-lg block"
          />
        </div>
      )}
      <div className="flex items-center justify-end gap-2 px-4 py-2.5">
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground/80 dark:text-white/25 hover:text-muted-foreground dark:text-white/50 transition-colors px-2 py-1"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            if (isValid) {
              onAttach(url.trim());
              onClose();
            }
          }}
          disabled={!isValid}
          className="px-3.5 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-white/90 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
        >
          Attach
        </button>
      </div>
    </div>
  );
}
