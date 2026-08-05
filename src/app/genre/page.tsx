import type { Metadata } from "next";
import GenresPageClient from "@/components/discovery/genres-page-client";

export const metadata: Metadata = {
  title: "Genres",
  description:
    "Browse anime by genre — action, romance, isekai, psychological and more.",
};

export default function GenresPage() {
  return <GenresPageClient />;
}
