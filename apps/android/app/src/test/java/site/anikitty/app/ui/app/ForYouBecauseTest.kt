// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ForYouBecauseTest {
    @Test
    fun namesTheShowsStillBeingWatched() {
        assertNull(forYouBecause(emptyList()))
        assertNull(forYouBecause(listOf("  ")))
        assertEquals("Because you watch Harbor", forYouBecause(listOf(" Harbor ")))
        assertEquals(
            "Because you watch Harbor and Kite",
            forYouBecause(listOf("Harbor", "Kite")),
        )
        assertEquals(
            "Because you watch Harbor, Kite, and Bloom",
            forYouBecause(listOf("Harbor", "Kite", "Bloom", "Harbor")),
        )
    }
}
