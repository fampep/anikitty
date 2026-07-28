import type { AnimeAggregate, ProgressEntry, WatchSession } from "./types";
import { formatWatchTime } from "./derive";

export type HistoryExportPayload = {
  exportedAt: string;
  version: 1;
  aggregates: AnimeAggregate[];
  episodes: ProgressEntry[];
  sessions: WatchSession[];
};

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportHistoryJson(payload: HistoryExportPayload): Blob {
  return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
}

export function exportHistoryCsv(aggregates: AnimeAggregate[]): Blob {
  const header = [
    "animeId",
    "title",
    "status",
    "score",
    "episodesWatched",
    "watchTime",
    "lastWatched",
    "addedAt",
    "anilistId",
    "malId",
    "note",
  ];
  const rows = aggregates.map((a) =>
    [
      a.animeId,
      a.title,
      a.status ?? "",
      a.score ?? "",
      a.episodes.length,
      formatWatchTime(a.totalWatchedSeconds),
      a.lastWatched ?? "",
      a.addedAt ?? "",
      a.anilistId ?? "",
      a.malId ?? "",
      a.note,
    ]
      .map(csvEscape)
      .join(","),
  );
  return new Blob([[header.join(","), ...rows].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
}

/** AniList-ish list export (minimal mediaList-compatible fields). */
export function exportAniListCompatible(aggregates: AnimeAggregate[]): Blob {
  const entries = aggregates
    .filter((a) => a.anilistId)
    .map((a) => {
      const statusMap: Record<string, string> = {
        watching: "CURRENT",
        completed: "COMPLETED",
        "plan to watch": "PLANNING",
        "on hold": "PAUSED",
        dropped: "DROPPED",
      };
      return {
        mediaId: a.anilistId,
        status: statusMap[a.status ?? ""] ?? "CURRENT",
        score: a.score ?? 0,
        progress: a.latestEpisode?.episodeNumber ?? a.episodes.length,
        repeat: a.rewatchCount,
        notes: a.note || undefined,
      };
    });
  return new Blob([JSON.stringify({ lists: [{ entries }] }, null, 2)], {
    type: "application/json",
  });
}

/** MAL XML-ish CSV fallback (anime_id, status, score, episodes). */
export function exportMalCompatibleCsv(aggregates: AnimeAggregate[]): Blob {
  const statusMap: Record<string, number> = {
    watching: 1,
    completed: 2,
    "on hold": 3,
    dropped: 4,
    "plan to watch": 6,
  };
  const header = ["anime_id", "status", "score", "episodes", "times_rewatched", "comments"];
  const rows = aggregates
    .filter((a) => a.malId)
    .map((a) =>
      [
        a.malId,
        statusMap[a.status ?? ""] ?? 1,
        a.score ?? 0,
        a.latestEpisode?.episodeNumber ?? a.episodes.length,
        a.rewatchCount,
        a.note,
      ]
        .map(csvEscape)
        .join(","),
    );
  return new Blob([[header.join(","), ...rows].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
