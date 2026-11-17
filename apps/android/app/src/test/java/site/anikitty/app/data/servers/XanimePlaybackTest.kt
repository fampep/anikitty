// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class XanimePlaybackTest {
    @Test
    fun envelopeRoundTripsTheQuery() {
        val plain = """{"query":"get_q27","variables":{"select":{"word":"Death Note"}}}"""
        assertEquals(plain, xanimeOpen(xanimeSeal(plain)))
        assertEquals("""{"data":{}}""", xanimeOpen("""{"data":{}}"""))
        assertNull(xanimeOpen("not-json"))
    }

    @Test
    fun searchKeepsDeathNoteByAnilistId() {
        val payload = """
            {"data":{"get_q27":{"items":[
              {"id":"91535","data":{"ani_id":"91535","info_title":"Death Note","al_id":"1535"}},
              {"id":"97496","data":{"ani_id":"97496","info_title":"Death Note: Relight","al_id":2994}}
            ]}}}
        """.trimIndent()
        val hit = xanimePickShow(payload, 1535, "Death Note || mal:1535")
        assertEquals("91535", hit?.id)
        assertEquals(1535, hit?.anilistId)
        assertEquals("97496", xanimePickShow(payload, 2994, "Death Note")?.id)
        assertNull(xanimePickShow(payload, 99, "Naruto"))
    }

    @Test
    fun searchFallsBackToTheExactTitle() {
        val payload = """
            {"data":{"get_q27":{"items":[
              {"id":"97496","data":{"ani_id":"97496","info_title":"Death Note: Relight","al_id":"2994"}},
              {"id":"91535","data":{"ani_id":"91535","info_title":"Death Note","al_id":"1535"}}
            ]}}}
        """.trimIndent()
        assertEquals("91535", xanimePickShow(payload, 0, "Death Note")?.id)
    }

    @Test
    fun episodeSkipsPartsAndReportsSubAndDub() {
        val payload = """
            {"data":{"get_q01":{"paging":{"pages":2,"page":1},"items":[
              {"data":{"ep_id":"part","ep_index":1,"ep_sub_index":1,"sourcesNode_list":[{"data":{"src_type":"sub"}}]}},
              {"data":{"ep_id":"31961043","ep_index":1,"ep_sub_index":0,"sourcesNode_list":[
                {"data":{"src_type":"dub"}},
                {"data":{"src_type":"sub"}}
              ]}},
              {"data":{"ep_id":"sub-only","ep_index":2,"ep_sub_index":0,"sourcesNode_list":[{"data":{"src_type":"sub"}}]}}
            ]}}}
        """.trimIndent()
        assertEquals(2, xanimeEpisodePages(payload))
        val first = xanimeEpisode(payload, 1)
        assertEquals("31961043", first?.id)
        assertEquals(true, first?.hasSub)
        assertEquals(true, first?.hasDub)
        assertEquals(false, xanimeEpisode(payload, 2)?.hasDub)
        assertNull(xanimeEpisode(payload, 9))
    }

    @Test
    fun sourceKeepsTheMatchingLanguageAndCaption() {
        val payload = """
            {"data":{"get_q07":{"data":{"sourcesNode_list":[
              {"data":{"src_type":"dub","souPath":"https://cdn.example/dub/a-master.m3u8"}},
              {"data":{"src_type":"sub","souPath":"/media/sub/a-master.m3u8","track":[
                {"label":"English","kind":"captions","trackPath":"https://cdn.example/en.vtt"}
              ]}}
            ]}}}}
        """.trimIndent()
        val sub = xanimeLinks(payload, dub = false, XanimeServer.ORIGIN, XanimeServer.USER_AGENT)
        assertEquals("https://xanime.app/media/sub/a-master.m3u8", sub.single().url)
        assertEquals("https://xanime.app/", sub.single().headers["Referer"])
        assertEquals(XanimeServer.ORIGIN, sub.single().headers["Origin"])
        assertEquals(XanimeServer.USER_AGENT, sub.single().headers["User-Agent"])
        assertEquals("English", sub.single().subtitles.single().label)
        assertEquals(
            "https://cdn.example/dub/a-master.m3u8",
            xanimeLinks(payload, dub = true, XanimeServer.ORIGIN, XanimeServer.USER_AGENT).single().url,
        )
    }

    @Test
    fun playlistMarksHlsAndReads1080() {
        val playlist = """
            #EXTM3U
            #EXT-X-STREAM-INF:BANDWIDTH=1372970,RESOLUTION=1920x1080,CODECS="avc1.640032,mp4a.40.2"
            a-index-f1-v1-a1.ico
            #EXT-X-STREAM-INF:BANDWIDTH=379438,RESOLUTION=640x360,CODECS="avc1.64001e,mp4a.40.2"
            a-index-f3-v1-a1.ico
        """.trimIndent()
        val link = XanimeLink(
            url = "https://cdn.example/a-master.m3u8",
            headers = mapOf("Referer" to "https://xanime.app/"),
            subtitles = emptyList(),
        )
        val source = xanimePlayable(link, playlist, dub = false)
        assertEquals("https://cdn.example/a-master.m3u8", source?.url)
        assertEquals("1080p", source?.quality)
        assertEquals("AAC · SUB", source?.audio)
        assertEquals(0, source?.stripBytes)
        assertTrue(source?.hls == true)
        assertNull(xanimePlayable(link, "not a playlist", dub = false))
    }

    @Test
    fun messagesStayFreeOfStatusCodes() {
        assertTrue(xanimeBlocked(403, "<html>Just a moment...</html>"))
        assertTrue(xanimeBlocked(200, "<html>challenge-platform</html>"))
        assertFalse(xanimeBlocked(200, """{"data":{}}"""))
        assertFalse(XanimeServer.MISSING.contains("404"))
        assertFalse(XanimeServer.BLOCKED.contains("403"))
    }
}
