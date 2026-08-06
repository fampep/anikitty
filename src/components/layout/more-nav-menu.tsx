"use client";

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GroupedNavLinks, type MenuItem } from "@/components/layout/site-nav-menu";
import { useT } from "@/providers/i18n-provider";

type Props = {
  trigger: ReactNode;
  items: readonly MenuItem[];
  pathname: string;
  /** Which way the popover opens off its trigger. Top-anchored bars want "bottom". */
  side?: "top" | "bottom";
};

/** Compact “More” popover — floats off the nav bar instead of a full-page sheet. */
export default function MoreNavMenu({ trigger, items, pathname, side = "top" }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side={side}
        align="end"
        sideOffset={12}
        collisionPadding={16}
        className={cn(
          "site-more-menu site-overlay-surface z-[150] w-[min(calc(100vw-1.25rem),24rem)] max-h-[min(68vh,26rem)] overflow-hidden p-0",
          "rounded-2xl border border-border/60 bg-background/95 shadow-[0_16px_48px_rgba(0,0,0,0.28)] backdrop-blur-2xl",
          "dark:border-white/10 dark:bg-[#09090b]/96 dark:shadow-[0_20px_56px_rgba(0,0,0,0.55)]",
          "data-[state=open]:duration-200 data-[state=closed]:duration-150",
          "data-[side=top]:slide-in-from-bottom-3 data-[side=top]:slide-out-to-bottom-2",
          "data-[side=bottom]:slide-in-from-top-3 data-[side=bottom]:slide-out-to-top-2",
          "motion-reduce:animate-none motion-reduce:transition-none",
        )}
      >
        <div className="site-more-menu__header flex items-center justify-between border-b border-border/50 px-3.5 py-2.5 dark:border-white/[0.06]">
          <p className="text-[13px] font-semibold tracking-tight text-foreground dark:text-white">{t("nav.more")}</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground dark:text-white/45 dark:hover:bg-white/8 dark:hover:text-white"
            aria-label={t("nav.aria.closeMenu")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <nav
          className="overflow-y-auto overscroll-contain px-2.5 py-2.5"
          aria-label={t("nav.aria.mobileNav")}
        >
          <GroupedNavLinks
            items={items}
            pathname={pathname}
            onNavigate={() => setOpen(false)}
            grid
          />
        </nav>
      </PopoverContent>
    </Popover>
  );
}
