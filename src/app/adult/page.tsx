import type { Metadata } from "next";
import { Suspense } from "react";
import AdultBrowseClient from "@/components/adult/adult-browse-client";

export const metadata: Metadata = {
  title: "18+ | AniKitty",
  robots: { index: false, follow: false },
};

export default function AdultPage() {
  return (
    <Suspense fallback={null}>
      <AdultBrowseClient />
    </Suspense>
  );
}
