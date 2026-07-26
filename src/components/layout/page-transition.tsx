"use client";

/**
 * Passthrough shell — framer page transitions were kept out of the hot path
 * so every navigation doesn't retain AnimatePresence + motion trees in memory.
 * Watch routes and lite/reduced-motion already skipped animation; now all routes do.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  return <div className="w-full">{children}</div>;
}
