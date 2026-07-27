import type { Metadata } from "next";
import SkipDatabaseBrowser from "@/components/timestamps/skip-database-browser";

export const metadata: Metadata = {
  title: "Timestamps | AniKitty",
  description:
    "Browse community opening and ending skip timestamps on AniKitty — live times used by the player after review.",
};

export default function TimestampsPage() {
  return <SkipDatabaseBrowser />;
}
