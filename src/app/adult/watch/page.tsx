import type { Metadata } from "next";
import { Suspense } from "react";
import AdultWatchClient from "@/components/adult/adult-watch-client";

export const metadata: Metadata = {
  title: "Watch 18+ | AniKitty",
  robots: { index: false, follow: false },
};

export default function AdultWatchPage() {
  return (
    <Suspense fallback={null}>
      <AdultWatchClient />
    </Suspense>
  );
}
