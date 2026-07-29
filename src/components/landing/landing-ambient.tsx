"use client";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/core/utils";

/** Lightweight CSS ambient field — no canvas libs. */
export default function LandingAmbient({ className }: { className?: string }) {
  const reduced = usePrefersReducedMotion();

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_18%,rgba(255,255,255,0.11),transparent_62%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_15%_80%,rgba(161,161,170,0.08),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_35%_at_88%_70%,rgba(113,113,122,0.07),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.014)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.014)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black,transparent)]" />

      {!reduced && (
        <>
          <span className="landing-orb landing-orb--a" />
          <span className="landing-orb landing-orb--b" />
          <span className="landing-orb landing-orb--c" />
          <div className="landing-particles">
            {Array.from({ length: 18 }).map((_, i) => (
              <span key={i} className="landing-particle" style={{ "--i": i } as React.CSSProperties} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
