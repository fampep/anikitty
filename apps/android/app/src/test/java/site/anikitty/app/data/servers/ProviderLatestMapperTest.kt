// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import org.junit.Assert.assertEquals
import org.junit.Test
import site.anikitty.app.data.anilist.AnimeSummary

class ProviderLatestMapperTest {
    @Test
    fun pickMatchPrefersExactTitle() {
        val hits = listOf(
            AnimeSummary(1, "From Far Away Recap", null, episodes = 1, format = "SPECIAL", averageScore = null),
            AnimeSummary(2, "From Far Away, From the Other Side", null, episodes = 12, format = "TV", averageScore = null),
        )
        val match = ProviderLatestMapper.pickMatch("From Far Away, From the Other Side", hits)
        assertEquals(2, match?.id)
    }
}
