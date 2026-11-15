// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.app

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
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
    }

    private fun sample(format: String, status: String) = AnimeSummary(
        id = 1,
        title = "Sample",
        coverImageUrl = null,
        episodes = 12,
        format = format,
        averageScore = null,
        status = status,
    )
}
