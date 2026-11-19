// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.cast

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CastSubtitlesTest {
    @Test
    fun activeIdsEmptyWhenCaptionsOff() {
        assertTrue(
            castActiveTextTrackIds(
                configs = emptyList(),
                tracks = emptyList(),
                enabled = false,
            ).isEmpty(),
        )
    }

    @Test
    fun pickTextTrackIdEmptyWhenOffOrMissing() {
        assertTrue(castPickTextTrackId(emptyList(), enabled = true).isEmpty())
        assertTrue(castPickTextTrackId(emptyList(), enabled = false).isEmpty())
    }

    @Test
    fun finishedIdleIsEpisodeEnd() {
        // MediaStatus.PLAYER_STATE_IDLE == 1, IDLE_REASON_FINISHED == 1.
        assertTrue(castPlaybackFinished(playerState = 1, idleReason = 1))
        assertTrue(!castPlaybackFinished(playerState = 1, idleReason = 2))
        assertTrue(!castPlaybackFinished(playerState = 2, idleReason = 1))
        assertTrue(!castPlaybackFinished(playerState = 1, idleReason = 4))
    }

    @Test
    fun leftoverFinishDoesNotEndTheNextLoad() {
        assertTrue(!castItemEndedAfterStart(sawPlayback = false, playerState = 1, idleReason = 1))
        assertTrue(castItemEndedAfterStart(sawPlayback = true, playerState = 1, idleReason = 1))
        assertTrue(!castItemEndedAfterStart(sawPlayback = true, playerState = 2, idleReason = 1))
    }

    @Test
    fun volumeNudgeStepsSixPercent() {
        assertEquals(0.56f, castVolumeAfterNudge(0.50f, 0.02f), 0.001f)
        assertEquals(0.44f, castVolumeAfterNudge(0.50f, -0.02f), 0.001f)
        assertEquals(0.50f, castVolumeAfterNudge(0.50f, 0.001f), 0.001f)
        assertEquals(1f, castVolumeAfterNudge(0.98f, 0.2f), 0.001f)
        assertEquals(0f, castVolumeAfterNudge(0.02f, -0.2f), 0.001f)
    }

    @Test
    fun corsStillAllowsSubtitleFetches() {
        // /sub responses reuse the same CORS lines as the playlist.
        val lines = castRelayCorsLines()
        assertTrue(lines.any { it.contains("Access-Control-Allow-Origin") })
        assertEquals(
            true,
            lines.any { it == "Access-Control-Allow-Private-Network: true" },
        )
    }
}
