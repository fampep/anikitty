"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CirclePlay, XIcon } from "lucide-react";
import Button from "@/components/common/custom-button";
import { AnimatePresence, motion } from "framer-motion";
import { useT } from "@/providers/i18n-provider";
import { toYoutubeEmbedUrl } from "@/lib/core/youtube-embed";

const WatchTrailer = ({ videoHref, inline }: { videoHref?: string; inline?: boolean }) => {
  const t = useT();
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const baseEmbedUrl = useMemo(
    () => (videoHref ? toYoutubeEmbedUrl(videoHref) : null),
    [videoHref],
  );

  const embedUrl = useMemo(
    () => (videoHref ? toYoutubeEmbedUrl(videoHref, isVideoOpen) : null),
    [videoHref, isVideoOpen],
  );

  useEffect(() => {
    if (!isVideoOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsVideoOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isVideoOpen]);

  if (!baseEmbedUrl) return null;

  return (
    <>
      <Button
        className={
          inline
            ? "hidden md:flex w-full sm:w-auto shrink-0"
            : "absolute md:flex hidden md:bottom-10 md:right-10 bottom-4 right-4 m-auto z-10"
        }
        LeftIcon={CirclePlay}
        onClick={() => setIsVideoOpen(true)}
      >
        {t("anime.watchTrailer")}
      </Button>
      <AnimatePresence>
        {isVideoOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsVideoOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-muted/80 dark:bg-black/50 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full max-w-4xl aspect-video"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label={t("common.close")}
                onClick={() => setIsVideoOpen(false)}
                className="absolute -top-12 right-0 text-foreground dark:text-white bg-neutral-900/50 ring-1 ring-white/10 backdrop-blur-md rounded-full p-2 dark:bg-neutral-100/50 dark:text-black hover:bg-neutral-800/70 transition-colors"
              >
                <XIcon className="size-5" />
              </button>
              <div className="size-full border-2 border-white rounded-2xl overflow-hidden bg-black">
                <iframe
                  src={embedUrl ?? baseEmbedUrl}
                  title={t("anime.watchTrailer")}
                  className="size-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default WatchTrailer;
