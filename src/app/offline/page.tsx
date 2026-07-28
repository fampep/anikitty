import type { Metadata } from "next";
import { OfflinePageClient } from "./offline-page-client";

export const metadata: Metadata = {
  title: "Offline | AniKitty",
  robots: { index: false },
};

/** Shown by the service worker when a navigation happens with no connection. */
export default function OfflinePage() {
  return <OfflinePageClient />;
}
