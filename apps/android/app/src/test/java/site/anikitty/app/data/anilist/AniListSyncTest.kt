// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.anilist

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import site.anikitty.app.data.local.WatchHistoryEntity

class AniListSyncTest {
    @Test
    fun pullKeepsALocalEpisodeThatIsAheadOfAniList() {
        val local = history(episode = 8, positionMs = 40_000L, durationMs = 1_400_000L)
        val merged = merge(local, remoteProgress = 5, pending = null)
        assertEquals(8, merged.episode)
        assertEquals(40_000L, merged.positionMs)
        assertEquals(1_400_000L, merged.durationMs)
        assertEquals("CURRENT", merged.listStatus)
    }

    @Test
    fun pullTakesProgressFromAnotherDeviceWhenThePhoneIsBehind() {
        val local = history(episode = 4, positionMs = 80_000L, durationMs = 1_400_000L)
        val merged = merge(local, remoteProgress = 10, pending = null)
        assertEquals(10, merged.episode)
        assertEquals(0L, merged.positionMs)
        assertEquals(0L, merged.durationMs)
    }

    @Test
    fun pullKeepsTheScrubOnTheSameEpisode() {
        val local = history(episode = 5, positionMs = 12_000L, durationMs = 1_400_000L)
        val merged = merge(local, remoteProgress = 5, pending = null)
        assertEquals(5, merged.episode)
        assertEquals(12_000L, merged.positionMs)
    }

    @Test
    fun aNewerFailureStaysQueuedWhenAnOlderPushSucceeds() {
        assertFalse(shouldDeletePendingPush(queuedUpdatedAtEpochMs = 200L, pushStartedAtEpochMs = 100L))
        assertTrue(shouldDeletePendingPush(queuedUpdatedAtEpochMs = 100L, pushStartedAtEpochMs = 200L))
        assertTrue(shouldDeletePendingPush(queuedUpdatedAtEpochMs = 100L, pushStartedAtEpochMs = 100L))
    }

    @Test
    fun aFinishedSeriesIsCompletedAndAPartialCountStaysCurrent() {
        assertEquals(AniListPushPlan(12, "COMPLETED"), aniListPushPlan(episode = 12, totalEpisodes = 12))
        assertEquals(AniListPushPlan(12, "COMPLETED"), aniListPushPlan(episode = 13, totalEpisodes = 12))
        assertEquals(AniListPushPlan(4, "CURRENT"), aniListPushPlan(episode = 4, totalEpisodes = 12))
        assertEquals(AniListPushPlan(0, "CURRENT"), aniListPushPlan(episode = 0, totalEpisodes = 12))
        assertEquals(AniListPushPlan(3, "CURRENT"), aniListPushPlan(episode = 3, totalEpisodes = 0))
        assertEquals(AniListPushPlan(3, "CURRENT"), aniListPushPlan(episode = 3, totalEpisodes = null))
    }

    @Test
    fun aSuccessfulPushDoesNotRewindALaterFrontierOrALivePlayhead() {
        val later = history(episode = 8, positionMs = 0L, durationMs = 0L)
        val kept = historyAfterAniListPush(later, progress = 5, status = "CURRENT")
        assertEquals(8, kept.episode)
        assertEquals(0L, kept.positionMs)
        assertEquals("CURRENT", kept.listStatus)

        val live = history(episode = 4, positionMs = 2_001L, durationMs = 1_400_000L)
        val stillThere = historyAfterAniListPush(live, progress = 5, status = "COMPLETED")
        assertEquals(4, stillThere.episode)
        assertEquals(2_001L, stillThere.positionMs)
        assertEquals("COMPLETED", stillThere.listStatus)

        val caughtUp = history(episode = 4, positionMs = 2_000L, durationMs = 1_400_000L)
        val moved = historyAfterAniListPush(caughtUp, progress = 5, status = "CURRENT")
        assertEquals(5, moved.episode)
        assertEquals(2_000L, moved.positionMs)
    }

    @Test
    fun aPendingPushThatAlreadyMatchesAniListDoesNotFreezeAnOlderPhone() {
        val local = history(episode = 3, positionMs = 90_000L, durationMs = 1_400_000L)
        val merged = merge(local, remoteProgress = 6, pending = 6)
        assertEquals(6, merged.episode)
        assertEquals(0L, merged.positionMs)
    }

    @Test
    fun aFailedPushBlocksAStaleCloudCopyFromUndoingAnUnwatch() {
        val local = history(episode = 3, positionMs = 0L, durationMs = 0L, status = "CURRENT")
        val merged = merge(local, remoteProgress = 8, pending = 2)
        assertEquals(3, merged.episode)
        assertEquals("CURRENT", merged.listStatus)
    }

    private fun merge(local: WatchHistoryEntity?, remoteProgress: Int, pending: Int?) = mergedPullEntry(
        existing = local,
        anilistId = 7,
        title = "Serial",
        coverImageUrl = "https://cdn.example/cover.jpg",
        malId = 42,
        remoteProgress = remoteProgress,
        remoteStatus = "CURRENT",
        pendingProgress = pending,
        syncedAtEpochMs = 50L,
    )

    private fun history(
        episode: Int,
        positionMs: Long,
        durationMs: Long,
        status: String? = "CURRENT",
    ) = WatchHistoryEntity(
        anilistId = 7,
        title = "Serial",
        coverImageUrl = null,
        episode = episode,
        positionMs = positionMs,
        durationMs = durationMs,
        updatedAtEpochMs = 10L,
        listStatus = status,
        malId = 42,
    )
}
