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
