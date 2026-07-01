/**
 * Complete Anime Database Service
 * Systematically downloads and completes every anime in the database
 * Processes one anime at a time until all are complete
 */

import { runSubtitleLibrarySyncTick } from "@/lib/subtitles/subtitle-library-sync";

export type CompletionStatus = {
  totalAnime: number;
  completedAnime: number;
  incompleteAnime: number;
  totalEpisodesFetched: number;
  totalSubtitlesFetched: number;
  averageEpisodesPerAnime: number;
  estimatedTimeToComplete: string;
};

/**
 * Global completion tracker
 */
export class AnimeCompletionTracker {
  private completedCount = 0;
  private totalEpisodesFetched = 0;
  private totalSubtitlesFetched = 0;
  private isRunning = false;

  async completeDatabase(): Promise<CompletionStatus> {
    if (this.isRunning) {
      return {
        totalAnime: 0,
        completedAnime: this.completedCount,
        incompleteAnime: 0,
        totalEpisodesFetched: this.totalEpisodesFetched,
        totalSubtitlesFetched: this.totalSubtitlesFetched,
        averageEpisodesPerAnime: 0,
        estimatedTimeToComplete: "In progress...",
      };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      // Keep syncing until all anime are complete
      // Each tick processes anime one by one
      let incompleteRemaining = 1;
      let tickCount = 0;

      while (incompleteRemaining > 0) {
        tickCount++;
        console.log(`[CompletionTracker] Sync tick ${tickCount} - ${incompleteRemaining} anime remaining`);

        const result = await runSubtitleLibrarySyncTick({
          maxIncompleteAnime: 999999, // Process ALL
          episodesPerAnime: 10, // More episodes per tick to speed up
          maxDiscover: 999999, // Discover all new anime
          backfillLimit: 999999,
          refreshLimit: 999999,
        });

        this.completedCount += result.animeUpdated;
        this.totalEpisodesFetched += result.episodesFetched;
        this.totalSubtitlesFetched += result.episodesFetched; // Subtitles sync with episodes

        incompleteRemaining = result.incompleteRemaining;

        // Log progress
        if (result.animeUpdated > 0) {
          console.log(
            `[CompletionTracker] Completed: ${this.completedCount} anime, ` +
              `Episodes: ${this.totalEpisodesFetched}, ` +
              `Remaining: ${incompleteRemaining}`,
          );
        }

        // Small delay between ticks to avoid overwhelming system
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const elapsedMs = Date.now() - startTime;
      const averageEpisodes =
        this.completedCount > 0 ? Math.round(this.totalEpisodesFetched / this.completedCount) : 0;

      return {
        totalAnime: this.completedCount,
        completedAnime: this.completedCount,
        incompleteAnime: 0,
        totalEpisodesFetched: this.totalEpisodesFetched,
        totalSubtitlesFetched: this.totalSubtitlesFetched,
        averageEpisodesPerAnime: averageEpisodes,
        estimatedTimeToComplete: `${(elapsedMs / 1000 / 60).toFixed(1)} minutes`,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Continuous background completion
   * Runs indefinitely, completing new anime as they're added
   */
  async runContinuousCompletion(checkIntervalMs: number = 60000): Promise<void> {
    console.log("[CompletionTracker] Starting continuous database completion...");

    while (true) {
      try {
        const result = await runSubtitleLibrarySyncTick({
          maxIncompleteAnime: 999999,
          episodesPerAnime: 8,
          maxDiscover: 999999,
          backfillLimit: 999999,
          refreshLimit: 999999,
        });

        if (result.animeUpdated > 0 || result.animeDiscovered > 0) {
          console.log(
            `[CompletionTracker] Continuous: ` +
              `${result.animeUpdated} anime updated, ` +
              `${result.episodesFetched} episodes fetched, ` +
              `${result.incompleteRemaining} remaining`,
          );
        }
      } catch (error) {
        console.error("[CompletionTracker] Error during continuous sync:", error);
      }

      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, checkIntervalMs));
    }
  }
}

export const animeCompletionTracker = new AnimeCompletionTracker();
