"use client";

import Container from "@/components/layout/container";
import { cn } from "@/lib/core/utils";

type Props = {
  label?: string;
  children: React.ReactNode;
  className?: string;
};

export default function HomeFeedSection({ label, children, className }: Props) {
  return (
    <section className={cn(className)}>
      {label ? (
        <Container className="pt-5 pb-0">
          <div className="flex items-center gap-3">
            <p className="shrink-0 text-[10px] font-mono font-semibold uppercase tracking-[0.22em] text-muted-foreground/55 dark:text-white/22">
              {label}
            </p>
            <div className="h-px flex-1 bg-gradient-to-r from-border via-border/60 to-transparent dark:from-white/10 dark:via-white/6 dark:to-transparent" />
          </div>
        </Container>
      ) : null}
      {children}
    </section>
  );
}
