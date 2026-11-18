// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class GogoAnimePlaybackTest {
    @Test
    fun searchIgnoresTheSidebarWhenTheCatalogMisses() {
        val html = """
            <div class="listupd">
                <center><h3>Not Found</h3></center>
            </div>
            <div class="listupd" id="external-results-container"></div>
            <a href="https://gogoanime.by/series/one-piece-1/" title="One Piece"></a>
        """.trimIndent()
        assertTrue(gogoSearchHits(html).isEmpty())
    }

    @Test
    fun searchMatchesACyrillicLookalikeAndPrefersDub() {
        val html = """
            <div class="listupd">
                <article class="bs">
                    <a href="https://gogoanime.by/series/juu%d0%beu-mujin-dandivine/" title="Juuоu Mujin Dandivine"></a>
                </article>
                <article class="bs">
                    <a href="https://gogoanime.by/series/one-piece-1/" title="One Piece"></a>
                    <a href="https://gogoanime.by/series/one-piece-english-dubbed-online/" title="One Piece English Dubbed"></a>
                </article>
            </div>
        """.trimIndent()
        val hits = gogoSearchHits(html)
        val show = gogoPickShow(hits, "Juuou Mujin Dandivine || mal:1", dub = false)
        assertEquals("https://gogoanime.by/series/juu%d0%beu-mujin-dandivine/", show?.url)
        assertEquals(
            "https://gogoanime.by/series/one-piece-english-dubbed-online/",
            gogoPickShow(hits, "One Piece", dub = true)?.url,
        )
        assertEquals(
            "https://gogoanime.by/series/one-piece-1/",
            gogoPickShow(hits, "One Piece", dub = false)?.url,
        )
        assertNull(gogoPickShow(hits, "Naruto", dub = false))
    }

    @Test
    fun closerTitleBeatsAMovieSequelOrYear() {
        val hits = listOf(
            GogoShow("One Piece Movie English Dubbed", "https://gogoanime.by/series/one-piece-movie-english-dubbed/"),
            GogoShow("One Piece Stampede", "https://gogoanime.by/series/one-piece-stampede/"),
            GogoShow("One Piece TV", "https://gogoanime.by/series/one-piece-tv/"),
            GogoShow("One Piece 2024", "https://gogoanime.by/series/one-piece-2024/"),
            GogoShow("One Piece English Dubbed", "https://gogoanime.by/series/one-piece-english-dubbed-online/"),
            GogoShow("One Piece", "https://gogoanime.by/series/one-piece-1/"),
        )
        assertEquals(
            "https://gogoanime.by/series/one-piece-english-dubbed-online/",
            gogoPickShow(hits, "One Piece", dub = true)?.url,
        )
        assertEquals(
            "https://gogoanime.by/series/one-piece-1/",
            gogoPickShow(hits, "One Piece", dub = false)?.url,
        )
        assertEquals(
            "https://gogoanime.by/series/one-piece-stampede/",
            gogoPickShow(hits, "One Piece Stampede", dub = false)?.url,
        )
        val seasons = listOf(
            GogoShow("Frieren 2nd Season", "https://gogoanime.by/series/frieren-2nd-season/"),
            GogoShow("Frieren Season 2", "https://gogoanime.by/series/frieren-season-2/"),
            GogoShow("Frieren", "https://gogoanime.by/series/frieren/"),
        )
        assertEquals(
            "https://gogoanime.by/series/frieren/",
            gogoPickShow(seasons, "Frieren", dub = false)?.url,
        )
        assertEquals(
            "https://gogoanime.by/series/frieren-season-2/",
            gogoPickShow(seasons, "Frieren Season 2", dub = false)?.url,
        )
    }

    @Test
    fun shortQueryIsTriedAfterTheFullTitle() {
        assertEquals(
            listOf("Juuou Mujin Dandivine", "Dandivine", "Juuou", "Mujin"),
            gogoQueries("Juuou Mujin Dandivine"),
        )
    }

    @Test
    fun episodeListKeepsLanguage() {
        val html = """
            <div class="episode-item" data-episode-number="7">
                <a href="https://gogoanime.by/juuou-mujin-dandivine-episode-7-english-subbed/">Episode 7</a>
            </div>
            <div class="episode-item" data-episode-number="1123">
                <a href="https://gogoanime.by/one-piece-episode-1123-english-dubbed/">Episode 1123</a>
            </div>
        """.trimIndent()
        val rows = gogoEpisodes(html)
        assertEquals(
            "https://gogoanime.by/juuou-mujin-dandivine-episode-7-english-subbed/",
            rows.first { it.number == 7 && !it.dub }.url,
        )
        assertTrue(rows.first { it.number == 1123 }.dub)
        assertNull(rows.firstOrNull { it.number == 7 && it.dub })
    }

    @Test
    fun playerPrefersTheEmbedButtonForThatLanguage() {
        val html = """
            <div class="servers">
                <div class="type" data-type="dub">
                    <label>DUB:</label>
                    <ul>
                        <li class="player-type-link" data-src="https://gogoanime.by/player/?source=blogger&amp;url=abc">SD</li>
                        <li class="player-type-link" data-src="https://gogoanime.by/player/?source=embed&amp;url=def">Mega</li>
                    </ul>
                </div>
                <div class="type" data-type="sub">
                    <label>SUB:</label>
                    <ul>
                        <li class="player-type-link" data-src="https://gogoanime.by/player/?source=embed&amp;url=sub">HD</li>
                    </ul>
                </div>
            </div>
        """.trimIndent()
        val dubs = gogoPlayers(html, dub = true)
        assertEquals("https://gogoanime.by/player/?source=embed&url=def", dubs.first().url)
        assertEquals("Mega", dubs.first().label)
        assertEquals("HD", gogoPlayers(html, dub = false).single().label)
    }

    @Test
    fun megaPlayFileStaysOnMegaPlay() {
        val html = """
            file: "https://cdn.example/master.m3u8"
            file: "https://megaplay.su/uploads/hls/abc/index.m3u8?v=1"
        """.trimIndent()
        assertEquals(
            "https://megaplay.su/uploads/hls/abc/index.m3u8?v=1",
            gogoMegaPlayFile(html),
        )
        val frame = """<iframe class="player-iframe" src="https://megaplay.su/embed.php?sid=abc">"""
        assertEquals("https://megaplay.su/embed.php?sid=abc", gogoFrame(frame))
        assertNull(gogoFrame("""<iframe src="https://evil.example/embed">"""))
    }

    @Test
    fun megaVidSourceKeepsChaptersAndDropsOtherHosts() {
        val page = """
            <script type="application/json" id="player-payload">{"sourceUrl":"/mal/21/7/dub/source","autoplay":true}</script>
        """.trimIndent()
        assertEquals("/mal/21/7/dub/source", gogoMegaVidPath(page))
        assertNull(gogoMegaVidPath("""<script id="player-payload">{"sourceUrl":"https://evil.example/a"}</script>"""))
        val pending = gogoMegaVid(
            """
            {"status":"ok","source":"https://megavid.buzz/vid/example/master",
             "tracks":[{"file":"https://megavid.buzz/cap/en.vtt","label":"English","kind":"captions"}],
             "chapters":[{"title":"Intro","start":10,"end":20},{"title":"Outro","start":90,"end":100}]}
            """.trimIndent(),
        )
        assertEquals("https://megavid.buzz/vid/example/master", pending?.url)
        assertEquals("English", pending?.tracks?.single()?.label)
        assertEquals(10.0, pending?.skip?.intro?.startSec)
        assertEquals(100.0, pending?.skip?.outro?.endSec)
        assertNull(gogoMegaVid("""{"status":"ok","source":"https://cdn.example/a.m3u8"}"""))
    }

    @Test
    fun playlistReportsTheRungAndTheButtonGrade() {
        val master = """
            #EXTM3U
            #EXT-X-STREAM-INF:BANDWIDTH=1,RESOLUTION=1280x720,CODECS="avc1.64001f,mp4a.40.2"
            https://megavid.buzz/vid/a/low
        """.trimIndent()
        val dubbed = gogoPlayable(
            url = "https://megavid.buzz/vid/example/master",
            playlist = master,
            siteLabel = "Mega",
            dub = true,
            userAgent = GogoAnimeServer.USER_AGENT,
            origin = GogoAnimeServer.MEGAVID_ORIGIN,
        )
        assertEquals("720p", dubbed?.quality)
        assertEquals("AAC · DUB", dubbed?.audio)
        assertEquals("en", dubbed?.audioLanguage)
        assertTrue(dubbed?.hls == true)
        assertEquals(GogoAnimeServer.MEGAVID_ORIGIN, dubbed?.headers?.get("Origin"))
        assertNull(dubbed?.qualityRating)

        val media = """
            #EXTM3U
            #EXT-X-VERSION:6
            #EXTINF:6.0,
            segment_00000.ts
        """.trimIndent()
        val sub = gogoPlayable(
            url = "https://megaplay.su/uploads/hls/abc/index.m3u8",
            playlist = media,
            siteLabel = "HD",
            dub = false,
            userAgent = GogoAnimeServer.USER_AGENT,
            origin = GogoAnimeServer.MEGAPLAY_ORIGIN,
        )
        assertNull(sub?.quality)
        assertEquals("HD", sub?.qualityRating)
        assertEquals("SUB", sub?.audio)
        assertEquals("ja", sub?.audioLanguage)
        assertEquals("HD", sub?.label)
        assertNull(
            gogoPlayable(
                url = "https://cdn.example/a.m3u8",
                playlist = media,
                siteLabel = "HD",
                dub = false,
                userAgent = "ua",
                origin = GogoAnimeServer.MEGAPLAY_ORIGIN,
            ),
        )
        assertNull(
            gogoPlayable(
                url = "https://megaplay.su/a.m3u8",
                playlist = "not a playlist",
                siteLabel = "HD",
                dub = false,
                userAgent = "ua",
                origin = GogoAnimeServer.MEGAPLAY_ORIGIN,
            ),
        )
    }

    @Test
    fun blockedPagesAreNamedWithoutStatusCodes() {
        assertTrue(gogoBlocked(403, "nope"))
        assertTrue(gogoBlocked(200, "<html>Just a moment...</html>"))
        assertFalse(gogoBlocked(200, "<html><title>Gogoanime</title></html>"))
        assertFalse(GogoAnimeServer.MISSING.contains("404"))
        assertFalse(GogoAnimeServer.BLOCKED.contains("403"))
    }
}
