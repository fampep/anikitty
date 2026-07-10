"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useMotionEnabled } from "@/hooks/use-motion-enabled";

const EASE = [0.22, 1, 0.36, 1] as const;

function shouldSkipTransition(pathname: string) {
  return pathname.startsWith("/anime/watch");
}

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const motionEnabled = useMotionEnabled();
  const skip = shouldSkipTransition(pathname);

  if (!motionEnabled || skip) {
    return <div className="w-full">{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        className="w-full"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{
          duration: 0.22,
          ease: EASE,
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
