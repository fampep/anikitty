// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.player

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
}
