import AnimeCard from "@/components/anime-card";
import Pagination from "@/components/common/pagination";
import { ROUTES } from "@/constants/routes";
import useBookMarks from "@/hooks/use-get-bookmark";
import { Tv2 } from "lucide-react";
import React from "react";

type Props = {
  status: string;
};

function AnimeLists({ status }: Props) {
  const [currentPage, setPage] = React.useState(1);

  const { bookmarks, totalPages, isLoading } = useBookMarks({
    status,
    page: currentPage,
    per_page: 8,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl bg-white/5 border border-white/8 animate-pulse"
            style={{ aspectRatio: "2/3" }}
          />
        ))}
      </div>
    );
  }

  if (!bookmarks || bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Tv2 className="w-10 h-10 text-white/15" />
        <p className="text-white/30 text-sm font-mono">Nothing here yet</p>
        <p className="text-white/20 text-xs">
          Start watching anime to fill this list
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
        {bookmarks.map((bookmark) => {
          const latestEpisode = bookmark.expand?.watchHistory
            ? [...bookmark.expand.watchHistory].sort(
                (a, b) => b.episodeNumber - a.episodeNumber,
              )[0]
            : null;

          const url = latestEpisode
            ? `${ROUTES.WATCH}?anime=${bookmark.animeId}&episode=${latestEpisode.episodeId}`
            : `${ROUTES.ANIME_DETAILS}/${bookmark.animeId}`;

          return (
            <AnimeCard
              key={bookmark.id}
              displayDetails={true}
              poster={bookmark.thumbnail}
              title={bookmark.animeTitle}
              href={url}
              watchDetail={latestEpisode}
            />
          );
        })}
      </div>
      {totalPages > 1 && (
        <Pagination
          totalPages={totalPages}
          handleNextPage={() => currentPage < totalPages && setPage((p) => p + 1)}
          handlePageChange={(n) => setPage(n)}
          handlePreviousPage={() => currentPage > 1 && setPage((p) => p - 1)}
          currentPage={currentPage}
        />
      )}
    </>
  );
}

export default AnimeLists;
