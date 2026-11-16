// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.anilist

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AniListSeasonEntriesTest {
    @Test
    fun seriesSwitcherLabelUsesAiringSeasonAndTitle() {
        val rel = AnimeRelation(
            id = 2,
            title = "Jujutsu Kaisen 2nd Season",
            coverImageUrl = null,
            relationType = "SEQUEL",
            format = "TV",
            season = "FALL",
            seasonYear = 2023,
        )
        assertEquals("Fall 2023 · Jujutsu Kaisen 2nd Season", rel.seriesSwitcherLabel())
    }

    @Test
    fun seasonEntriesKeepsPrequelSequelChainOnly() {
        val detail = AnimeSummary(
            id = 2,
            title = "Show S2",
            coverImageUrl = null,
            episodes = 24,
            format = "TV",
            averageScore = 80,
            season = "FALL",
            seasonYear = 2023,
            relations = listOf(
                AnimeRelation(1, "Show S1", null, "PREQUEL", format = "TV", season = "FALL", seasonYear = 2020),
                AnimeRelation(3, "Show Movie", null, "SIDE_STORY", format = "MOVIE", season = "SUMMER", seasonYear = 2022),
                AnimeRelation(4, "Show S3", null, "SEQUEL", format = "TV", season = "WINTER", seasonYear = 2025),
            ),
        )
        val entries = detail.seasonEntries()
        assertEquals(listOf(1, 2, 4), entries.map { it.id })
        assertFalse(entries.any { it.id == 3 })
        assertTrue(entries.any { it.id == 2 && it.relationType == "Current" })
        assertEquals("Fall 2020 · Show S1", entries.first { it.id == 1 }.seriesSwitcherLabel())
    }

    @Test
    fun airedRangeUsesThePremiereYearNotTheSeasonYear() {
        val winter = AnimeSummary(
            id = 9,
            title = "December premiere",
            coverImageUrl = null,
            episodes = 12,
            format = "TV",
            averageScore = 70,
            season = "WINTER",
            seasonYear = 2024,
            startDay = 28,
            startMonth = 12,
            startYear = 2023,
        )
        assertEquals("2023-12-28", winter.airedRangeLabel())
    }
}
