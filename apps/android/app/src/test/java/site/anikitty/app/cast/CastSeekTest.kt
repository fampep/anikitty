// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.cast

import org.junit.Assert.assertEquals
import org.junit.Test

class CastSeekTest {
    @Test
    fun prefersPlayerDurationWhenKnown() {
        assertEquals(90_000L, safeSeekTarget(90_000L, 1_400_000L, 0L))
        assertEquals(1_400_000L, safeSeekTarget(2_000_000L, 1_400_000L, 0L))
    }

    @Test
    fun fallsBackToKnownDurationWhenPlayerUnset() {
        assertEquals(90_000L, safeSeekTarget(90_000L, 0L, 1_400_000L))
        assertEquals(90_000L, safeSeekTarget(90_000L, -1L, 1_400_000L))
        assertEquals(1_400_000L, safeSeekTarget(2_000_000L, 0L, 1_400_000L))
    }

    @Test
    fun keepsSkipTargetWhenDurationUnknown() {
        // TIME_UNSET / 0 used to coerceIn(0, 0) and wipe Skip Intro to 0.
        assertEquals(90_000L, safeSeekTarget(90_000L, 0L, 0L))
        assertEquals(90_000L, safeSeekTarget(90_000L, Long.MIN_VALUE + 1, 0L))
        assertEquals(0L, safeSeekTarget(-5_000L, 0L, 0L))
    }
}
