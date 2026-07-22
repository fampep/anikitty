import type { Metadata } from "next";
import AdultSeriesClient from "@/components/adult/adult-series-client";

export const metadata: Metadata = {
  title: "18+ | AniKitty",
  robots: { index: false, follow: false },
};

export default function AdultSeriesPage() {
  return <AdultSeriesClient />;
}
