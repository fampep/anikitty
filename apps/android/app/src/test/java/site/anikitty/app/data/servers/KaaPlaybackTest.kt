// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class KaaPlaybackTest {
    @Test
    fun searchKeepsTheExactTvTitle() {
        val payload = """
            {"result":[
              {"slug":"death-note-rewrite-aa1","title_en":"Death Note Rewrite","title":"Death Note Rewrite","type":"tv","locales":["ja-JP"]},
              {"slug":"death-note-aa92","title_en":"Death Note","title":"DEATH NOTE","type":"tv","locales":["ja-JP","en-US"]},
              {"slug":"death-note-movie","title":"Death Note","type":"movie","locales":["ja-JP"]}
            ]}
        """.trimIndent()
        val hit = kaaPickShow(payload, "Death Note || mal:1535")
        assertEquals("death-note-aa92", hit?.slug)
        assertEquals(setOf("ja-JP", "en-US"), hit?.locales)
        assertNull(kaaPickShow(payload, "Naruto"))
    }

    @Test
    fun episodePathUsesTheShortSlug() {
        val payload = """
            {"result":[
              {"episode_number":1,"slug":"4806ee","title":"Rebirth"},
              {"episode_number":2,"slug":"ep-2-abcd"}
            ]}
        """.trimIndent()
        assertEquals("ep-1-4806ee", kaaEpisodePath(payload, 1))
        assertEquals("ep-2-abcd", kaaEpisodePath(payload, 2))
        assertNull(kaaEpisodePath(payload, 9))
    }

    @Test
    fun episodeListShapeStillMatches() {
        val payload = """
            {"episodes":[{"episode_number":1,"id":"thumb/ep-1-4806ee"}]}
        """.trimIndent()
        assertEquals("ep-1-4806ee", kaaEpisodePath(payload, 1))
    }

    @Test
    fun vidstreamIdBecomesTheMasterPlaylist() {
        val detail = """
            {"servers":[
              {"name":"Duck","src":"https://example.invalid/duck"},
              {"name":"VidStreaming","src":"https://krussdomi.com/player?id=64d57de44c6d0b&ep=vidstream&en-US"}
            ]}
        """.trimIndent()
        val player = kaaVidStreamingUrl(detail)
        assertEquals(
            "https://krussdomi.com/player?id=64d57de44c6d0b&ep=vidstream&en-US",
            player,
        )
        assertEquals("64d57de44c6d0b", kaaPlayerId(player!!))
        assertEquals(
            "https://hls.krussdomi.com/manifest/64d57de44c6d0b/master.m3u8",
            kaaMasterUrl("64d57de44c6d0b"),
        )
    }

    @Test
    fun relativePlayerAndBareIdAreAccepted() {
        val relative = """{"servers":[{"name":"vidstream","src":"/player?id=abc"}]}"""
        assertEquals("https://krussdomi.com/player?id=abc", kaaVidStreamingUrl(relative))
        val bare = """{"servers":[{"name":"VidStreaming","id":"onlyid"}]}"""
        assertEquals("onlyid", kaaPlayerId(kaaVidStreamingUrl(bare)!!))
    }

    @Test
    fun playlistPicksTheTallestVariantAndKeepsCaptions() {
        val playlist = """
            #EXTM3U
            #EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360,CODECS="avc1.42c01e,mp4a.40.2"
            low.m3u8
            #EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2",CHANNELS=2
            high.m3u8
        """.trimIndent()
        assertTrue(kaaBestVariant(playlist).contains("1920x1080"))
        val captions = """
            "language":[0,"en"],"name":[0,"English"],"src":[0,"https://cdn.example/en.vtt"]
        """.trimIndent()
        val source = kaaPlayable(
            detail = """{"servers":[{"name":"VidStreaming","src":"https://krussdomi.com/player?id=abc&ep=vidstream"}]}""",
            playlist = playlist,
            captions = captions,
            dub = false,
        )
        assertEquals("https://hls.krussdomi.com/manifest/abc/master.m3u8", source?.url)
        assertEquals("1080p", source?.quality)
        assertEquals("AAC · 2.0 · SUB", source?.audio)
        assertEquals(0, source?.stripBytes)
        assertEquals("https://krussdomi.com/", source?.headers?.get("Referer"))
        assertEquals("https://krussdomi.com", source?.headers?.get("Origin"))
        assertEquals("https://cdn.example/en.vtt", source?.subtitles?.single()?.url)
        assertEquals("text/vtt", source?.subtitles?.single()?.mimeType)
    }

    @Test
    fun challengePageIsBlockedAndAMissIsNot() {
        assertTrue(kaaBlocked(403, "<html>Just a moment...</html>"))
        assertTrue(kaaBlocked(200, "<html>challenge-platform</html>"))
        assertFalse(kaaBlocked(200, """{"result":[]}"""))
        assertFalse(KaaServer.MISSING.contains("404"))
        assertFalse(KaaServer.BLOCKED.contains("403"))
    }
}
