"use client";

import { ArrowRight, MessageSquare, X } from "lucide-react";
import { ANNOUNCEMENT_STYLES } from "@/lib/announcements/announcement-styles";
import { cn } from "@/lib/core/utils";

export default function AnnouncementPreview({
  title,
  body,
  severity,
  dismissible,
  linkLabel,
  showForumLink,
}: {
  title: string;
  body: string;
  severity: string;
  dismissible: boolean;
  linkLabel?: string;
  showForumLink?: boolean;
}) {
  if (!title.trim()) {
    return (
      <p className="text-[11px] font-mono text-muted-foreground/70 dark:text-white/25">
        Enter a title to preview the banner.
      </p>
    );
  }

  const style = ANNOUNCEMENT_STYLES[severity] ?? ANNOUNCEMENT_STYLES.info;
  const Icon = style.icon;
  const cta = linkLabel?.trim() || (showForumLink ? "Read more" : "Learn more");

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-3 py-1.5 rounded-lg border backdrop-blur-md",
        style.bg,
        style.border,
      )}
    >
      <Icon className={cn("w-3.5 h-3.5 shrink-0", style.iconColor)} />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
        <p className={cn("text-[12px] font-semibold", style.text)}>{title}</p>
        {body.trim() && (
          <p className="text-[11px] text-muted-foreground dark:text-white/55 line-clamp-2 sm:truncate sm:line-clamp-1">
            {body}
          </p>
        )}
      </div>
      {(linkLabel?.trim() || showForumLink) && (
        <span className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1 rounded-lg border border-border dark:border-white/15 bg-accent dark:bg-white/[0.06] text-foreground dark:text-white">
          {showForumLink ? <MessageSquare className="w-3 h-3" /> : null}
          {cta}
          <ArrowRight className="w-3 h-3" />
        </span>
      )}
      {dismissible && (
        <span className="shrink-0 p-1 rounded-md text-muted-foreground dark:text-white/40">
          <X className="w-3.5 h-3.5" />
        </span>
      )}
    </div>
  );
}
