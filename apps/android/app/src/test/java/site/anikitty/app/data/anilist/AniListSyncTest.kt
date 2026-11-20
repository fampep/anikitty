// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.anilist

import org.junit.Assert.assertEquals
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
