import { Suspense } from "react";
import type { Metadata } from "next";
import Loading from "@/app/loading";
import SubtitleLibraryPage from "./subtitle-library-page";

export const metadata: Metadata = {
  title: "Subtitle Library | AniKitty",
  description: "Search cached anime subtitles and download .vtt files from the AniKitty library.",
};

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <SubtitleLibraryPage />
    </Suspense>
  );
}
