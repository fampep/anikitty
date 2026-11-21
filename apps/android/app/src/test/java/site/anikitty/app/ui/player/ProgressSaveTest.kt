// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.player

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ProgressSaveTest {
    @Test
    fun playbackSavesOnceItMovesTwoSeconds() {
        assertFalse(progressSaveDue(positionMs = 1_500L, lastSavedMs = 0L))
        assertTrue(progressSaveDue(positionMs = 2_000L, lastSavedMs = 0L))
        assertTrue(progressSaveDue(positionMs = 12_000L, lastSavedMs = 10_000L))
    }

    @Test
    fun aRewindSavesTheEarlierSpot() {
        assertTrue(progressSaveDue(positionMs = 15_000L, lastSavedMs = 20_000L))
        assertTrue(progressSaveDue(positionMs = 1_000L, lastSavedMs = 20_000L))
    }

    @Test
    fun aResetToTheStartDoesNotWipeTheSavedSpot() {
        assertFalse(progressSaveDue(positionMs = 0L, lastSavedMs = 20_000L))
        assertFalse(progressSaveDue(positionMs = 500L, lastSavedMs = 20_000L))
    }

    @Test
    fun anOpeningResumeDoesNotSaveTheClockBeforeTheSeek() {
        assertFalse(
            progressSaveDue(
                positionMs = 4_000L,
                lastSavedMs = 0L,
                openingSeekPending = true,
            ),
        )
    }

    @Test
    fun aReloadHoldsTheResumeTargetUntilThePlayerReachesIt() {
        val armed = armedResumeMs(armedMs = 0L, requestedMs = 1_200_000L)
        assertEquals(1_200_000L, armed)
        assertTrue(resumeStillAhead(armed, positionMs = 5_000L))
        assertFalse(
            progressSaveDue(
                positionMs = 5_000L,
                lastSavedMs = 1_200_000L,
                openingSeekPending = true,
            ),
        )
        assertFalse(resumeStillAhead(armed, positionMs = 1_199_000L))
    }

    @Test
    fun aMissingLiveDurationDoesNotUseThePreviousLength() {
        val armed = armedResumeMs(armedMs = 0L, requestedMs = 1_200_000L)
        assertEquals(0L, liveDurationForResume(playerDurationMs = -1L, clockTrusted = true))
        assertEquals(0L, liveDurationForResume(playerDurationMs = 90_000L, clockTrusted = false))
        assertEquals(armed, reachableResumeMs(armed, liveDurationForResume(-1L, clockTrusted = true)))
        assertEquals(0L, reachableResumeMs(armed, liveDurationForResume(90_000L, clockTrusted = true)))
    }

    @Test
    fun aSourceShorterThanTheResumeTargetDoesNotBlockSaves() {
        val armed = armedResumeMs(armedMs = 0L, requestedMs = 1_200_000L)
        assertEquals(0L, reachableResumeMs(armed, durationMs = 90_000L))
        assertEquals(armed, reachableResumeMs(armed, durationMs = 0L))
        assertEquals(armed, reachableResumeMs(armed, durationMs = 1_400_000L))
        assertFalse(resumeStillAhead(armedMs = 0L, positionMs = 5_000L))
        assertTrue(progressSaveDue(positionMs = 5_000L, lastSavedMs = 0L))
    }

    @Test
    fun aRewindAfterTheResumeLandsStillSaves() {
        assertFalse(resumeStillAhead(armedMs = 0L, positionMs = 15_000L))
        assertTrue(progressSaveDue(positionMs = 15_000L, lastSavedMs = 1_200_000L))
    }
}
