// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
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

    @Test
    fun pickMatchRejectsSubstringAndFirstHit() {
        val hits = listOf(
            AnimeSummary(1, "From Far Away Recap", null, episodes = 1, format = "SPECIAL", averageScore = null),
            AnimeSummary(9, "Totally Different Show", null, episodes = 12, format = "TV", averageScore = null),
        )
        assertNull(ProviderLatestMapper.pickMatch("From Far Away, From the Other Side", hits))
    }

    @Test
    fun pickMatchAcceptsRomajiExact() {
        val hits = listOf(
            AnimeSummary(
                3,
                "Frieren: Beyond Journey's End",
                null,
                episodes = 28,
                format = "TV",
                averageScore = 90,
                romajiTitle = "Sousou no Frieren",
            ),
        )
        assertEquals(3, ProviderLatestMapper.pickMatch("Sousou no Frieren", hits)?.id)
    }
}
