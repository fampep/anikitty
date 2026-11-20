// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.app

import org.junit.Assert.assertEquals
import org.junit.Test

class SearchRecentsTest {
    @Test
    fun keepsTheNewestEightAndDropsDuplicates() {
        val first = rememberSearchQuery(emptyList(), "  harbor ")
        assertEquals(listOf("harbor"), first)
        val again = rememberSearchQuery(listOf("kite", "harbor"), "Harbor")
        assertEquals(listOf("Harbor", "kite"), again)
        assertEquals(listOf("kite", "harbor"), rememberSearchQuery(listOf("kite", "harbor"), "a"))
        val eight = (1..8).map { "show $it" }
        val nine = rememberSearchQuery(eight, "newest")
        assertEquals(8, nine.size)
        assertEquals("newest", nine.first())
        assertEquals("show 7", nine.last())
    }

    @Test
    fun roundTripsTheStoredList() {
        val encoded = encodeSearchRecents(listOf("harbor", "kite"))
        assertEquals(listOf("harbor", "kite"), decodeSearchRecents(encoded))
        assertEquals(emptyList<String>(), decodeSearchRecents(""))
    }
}
