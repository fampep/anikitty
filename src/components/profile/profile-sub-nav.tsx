"use client";

import Link from "next/link";
import { Library, List, MessageSquare } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";

export type ProfileSubNavTab = "overview" | "comments" | "collections";

type Props = {
  username: string;
  active: ProfileSubNavTab;
  commentCount?: number;
  className?: string;
  placement?: "all" | "mobile" | "sidebar";
};

const TABS: { id: ProfileSubNavTab; href: (username: string) => string; icon: typeof List; labelKey: string }[] = [
  { id: "overview", href: ROUTES.profile, icon: List, labelKey: "profile.subNav.overview" },
  { id: "comments", href: ROUTES.profileComments, icon: MessageSquare, labelKey: "profile.subNav.comments" },
  { id: "collections", href: ROUTES.profileCollections, icon: Library, labelKey: "profile.subNav.collections" },
];

function NavLinks({
  username,
  active,
  commentCount,
  vertical,
}: {
  username: string;
  active: ProfileSubNavTab;
  commentCount?: number;
  vertical: boolean;
}) {
  const t = useT();

  return (
    <>
      {TABS.map(({ id, href, icon: Icon, labelKey }) => {
        const isActive = active === id;
        return (
          <Link
            key={id}
            href={href(username)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              vertical
                ? "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors"
                : "flex flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2.5 text-xs font-medium transition-all min-h-[44px]",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground dark:text-white/55 hover:bg-accent dark:hover:bg-white/8 hover:text-foreground dark:hover:text-white/85",
            )}
          >
            <Icon className={cn(vertical ? "h-5 w-5 shrink-0" : "h-4 w-4")} />
            <span className={vertical ? "flex-1" : "text-[10px] leading-tight"}>{t(labelKey)}</span>
            {vertical && id === "comments" && commentCount != null && commentCount > 0 && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                  isActive ? "bg-primary-foreground/15" : "bg-muted dark:bg-white/10",
                )}
              >
                {commentCount}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}

export default function ProfileSubNav({ username, active, commentCount, className, placement = "all" }: Props) {
  const t = useT();
  const showMobile = placement === "all" || placement === "mobile";
  const showSidebar = placement === "all" || placement === "sidebar";

  return (
    <>
      {showMobile && (
        <div className={cn("mb-6 lg:hidden", className)}>
          <div className="flex gap-1 rounded-xl border border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.03] p-1">
            <NavLinks username={username} active={active} commentCount={commentCount} vertical={false} />
          </div>
        </div>
      )}

      {showSidebar && (
        <aside className={cn("hidden lg:block", className)}>
          <div className="site-panel p-2">
            <nav className="flex flex-col gap-1" aria-label={t("profile.subNav.label")}>
              <NavLinks username={username} active={active} commentCount={commentCount} vertical />
            </nav>
          </div>
        </aside>
      )}
    </>
  );
}
