// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AnimexPlaybackTest {
    @Test
    fun searchKeepsMonsterByAnilistId() {
        val payload = """
            {"data":{"searchAnime":{"items":[
              {"id":"monster-musume-lqbh7","anilistId":21093,"titleRomaji":"Monster Musume","titleEnglish":"Monster Musume"},
              {"id":"monster-v4tjd","anilistId":19,"titleRomaji":"MONSTER","titleEnglish":"Monster"}
            ]}}}
        """.trimIndent()
        val hit = animexPickShow(payload, 19, "Monster || mal:19")
        assertEquals("monster-v4tjd", hit?.id)
        assertEquals(19, hit?.anilistId)
        assertNull(animexPickShow(payload, 99, "Naruto"))
    }

    @Test
    fun searchFallsBackToTheExactTitle() {
        val payload = """
            {"data":{"searchAnime":{"items":[
              {"id":"monster-musume-lqbh7","anilistId":21093,"titleEnglish":"Monster Musume"},
              {"id":"monster-v4tjd","anilistId":19,"titleEnglish":"Monster","titleRomaji":"MONSTER"}
            ]}}}
        """.trimIndent()
        assertEquals("monster-v4tjd", animexPickShow(payload, 0, "Monster")?.id)
    }

    @Test
    fun episodeReportsSubAndDub() {
        val payload = """
            [
              {"number":1,"hasSub":true,"hasDub":true},
              {"number":2,"hasSub":true,"hasDub":false}
            ]
        """.trimIndent()
        val first = animexEpisode(payload, 1)
        assertEquals(true, first?.hasSub)
        assertEquals(true, first?.hasDub)
        assertEquals(false, animexEpisode(payload, 2)?.hasDub)
        assertNull(animexEpisode(payload, 9))
    }

    @Test
    fun defaultServerIsFirst() {
        val payload = """
            {"subProviders":[
              {"id":"yuki","default":false},
              {"id":"nero","default":true},
              {"id":"sora","default":false}
            ],"dubProviders":[{"id":"sora","default":true}]}
        """.trimIndent()
        assertEquals(listOf("nero", "yuki", "sora"), animexProviderIds(payload, dub = false))
        assertEquals(listOf("sora"), animexProviderIds(payload, dub = true))
    }

    @Test
    fun sourceKeepsRefererAndAddsTheSameUserAgent() {
        val payload = """
            {"sources":[{"url":"https://cdn.example/s/deeznuts.txt","quality":"auto","type":"application/vnd.apple.mpegurl"}],
             "headers":{"Referer":"https://animex.one/","Host":"cdn.example"},
             "tracks":[{"url":"https://subs.example/en.vtt","lang":"en","label":"English","kind":"captions"}],
             "intro":{"start":12,"end":90},"outro":[1300,1400]}
        """.trimIndent()
        val link = animexLink(payload, AnimexServer.USER_AGENT)
        assertEquals("https://cdn.example/s/deeznuts.txt", link?.url)
        assertEquals("https://animex.one/", link?.headers?.get("Referer"))
        assertEquals(AnimexServer.USER_AGENT, link?.headers?.get("User-Agent"))
        assertFalse(link?.headers?.containsKey("Host") == true)
        assertEquals("English", link?.subtitles?.single()?.label)
        assertEquals(12.0, link?.skip?.intro?.startSec ?: -1.0, 0.01)
        assertEquals(1300.0, link?.skip?.outro?.startSec ?: -1.0, 0.01)
    }

    @Test
    fun playlistMarksHlsAndReads1080() {
        val playlist = """
            #EXTM3U
            #EXT-X-STREAM-INF:BANDWIDTH=600967,RESOLUTION=1440x1080,CODECS="avc1.640028,mp4a.40.29"
            1080p/nut-1.txt
            #EXT-X-STREAM-INF:BANDWIDTH=200000,RESOLUTION=640x360,CODECS="avc1.42c01e,mp4a.40.2"
            360p/nut-1.txt
        """.trimIndent()
        val link = AnimexLink(
            url = "https://cdn.example/s/deeznuts.txt",
            headers = mapOf("Referer" to "https://animex.one/", "User-Agent" to "test"),
            subtitles = emptyList(),
        )
        val source = animexPlayable(link, playlist, dub = false)
        assertEquals("https://cdn.example/s/deeznuts.txt", source?.url)
        assertEquals("1080p", source?.quality)
        assertEquals("AAC · SUB", source?.audio)
        assertEquals(0, source?.stripBytes)
        assertTrue(source?.hls == true)
        assertNull(animexPlayable(link, "not a playlist", dub = false))
    }

    @Test
    fun messagesStayFreeOfStatusCodes() {
        assertTrue(animexBlocked(403, "<html>Just a moment...</html>"))
        assertTrue(animexBlocked(200, "<html>challenge-platform</html>"))
        assertFalse(animexBlocked(200, """{"sources":[]}"""))
        assertFalse(AnimexServer.MISSING.contains("404"))
        assertFalse(AnimexServer.BLOCKED.contains("403"))
    }
}
