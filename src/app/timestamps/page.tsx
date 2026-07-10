import type { Metadata } from "next";
import SkipDatabaseBrowser from "@/components/timestamps/skip-database-browser";

export const metadata: Metadata = {
  title: "Skip Timestamps | AniKitty",
  description:
    "Browse community intro and end-credit skip timestamps on AniKitty — live approved times and submissions awaiting review.",
};

export default function TimestampsPage() {
  return <SkipDatabaseBrowser />;
}
