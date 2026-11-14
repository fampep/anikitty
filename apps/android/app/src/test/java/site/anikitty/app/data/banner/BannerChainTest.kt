// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.banner

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class BannerChainTest {
    @Test
    fun skipsKeyedSourcesWhenKeysAreMissing() {
        val choices = bannerChoices(
            tmdbKeyPresent = false,
            fanartKeyPresent = false,
            tmdbPath = "/abc.jpg",
            fanartUrl = "https://fanart.tv/a.jpg",
            kitsuLarge = "https://kitsu.app/large.jpg",
            anilistBanner = "https://anilist.co/banner.jpg",
            coverExtraLarge = "https://anilist.co/cover.jpg",
        )
        assertEquals(listOf("kitsu", "anilist", "cover"), choices.map { it.source })
        assertTrue(choices.last().blur)
    }

    @Test
    fun fullChainUsesW1280AndBlurredCoverLast() {
        val choices = bannerChoices(
            tmdbKeyPresent = true,
            fanartKeyPresent = true,
            tmdbPath = "/backdrop.jpg",
            fanartUrl = "https://assets.fanart.tv/bg.jpg",
            kitsuLarge = "https://kitsu.app/large.jpg",
            anilistBanner = "https://anilist.co/banner.jpg",
            coverExtraLarge = "https://anilist.co/cover.jpg",
        )
        assertEquals("https://image.tmdb.org/t/p/w1280/backdrop.jpg", choices.first().url)
        assertEquals(listOf("tmdb", "fanart", "kitsu", "anilist", "cover"), choices.map { it.source })
        assertTrue(choices.last().blur)
    }

    @Test
    fun prefersTextlessLandscapeBackdrop() {
        val path = pickTmdbPath(
            listOf(
                TmdbBackdrop("/poster.jpg", null, 0.7, 10.0),
                TmdbBackdrop("/text.jpg", "en", 1.78, 20.0),
                TmdbBackdrop("/clean.jpg", null, 1.78, 8.0),
            ),
        )
        assertEquals("/clean.jpg", path)
    }
}
