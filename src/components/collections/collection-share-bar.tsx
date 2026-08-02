"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Download, Share2 } from "lucide-react";
import { withAuth } from "@/lib/auth/auth-fetch";
import { SHARE_TARGETS } from "@/lib/collections/collection-shared";

type Props = {
  collectionId: string;
  url: string;
  title: string;
};

export function CollectionShareBar({ collectionId, url, title }: Props) {
  const [copied, setCopied] = useState(false);
  const shareText = `${title} on AniKitty`;

  // Fire-and-forget: a failed count shouldn't block the share itself.
  const countShare = () => {
    void fetch(`/api/collections/${collectionId}/share`, withAuth({ method: "POST" })).catch(
      () => {},
    );
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      countShare();
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground dark:border-white/10 dark:text-white/50 dark:hover:text-white/85"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy link"}
      </button>

      {SHARE_TARGETS.map((target) => (
        <a
          key={target.id}
          href={target.href(url, shareText)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={countShare}
          className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground dark:border-white/10 dark:text-white/50 dark:hover:text-white/85"
        >
          {target.label}
        </a>
      ))}

      {/* Discord has no web share intent, so this is a copy with a nudge. */}
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground dark:border-white/10 dark:text-white/50 dark:hover:text-white/85"
      >
        <Share2 className="h-3 w-3" />
        Discord
      </button>

      <a
        href={`/api/collections/${collectionId}/export`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground dark:border-white/10 dark:text-white/50 dark:hover:text-white/85"
      >
        <Download className="h-3 w-3" />
        Export
      </a>
    </div>
  );
}
