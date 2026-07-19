"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

type Section = {
  id: string;
  label: string;
};

type Props = {
  sections: Section[];
  className?: string;
};

const SCROLL_OFFSET = 140;

export default function ProfileSectionNav({ sections, className }: Props) {
  const t = useT();
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    if (sections.length === 0) return;

    const updateActive = () => {
      let current = sections[0]?.id ?? "";
      for (const { id } of sections) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= SCROLL_OFFSET) {
          current = id;
        }
      }
      setActiveId(current);
    };

    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    return () => {
      window.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
    };
  }, [sections]);

  if (sections.length === 0) return null;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
  };

  return (
    <nav
      aria-label={t("profile.sectionNav.label")}
      className={cn(
        "site-glass sticky top-16 z-20 -mx-1 mb-8 flex gap-1 overflow-x-auto rounded-xl border border-border dark:border-white/10 bg-background/90 dark:bg-[#0a0a0a]/90 p-1 backdrop-blur-md scrollbar-none shadow-sm shadow-black/5",
        className,
      )}
    >
      {sections.map((section) => {
        const active = activeId === section.id;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => scrollTo(section.id)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all",
              active
                ? "bg-accent dark:bg-white/12 text-foreground dark:text-white/90 shadow-sm ring-1 ring-border/60 dark:ring-white/10"
                : "text-muted-foreground dark:text-white/45 hover:bg-accent dark:hover:bg-white/8 hover:text-foreground dark:hover:text-white/85",
            )}
          >
            {section.label}
          </button>
        );
      })}
    </nav>
  );
}
