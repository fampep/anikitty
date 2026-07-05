"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Info, AlertTriangle, AlertOctagon, CheckCircle2, X, MessageSquare, ArrowRight, Megaphone } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useSettingsStore } from "@/store/settings-store";
import { cn } from "@/lib/core/utils";

interface Announcement {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warn" | "critical" | "success" | string;
  dismissible: boolean;
  linkUrl: string | null;
  linkLabel: string | null;
  forumThreadId: string | null;
}

const STYLES: Record<string, { bg: string; border: string; text: string; icon: React.ElementType; iconColor: string }> = {
  info:     { bg: "bg-sky-500/[0.07]",     border: "border-sky-500/25",     text: "text-sky-100",     icon: Info,           iconColor: "text-sky-300" },
  warn:     { bg: "bg-amber-500/[0.08]",   border: "border-amber-500/25",   text: "text-amber-100",   icon: AlertTriangle,  iconColor: "text-amber-300" },
  critical: { bg: "bg-rose-500/[0.10]",    border: "border-rose-500/30",    text: "text-rose-100",    icon: AlertOctagon,   iconColor: "text-rose-300" },
  success:  { bg: "bg-emerald-500/[0.08]", border: "border-emerald-500/25", text: "text-emerald-100", icon: CheckCircle2,   iconColor: "text-emerald-300" },
  promo:    { bg: "bg-violet-500/[0.08]",  border: "border-violet-500/25",  text: "text-violet-100",  icon: Megaphone,      iconColor: "text-violet-300" },
};

const DISMISSED_KEY = "anikitty:dismissedAnnouncements";

function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeDismissed(set: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore */
  }
}

export default function SiteAnnouncementBanner() {
  const pathname = usePathname();
  const showAnnouncementBanner = useSettingsStore((s) => s.showAnnouncementBanner);
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const lastOffsetRef = useRef(0);

  useEffect(() => {
    setDismissed(readDismissed());
    setHydrated(true);
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data.announcements) ? data.announcements : []))
      .catch(() => {});
  }, []);

  const handleDismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      writeDismissed(next);
      return next;
    });
  };

  const hideOnPage = !hydrated || !showAnnouncementBanner || pathname === "/" || pathname?.startsWith("/anime/watch");

  const visible = useMemo(() => {
    if (hideOnPage) return [];
    return items.filter((a) => !(a.dismissible && dismissed.has(a.id)));
  }, [hideOnPage, items, dismissed]);

  const visibleKey = useMemo(() => visible.map((a) => a.id).join(","), [visible]);

  useLayoutEffect(() => {
    const applyOffset = (rawHeight: number) => {
      const offset = rawHeight > 0 ? rawHeight + 8 : 0;
      if (offset === lastOffsetRef.current) return;
      lastOffsetRef.current = offset;
      document.documentElement.style.setProperty("--banner-offset", `${offset}px`);
      if (spacerRef.current) {
        spacerRef.current.style.height = `${offset}px`;
      }
    };

    if (visible.length === 0) {
      applyOffset(0);
      return;
    }

    const measure = () => {
      applyOffset(bannerRef.current?.offsetHeight ?? 0);
    };

    measure();

    const el = bannerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      ro.disconnect();
      lastOffsetRef.current = 0;
      document.documentElement.style.setProperty("--banner-offset", "0px");
      if (spacerRef.current) spacerRef.current.style.height = "0px";
    };
  }, [visibleKey, visible.length]);

  if (hideOnPage || visible.length === 0) return null;

  return (
    <>
      <div ref={spacerRef} aria-hidden className="shrink-0" />
      <div
        ref={bannerRef}
        className="pointer-events-none fixed left-0 right-0 top-[var(--nav-height)] z-[90] flex flex-col gap-1 px-2 pt-2 sm:px-4"
      >
        {visible.map((a) => {
          const style = STYLES[a.severity] ?? STYLES.info;
          const Icon = style.icon;
          const href = a.linkUrl ?? (a.forumThreadId ? `${ROUTES.FORUM}/${a.forumThreadId}` : null);
          const linkLabel = a.linkLabel ?? (a.forumThreadId ? "Read more" : "Learn more");

          return (
            <div
              key={a.id}
              className={cn(
                "pointer-events-auto mx-auto w-full max-w-[1400px] flex items-center gap-2.5 px-3 py-1.5 rounded-lg border backdrop-blur-md shadow-lg shadow-black/20",
                style.bg,
                style.border,
              )}
            >
              <Icon className={cn("w-3.5 h-3.5 shrink-0", style.iconColor)} />
              <div className="flex-1 min-w-0 flex items-center gap-x-3 gap-y-0">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <p className={cn("text-[12px] font-semibold truncate", style.text)}>{a.title}</p>
                  {a.body && (
                    <p className="text-[11px] text-muted-foreground dark:text-white/55 truncate hidden sm:block">{a.body}</p>
                  )}
                </div>
                {href && (
                  <Link
                    href={href}
                    className={cn(
                      "shrink-0 inline-flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1 rounded-lg border transition-colors",
                      "border-border dark:border-white/15 bg-accent dark:bg-white/[0.06] text-foreground dark:text-white hover:bg-accent dark:bg-white/12",
                    )}
                  >
                    {a.forumThreadId && !a.linkUrl ? (
                      <MessageSquare className="w-3 h-3" />
                    ) : null}
                    {linkLabel}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
              {a.dismissible && (
                <button
                  onClick={() => handleDismiss(a.id)}
                  className="shrink-0 p-1 rounded-md text-muted-foreground dark:text-white/40 hover:text-foreground dark:hover:text-white hover:bg-accent dark:bg-white/8 transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
