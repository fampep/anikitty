"use client";

import { useState, type MouseEvent } from "react";
import { EyeOff } from "lucide-react";
import CommentBody from "@/components/comments/comment-body";
import { GifImage } from "@/components/shared/gif-image";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

/** Mask inline ||spoilers|| for blurred whole-comment previews. */
export function maskCommentPreview(body: string): string {
  return body.replace(/\|\|([\s\S]+?)\|\|/g, "██████");
}

type Props = {
  id: string;
  body?: string | null;
  gifUrl?: string | null;
  isSpoiler?: boolean;
  textClassName?: string;
  gifClassName?: string;
  revealedIds?: Set<string>;
  onReveal?: (id: string, e: MouseEvent) => void;
};

export function CommentFeedBody({
  id,
  body,
  gifUrl,
  isSpoiler,
  textClassName,
  gifClassName,
  revealedIds,
  onReveal,
}: Props) {
  const t = useT();
  const [localRevealed, setLocalRevealed] = useState(false);
  const revealed = revealedIds?.has(id) ?? localRevealed;
  const spoilerHidden = Boolean(isSpoiler) && !revealed;

  const reveal = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onReveal) onReveal(id, e);
    else setLocalRevealed(true);
  };

  return (
    <>
      {body ? (
        spoilerHidden ? (
          <div className="relative cursor-pointer select-none" onClick={reveal}>
            <p
              className={cn(
                "blur-sm pointer-events-none leading-relaxed whitespace-pre-wrap break-words",
                textClassName,
              )}
            >
              {maskCommentPreview(body)}
            </p>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground dark:text-white/60 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full border border-border dark:border-white/15">
                <EyeOff className="w-3 h-3 shrink-0" />
                {t("comments.spoilerReveal")}
              </span>
            </div>
          </div>
        ) : (
          <p className={cn("leading-relaxed whitespace-pre-wrap break-words", textClassName)}>
            <CommentBody body={body} />
          </p>
        )
      ) : null}

      {gifUrl ? (
        <div className={cn(body ? "mt-2" : undefined)}>
          {spoilerHidden ? (
            <div className="relative inline-block cursor-pointer" onClick={reveal}>
              <GifImage
                src={gifUrl}
                alt=""
                className={cn(
                  "rounded-xl max-h-40 w-auto max-w-full block ring-1 ring-white/8 blur-md pointer-events-none",
                  gifClassName,
                )}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground dark:text-white/60 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full border border-border dark:border-white/15">
                  <EyeOff className="w-3 h-3 shrink-0" />
                  {t("comments.spoilerReveal")}
                </span>
              </div>
            </div>
          ) : (
            <GifImage
              src={gifUrl}
              alt="GIF"
              className={cn(
                "rounded-xl max-h-40 w-auto max-w-full block ring-1 ring-white/8",
                gifClassName,
              )}
            />
          )}
        </div>
      ) : null}
    </>
  );
}
