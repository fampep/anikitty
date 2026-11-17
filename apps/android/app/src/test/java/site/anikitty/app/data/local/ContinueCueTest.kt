// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.local

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ContinueCueTest {
    @Test
    fun inProgressStaysOnThatEpisode() {
        val cue = continueCue(
            row(episode = 5, positionMs = 8 * 60_000L, durationMs = 24 * 60_000L),
        )
        assertEquals(5, cue?.episode)
        assertEquals(false, cue?.next)
        assertEquals(16, cue?.minutesLeft)
        assertTrue((cue?.progress ?: 0f) > 0.3f)
    }

    @Test
    fun unstartedFrontierIsTheNextEpisode() {
        val cue = continueCue(row(episode = 4, positionMs = 0L, durationMs = 0L, status = "CURRENT"))
        assertEquals(4, cue?.episode)
        assertEquals(true, cue?.next)
        assertNull(cue?.minutesLeft)
    }

    @Test
    fun eightyFivePercentStaysOnThatEpisode() {
        val duration = 24 * 60_000L
        val cue = continueCue(
            row(episode = 5, positionMs = (duration * 0.85).toLong(), durationMs = duration),
        )
        assertEquals(5, cue?.episode)
        assertEquals(false, cue?.next)
    }

    @Test
    fun nearTheEndCountsAsFinished() {
        val cue = continueCue(
            row(episode = 2, positionMs = 23 * 60_000L, durationMs = 24 * 60_000L),
        )
        assertEquals(3, cue?.episode)
        assertEquals(true, cue?.next)
    }

    @Test
    fun completedSeriesAreHidden() {
        assertNull(continueCue(row(episode = 12, status = "COMPLETED")))
        assertNull(continueCue(row(episode = 3, status = "DROPPED")))
        assertNull(continueCue(row(episode = 1, positionMs = 0L, durationMs = 0L, status = null)))
    }

    @Test
    fun pastTheReleasedCountIsHidden() {
        val cue = continueCue(row(episode = 13, status = "CURRENT"), releasedEpisodes = 12)
        assertNull(cue)
        val finished = continueCue(
            row(episode = 12, positionMs = 23 * 60_000L, durationMs = 24 * 60_000L),
            releasedEpisodes = 12,
        )
        assertNull(finished)
    }

    @Test
    fun queueIsRecentUniqueAndSkipsHidden() {
        val older = row(id = 1, episode = 2, updated = 10L, title = "Older")
        val newer = row(id = 2, episode = 3, updated = 50L, title = "Newer")
        val duplicate = row(id = 2, episode = 1, updated = 40L, title = "Duplicate")
        val done = row(id = 3, episode = 8, updated = 90L, status = "COMPLETED")
        val hidden = row(id = 4, episode = 1, updated = 80L, status = "CURRENT")
        val queue = continueQueue(listOf(older, duplicate, newer, done, hidden), hidden = setOf(4))
        assertEquals(listOf(2, 1), queue.map { it.anilistId })
        assertEquals("Newer", queue.first().title)
    }

    @Test
    fun queueDropsAFinishedLastEpisode() {
        val done = row(
            id = 7,
            episode = 12,
            positionMs = 23 * 60_000L,
            durationMs = 24 * 60_000L,
            updated = 20L,
        )
        val mid = row(id = 8, episode = 3, positionMs = 5 * 60_000L, durationMs = 24 * 60_000L, updated = 10L)
        val queue = continueQueue(listOf(done, mid), releasedEpisodes = mapOf(7 to 12))
        assertEquals(listOf(8), queue.map { it.anilistId })
    }

    private fun row(
        id: Int = 10,
        episode: Int = 1,
        positionMs: Long = 0L,
        durationMs: Long = 0L,
        status: String? = "CURRENT",
        updated: Long = 1L,
        title: String = "Show",
    ) = WatchHistoryEntity(
        anilistId = id,
        title = title,
        coverImageUrl = null,
        episode = episode,
        positionMs = positionMs,
        durationMs = durationMs,
        updatedAtEpochMs = updated,
        listStatus = status,
    )
}
