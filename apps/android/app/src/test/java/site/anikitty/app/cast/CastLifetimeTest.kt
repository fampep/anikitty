// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.cast

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import site.anikitty.app.data.local.WatchHistoryEntity

class CastLifetimeTest {
    @Test
    fun theCastServiceStaysUpWhenThePlayerLeaves() {
        assertTrue(castForegroundShouldRun(casting = true, loadInFlight = false))
        assertTrue(castForegroundShouldRun(casting = false, loadInFlight = true))
        assertFalse(castForegroundShouldRun(casting = false, loadInFlight = false))
    }

    @Test
    fun reopeningTheSameEpisodeJoinsTheReceiver() {
        val item = CastItemKey(anilistId = 1, episode = 4, url = "http://relay/a", audio = "ja")
        assertTrue(castSameItem(item, item.copy()))
        assertEquals(CastJoin.Adopt, castJoin(casting = true, loadInFlight = false, sameItem = true))
        assertEquals(CastJoin.Adopt, castJoin(casting = false, loadInFlight = true, sameItem = true))
        assertEquals(CastJoin.Load, castJoin(casting = true, loadInFlight = false, sameItem = false))
        assertEquals(CastJoin.Load, castJoin(casting = false, loadInFlight = false, sameItem = true))
        assertFalse(
            castSameItem(item, item.copy(episode = 5)),
        )
    }

    @Test
    fun castHistoryKeepsTheLivePlayhead() {
        val target = CastProgressTarget(
            anilistId = 7,
            title = "Serial",
            episode = 3,
            totalEpisodes = 12,
            outroStartMs = null,
        )
        val written = castHistoryUpdate(
            existing = WatchHistoryEntity(
                anilistId = 7,
                title = "Serial",
                coverImageUrl = null,
                episode = 3,
                positionMs = 10_000L,
                durationMs = 1_400_000L,
                updatedAtEpochMs = 1L,
            ),
            target = target,
            positionMs = 80_000L,
            durationMs = 1_400_000L,
            now = 50L,
        )
        assertEquals(3, written?.episode)
        assertEquals(80_000L, written?.positionMs)
        assertNull(castProgressToReport(
            before = WatchHistoryEntity(7, "Serial", null, 3, 10_000L, 1_400_000L, 1L),
            written = written!!,
            watchedEpisode = 3,
        ))
    }

    @Test
    fun castHistoryDoesNotRewindALaterEpisode() {
        val target = CastProgressTarget(7, "Serial", 3, 12, null)
        val later = WatchHistoryEntity(7, "Serial", null, 6, 0L, 0L, 1L)
        assertNull(castHistoryUpdate(later, target, 80_000L, 1_400_000L, 50L))
    }

    @Test
    fun castHistoryMarksTheEpisodeNearTheEnd() {
        val target = CastProgressTarget(7, "Serial", 3, 12, outroStartMs = 1_200_000L)
        val before = WatchHistoryEntity(7, "Serial", null, 3, 10_000L, 1_400_000L, 1L)
        val written = castHistoryUpdate(before, target, 1_250_000L, 1_400_000L, 50L)
        assertEquals(4, written?.episode)
        assertEquals(0L, written?.positionMs)
        assertEquals(3, castProgressToReport(before, written!!, 3))
    }

    @Test
    fun progressStaysOnTheEpisodeTheTvIsPlaying() {
        val playing = CastItemKey(7, 3, "http://relay/a", "ja")
        val onScreen = CastProgressTarget(7, "Serial", 5, 12, null)
        val stillPlaying = CastProgressTarget(7, "Serial", 3, 12, null)
        assertFalse(castProgressMatches(onScreen, playing))
        assertTrue(castProgressMatches(stillPlaying, playing))
        val untitled = CastItemKey(0, 3, "http://relay/other", "ja")
        assertFalse(castProgressMatches(stillPlaying, untitled))
    }

    @Test
    fun progressFollowsTheEpisodeTheReceiverIsActuallyPlaying() {
        val playing = CastItemKey(7, 3, "http://relay/a", "ja")
        val onThatEpisode = CastProgressTarget(7, "Serial", 3, 12, null)
        val onALaterEpisode = CastProgressTarget(7, "Serial", 5, 12, null)
        val kept = commitCastProgress(
            screen = onThatEpisode,
            playing = playing,
            current = onThatEpisode,
            reportedThrough = 2,
        )
        assertEquals(onThatEpisode, kept.target)
        assertEquals(2, kept.reportedThrough)

        val switched = commitCastProgress(
            screen = onThatEpisode,
            playing = playing,
            current = onALaterEpisode,
            reportedThrough = 4,
        )
        assertEquals(3, switched.target?.episode)
        assertEquals(-1, switched.reportedThrough)

        val mismatch = commitCastProgress(
            screen = onALaterEpisode,
            playing = playing,
            current = onThatEpisode,
            reportedThrough = 2,
        )
        assertNull(mismatch.target)
        assertEquals(-1, mismatch.reportedThrough)
        val noReceiver = commitCastProgress(onThatEpisode, playing = null, onThatEpisode, 2)
        assertNull(noReceiver.target)
    }

    @Test
    fun theLastScreenLeavingAfterTheCreditsStopsTheRelay() {
        assertTrue(castShouldStopWhenScreenDetaches(screensLeft = 0, episodeEnded = true, loadInFlight = false))
        assertFalse(castShouldStopWhenScreenDetaches(screensLeft = 1, episodeEnded = true, loadInFlight = false))
        assertFalse(castShouldStopWhenScreenDetaches(screensLeft = 0, episodeEnded = true, loadInFlight = true))
        assertFalse(castShouldStopWhenScreenDetaches(screensLeft = 0, episodeEnded = false, loadInFlight = false))
    }

    @Test
    fun anEpisodeSwitchKeepsTheNewCastListener() {
        val slot = CastListenerSlot<String>()
        slot.set("episode-1")
        slot.set("episode-2")
        assertFalse(slot.clear("episode-1"))
        assertEquals("episode-2", slot.current)
        assertTrue(slot.clear("episode-2"))
        assertEquals(null, slot.current)
    }
}
