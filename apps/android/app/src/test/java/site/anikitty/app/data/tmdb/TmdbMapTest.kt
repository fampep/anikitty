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
        val textless = pickLogo(
            listOf(
                TmdbImage("/ja.png", "ja", 40.0),
                TmdbImage("/none.png", null, 4.0),
            ),
        )
        assertEquals("/none.png", textless)
        assertEquals(
            "/en.png",
            pickLogo(
                listOf(
                    TmdbImage("/en.svg", "en", 80.0),
                    TmdbImage("/en.png", "en", 4.0),
                ),
            ),
        )
        assertNull(pickLogo(listOf(TmdbImage("/en.svg", "en", 9.0))))
    }

    @Test
    fun seasonLabelKeepsTheNumber() {
        assertEquals("Season 2 · Culling Game", seasonSelectorLabel(2, "Culling Game"))
        assertEquals("Season 2", seasonSelectorLabel(2, "Season 2"))
        assertEquals("Season 2 · Culling Game", seasonSelectorLabel(2, "Season 2: Culling Game"))
        assertEquals("Season 3", seasonSelectorLabel(3, "The Apothecary Diaries Season 3"))
        assertEquals("Season 3 · Part 2", seasonSelectorLabel(3, "Kusuriya no Hitorigoto 3rd Season Part 2"))
        assertEquals("Specials", seasonSelectorLabel(0, "Specials"))
    }

    @Test
    fun ratingPrefersUsThenJapan() {
        assertEquals("TV-14", pickRating(listOf("JP" to "PG-12", "US" to "TV-14")))
        assertEquals("PG-12", pickRating(listOf("FR" to "10", "JP" to "PG-12")))
    }

    @Test
    fun mappedShowRoundTripKeepsSeasonAndOffset() {
        val show = MappedShow(
            anilistId = 164,
            tmdbId = 128,
            movie = true,
            season = null,
            episodeOffset = 0,
            malId = 164,
            tvdbId = 0,
            kitsuId = 142,
        )
        val back = readMapped(writeMapped(show))
        assertEquals(128, back?.tmdbId)
        assertEquals(true, back?.movie)
        assertEquals(null, back?.season)
        val series = show.copy(movie = false, tmdbId = 26209, season = 1, episodeOffset = 11)
        val seriesBack = readMapped(writeMapped(series))
        assertEquals(1, seriesBack?.season)
        assertEquals(11, seriesBack?.episodeOffset)
        assertEquals(12, tmdbEpisodeNumber(1, 11))
    }

    @Test
    fun episodeTitleAndStillAndDate() {
        assertEquals("The Interview", preferEpisodeTitle("Episode 1", 1, "The Interview"))
        assertEquals("Already named", preferEpisodeTitle("Already named", 1, "  "))
        assertEquals("https://image.tmdb.org/still.jpg", preferStill("https://anilist.co/cover.jpg", "https://image.tmdb.org/still.jpg"))
        assertEquals("Oct 4", shortAirDate("2026-10-04"))
    }
}
