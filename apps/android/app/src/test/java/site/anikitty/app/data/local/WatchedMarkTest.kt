// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.local

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import site.anikitty.app.data.skip.SkipInterval
import site.anikitty.app.data.skip.SkipTimes

class WatchedMarkTest {
    @Test
    fun creditsStartMarksTheEpisodeEvenWhenMoreThanNinetySecondsRemain() {
        val duration = 24 * 60_000L
        val creditsAt = 20 * 60_000L
        val skip = SkipTimes(outro = SkipInterval(startSec = 20 * 60.0, endSec = 21 * 60.0))
        assertFalse(shouldMarkWatched(creditsAt - 1_000L, duration, skip))
        assertTrue(shouldMarkWatched(creditsAt, duration, skip))
    }

    @Test
    fun underNinetySecondsLeftMarksWithoutACreditsMarker() {
        val duration = 24 * 60_000L
        assertFalse(shouldMarkWatched(duration - WATCHED_REMAINING_MS, duration))
        assertTrue(shouldMarkWatched(duration - WATCHED_REMAINING_MS + 1L, duration))
    }

    @Test
    fun eightyFivePercentOfAFullEpisodeDoesNotMark() {
        val duration = 24 * 60_000L
        val atEightyFive = (duration * 0.85).toLong()
        assertFalse(shouldMarkWatched(atEightyFive, duration))
    }

    @Test
    fun shortEpisodeIsNotWatchedUntilPlaybackMoves() {
        val duration = 45_000L
        assertFalse(shouldMarkWatched(0L, duration))
        assertTrue(shouldMarkWatched(1_000L, duration))
    }

    @Test
    fun unknownDurationDoesNotUseTheTimeRule() {
        assertFalse(shouldMarkWatched(positionMs = 20 * 60_000L, durationMs = 0L))
        val skip = SkipTimes(outro = SkipInterval(startSec = 18 * 60.0, endSec = 19 * 60.0))
        assertTrue(shouldMarkWatched(18 * 60_000L, durationMs = 0L, skip))
    }

    @Test
    fun retryStopsOnceALaterMarkMovesTheFrontier() {
        assertEquals(AutoMarkDecision.RetryPush, autoMarkDecision(6, currentEpisode = 5, localMarked = true))
        assertEquals(AutoMarkDecision.Stop, autoMarkDecision(7, currentEpisode = 5, localMarked = true))
        assertEquals(AutoMarkDecision.Stop, autoMarkDecision(6, currentEpisode = 5, localMarked = false))
        assertEquals(AutoMarkDecision.MarkLocal, autoMarkDecision(5, currentEpisode = 5, localMarked = false))
        assertEquals(AutoMarkDecision.Stop, autoMarkDecision(5, currentEpisode = 5, localMarked = true))
        assertEquals(AutoMarkDecision.Stop, autoMarkDecision(4, currentEpisode = 5, localMarked = true))
    }

    @Test
    fun introAndAZeroCreditsMarkerDoNotCount() {
        val duration = 24 * 60_000L
        val skip = SkipTimes(
            intro = SkipInterval(startSec = 0.0, endSec = 90.0),
            outro = SkipInterval(startSec = 0.0, endSec = 30.0),
        )
        assertFalse(shouldMarkWatched(2 * 60_000L, duration, skip))
    }
}
