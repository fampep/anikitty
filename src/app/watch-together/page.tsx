"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import WatchTogetherContent from "@/components/watch-together/watch-together-content";

export default function WatchTogetherPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen pt-page flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground dark:text-white/30" />
        </div>
      }
    >
      <WatchTogetherContent />
    </Suspense>
  );
}
