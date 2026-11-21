// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AnizonePlaybackTest {
    @Test
    fun searchReadsTheCardTitleAndTheIndexPath() {
        val html = """
            <div x-data="window.getTitle(this.anmTitles, 'One Piece')">
              <a href="https://anizone.to/index.php/anime/siuvpqmq">One Piece</a>
            </div>
            <div x-data="window.getTitle(this.anmTitles, 'One Piece Film Red')">
              <a href="/anime/filmred1">Film</a>
            </div>
            <a href="/anime/siuvpqmq/4">Episode 4</a>
        """.trimIndent()
        val hits = anizoneSearchHits(html)
        assertEquals(listOf("siuvpqmq", "filmred1"), hits.map { it.slug })
        assertEquals("siuvpqmq", anizonePickShow(hits, "One Piece")?.slug)
        assertEquals("filmred1", anizonePickShow(hits, "One Piece Film Red")?.slug)
        assertNull(anizonePickShow(hits, "Naruto"))
    }

    @Test
    fun searchKeepsATranslatedNameOnTheSameCard() {
        val html = """
            <div x-data="{ anmTitles: JSON.parse('{\"en\":\"Frieren\",\"ja\":\"\\u846c\\u9001\\u306e\\u30d5\\u30ea\\u30fc\\u30ec\\u30f3\"}') }">
              <a href="/anime/fri12345">Frieren</a>
            </div>
        """.trimIndent()
        val show = anizonePickShow(anizoneSearchHits(html), "葬送のフリーレン")
        assertEquals("fri12345", show?.slug)
        assertTrue(show?.title == "Frieren" || show?.aliases?.contains("Frieren") == true)
        assertEquals("fri12345", anizonePickShow(anizoneSearchHits(html), "Frieren")?.slug)
    }

    @Test
    fun episodePageUsesTheMasterAndTheSubtitleTrack() {
        val html = """
            <media-player src="https://files.example/hls/siuvpqmq/1/master.m3u8">
              <track kind="subtitles" label="English" srclang="en" src="https://files.example/sub/en.vtt">
            </media-player>
            <button wire:click="setVideo(10)">Japanese</button>
        """.trimIndent()
        val offers = anizoneOffers(html)
        val sub = anizoneChoose(offers, dub = false)
        assertEquals("https://files.example/hls/siuvpqmq/1/master.m3u8", sub?.url)
        assertEquals(false, sub?.english)
        assertEquals("https://files.example/sub/en.vtt", sub?.tracks?.single()?.url)
        assertEquals("en", sub?.tracks?.single()?.language)
        assertNull(anizoneChoose(offers, dub = true))
    }

    @Test
    fun englishButtonKeepsThePlayerMasterForSub() {
        val html = """
            <media-player src="https://files.example/hls/siuvpqmq/1/master.m3u8">
              <track kind="subtitles" label="English" srclang="en" src="https://files.example/sub/en.vtt">
            </media-player>
            <button wire:click="setVideo(&quot;https://cdn.example/en/master.m3u8&quot;)">English</button>
        """.trimIndent()
        val offers = anizoneOffers(html)
        val sub = anizoneChoose(offers, dub = false)
        assertEquals("https://files.example/hls/siuvpqmq/1/master.m3u8", sub?.url)
        assertEquals(false, sub?.english)
        assertEquals("https://cdn.example/en/master.m3u8", anizoneChoose(offers, dub = true)?.url)
    }

    @Test
    fun englishAudioUsesTheFileTheButtonNames() {
        val html = """
            <button wire:click="setVideo(&quot;https://cdn.example/jp/master.m3u8&quot;)">Japanese</button>
            <button wire:click="setVideo(&quot;https://cdn.example/en/master.m3u8&quot;)">English</button>
            <track kind="captions" label="English" srclang="en" src="https://cdn.example/en.ass">
        """.trimIndent()
        val offers = anizoneOffers(html)
        assertEquals("https://cdn.example/jp/master.m3u8", anizoneChoose(offers, dub = false)?.url)
        val dub = anizoneChoose(offers, dub = true)
        assertEquals("https://cdn.example/en/master.m3u8", dub?.url)
        assertEquals(true, dub?.english)
        assertEquals("text/x-ssa", dub?.tracks?.single()?.mimeType)
    }

    @Test
    fun playlistKeepsTheTallestRungAndTheSiteHeaders() {
        val playlist = """
            #EXTM3U
            #EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=1280x720,CODECS="avc1.4d401f,mp4a.40.2"
            low.m3u8
            #EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"
            high.m3u8
        """.trimIndent()
        val source = anizonePlayable(
            url = "https://files.example/master.m3u8",
            playlist = playlist,
            dub = false,
            tracks = emptyList(),
            userAgent = AnizoneServer.USER_AGENT,
        )
        assertEquals("1080p", source?.quality)
        assertEquals("AAC · SUB", source?.audio)
        assertEquals("ja", source?.audioLanguage)
        assertEquals(AnizoneServer.ORIGIN, source?.headers?.get("Origin"))
        assertEquals("${AnizoneServer.ORIGIN}/", source?.headers?.get("Referer"))
        assertEquals(false, source?.hls)
        assertNull(
            anizonePlayable(
                url = "http://files.example/master.m3u8",
                playlist = playlist,
                dub = false,
                tracks = emptyList(),
                userAgent = AnizoneServer.USER_AGENT,
            ),
        )
    }

    @Test
    fun pathsStayOnTheShowTheSearchFound() {
        assertEquals(
            listOf(
                "https://anizone.to/anime?search=One%20Piece",
                "https://anizone.to/index.php/anime?search=One%20Piece",
            ),
            anizoneSearchUrls("One Piece"),
        )
        assertEquals(
            listOf(
                "https://anizone.to/anime/siuvpqmq/3",
                "https://anizone.to/index.php/anime/siuvpqmq/3",
            ),
            anizoneEpisodeUrls("siuvpqmq", 3),
        )
        assertEquals(listOf("Frieren: Beyond Journey's End", "Frieren"), anizoneQueries("Frieren: Beyond Journey's End"))
    }

    @Test
    fun aChallengePageIsBlockedWithoutTheStatusCode() {
        assertTrue(anizoneBlocked(403, ""))
        assertTrue(anizoneBlocked(200, "<title>Just a moment...</title> challenge-platform"))
        assertFalse(anizoneBlocked(200, "<media-player src=\"https://files.example/master.m3u8\">"))
        assertFalse(AnizoneServer.MISSING.contains("404"))
        assertFalse(AnizoneServer.BLOCKED.contains("403"))
    }
}
