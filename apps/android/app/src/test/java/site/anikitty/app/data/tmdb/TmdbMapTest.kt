// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.tmdb

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class TmdbMapTest {
    @Test
    fun seasonHintReadsSeasonAndPart() {
        assertEquals(3, seasonNumberFromTitle("The Apothecary Diaries Season 3"))
        assertEquals(2, seasonNumberFromTitle("A Wild Last Boss Appeared! 2nd Season"))
        assertEquals(2, seasonNumberFromTitle("Title Part 2"))
        assertNull(seasonNumberFromTitle("Frieren"))
    }

    @Test
    fun pickSeasonUsesHintThenYear() {
        val seasons = listOf(
            TmdbSeasonSlot(1, "Season 1", 2023),
            TmdbSeasonSlot(2, "Season 2", 2025),
            TmdbSeasonSlot(3, "Season 3", 2026),
        )
        assertEquals(3, pickSeason(seasons, "The Apothecary Diaries Season 3", 2026))
        assertEquals(2, pickSeason(seasons, "Continuing story", 2025))
        assertEquals(1, pickSeason(seasons, "Continuing story", null))
    }

    @Test
    fun searchRejectsAWeakTitle() {
        val hits = listOf(
            TmdbSearchHit(9, "Something Else", 2026, 40.0),
            TmdbSearchHit(4, "The Apothecary Diaries", 2026, 12.0),
        )
        assertEquals(4, pickSearchHit(hits, "The Apothecary Diaries Season 3", 2026)?.id)
        assertNull(pickSearchHit(hits, "Completely Different", 1999))
    }

    @Test
    fun logoPrefersEnglish() {
        val path = pickLogo(
            listOf(
                TmdbImage("/ja.png", "ja", 20.0),
                TmdbImage("/en.png", "en", 4.0),
                TmdbImage("/none.png", null, 30.0),
            ),
        )
        assertEquals("/en.png", path)
    }

    @Test
    fun ratingPrefersUsThenJapan() {
        assertEquals("TV-14", pickRating(listOf("JP" to "PG-12", "US" to "TV-14")))
        assertEquals("PG-12", pickRating(listOf("FR" to "10", "JP" to "PG-12")))
    }

    @Test
    fun episodeTitleAndStillAndDate() {
        assertEquals("The Interview", preferEpisodeTitle("Episode 1", 1, "The Interview"))
        assertEquals("Already named", preferEpisodeTitle("Already named", 1, "  "))
        assertEquals("https://image.tmdb.org/still.jpg", preferStill("https://anilist.co/cover.jpg", "https://image.tmdb.org/still.jpg"))
        assertEquals("Oct 4", shortAirDate("2026-10-04"))
    }
}
