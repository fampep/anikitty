// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.cast

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CastLifetimeTest {
    @Test
    fun theCastServiceStaysUpWhenThePlayerLeaves() {
        assertTrue(castForegroundShouldRun(casting = true, loadInFlight = false))
        assertTrue(castForegroundShouldRun(casting = false, loadInFlight = true))
        assertFalse(castForegroundShouldRun(casting = false, loadInFlight = false))
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
