// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.app

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import site.anikitty.app.data.anilist.AiringSlot
import site.anikitty.app.data.anilist.AnimeSummary

class HomeShelfTest {
    @Test
    fun shelvesFollowFormatAndStatus() {
        val movie = sample(format = "MOVIE", status = "FINISHED")
        val airing = sample(format = "TV", status = "RELEASING")
        assertTrue(movie.onShelf(HomeShelf.Movies))
        assertTrue(movie.onShelf(HomeShelf.Finished))
        assertFalse(movie.onShelf(HomeShelf.Airing))
        assertTrue(airing.onShelf(HomeShelf.Airing))
        assertFalse(airing.onShelf(HomeShelf.Movies))
        assertTrue(airing.onShelf(HomeShelf.All))
        val unknown = sample(format = "TV", status = null)
        assertFalse(unknown.onShelf(HomeShelf.Airing))
        assertFalse(unknown.onShelf(HomeShelf.Finished))
        assertTrue(unknown.onShelf(HomeShelf.All))
    }

    @Test
    fun futureAiringDoesNotCountOnTheShelf() {
        val movie = sample(format = "MOVIE", status = "FINISHED")
        val now = 1_700_000_000L
        val aired = AiringSlot(anime = movie, episode = 1, airingAtEpochSec = now - 60)
        val later = AiringSlot(anime = movie, episode = 2, airingAtEpochSec = now + 3_600)
        assertTrue(aired.onHomeShelf(HomeShelf.Movies, now))
        assertFalse(later.onHomeShelf(HomeShelf.Movies, now))
        assertFalse(aired.onHomeShelf(HomeShelf.Airing, now))
    }

    private fun sample(format: String, status: String?) = AnimeSummary(
        id = 1,
        title = "Sample",
        coverImageUrl = null,
        episodes = 12,
        format = format,
        averageScore = null,
        status = status,
    )
}
