// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AniNzPlaybackTest {
    @Test
    fun searchKeepsFrierenByAnilistId() {
        val payload = """
            {"items":[
              {"id":8384,"source":"settlar","title":"Frieren Season 2","anilistId":"182255"},
              {"id":6351,"source":"settlar","title":"Frieren: Beyond Journey’s End","anilistId":"154587"}
            ]}
        """.trimIndent()
        val hit = aninzPickShow(payload, 154587, "Frieren || mal:52991")
        assertEquals("6351", hit?.id)
        assertEquals("settlar", hit?.source)
        assertEquals(154587, hit?.anilistId)
        assertNull(aninzPickShow(payload, 99, "Naruto"))
    }

    @Test
    fun searchFallsBackToTheExactTitle() {
        val payload = """
            {"items":[
              {"id":1,"title":"Monster Musume","anilistId":21093},
              {"id":2,"title":"Monster","anilistId":19}
            ]}
        """.trimIndent()
        assertEquals("2", aninzPickShow(payload, 0, "Monster")?.id)
        assertEquals("settlar", aninzPickShow(payload, 0, "Monster")?.source)
    }

    @Test
    fun bootstrapKeepsSelectionSkipAndLanguage() {
        val payload = """
            {"effectiveLanguage":"sub","settlarSelection":"sel-1","skip":{"op":{"start":12,"end":90},"ed":{"start":1300,"end":1400}}}
        """.trimIndent()
        val boot = aninzBootstrap(payload, "sub")
        assertEquals("sel-1", boot?.selection)
        assertEquals(12.0, boot?.skip?.intro?.startSec ?: -1.0, 0.01)
        assertEquals(1300.0, boot?.skip?.outro?.startSec ?: -1.0, 0.01)
        assertNull(aninzBootstrap(payload, "dub"))
        assertNull(aninzBootstrap("""{"effectiveLanguage":"sub"}""", "sub"))
    }

    @Test
    fun bootstrapKeepsTheEpisodeRoute() {
        val payload = """
            {"effectiveLanguage":"dub","episode":1,"settlarSelection":"sel-route","episodeRouteId":"e1.route"}
        """.trimIndent()
        val boot = aninzBootstrap(payload, "dub")
        assertEquals(1, boot?.episode)
        assertEquals("e1.route", boot?.routeId)
    }

    @Test
    fun sessionTokenComesFromTheEmbedUrl() {
        val payload = """
            {"embedUrl":"https://embed.settlar.io/embed/v1?t=abc%2Bdef&x=1","provider":"anipm"}
        """.trimIndent()
        assertEquals("abc+def", aninzEmbedToken(payload))
        assertNull(aninzEmbedToken("""{"embedUrl":"https://embed.settlar.io/embed/v1"}"""))
        assertNull(aninzEmbedToken("""{"embedUrl":"https://third.example/embed/v1?t=abc"}"""))
    }

    @Test
    fun embedSessionBecomesAnHlsSource() {
        val session = """
            {"kind":"hls","source":"https://media.settlar.io/v1/object/master.m3u8","subtitles":[
              {"url":"https://media.settlar.io/en.vtt","label":"English","srclang":"en","default":true}
            ]}
        """.trimIndent()
        val pending = aninzPending(session)
        val playlist = """
            #EXTM3U
            #EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=1280x720
            https://media.example/720
            #EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1920x1080
            https://media.example/1080
        """.trimIndent()
        val skip = aninzBootstrap(
            """{"effectiveLanguage":"sub","settlarSelection":"s","skip":{"op":{"start":12,"end":90}}}""",
            "sub",
        )!!.skip
        val source = aninzPlayable(pending!!, playlist, skip, dub = false, userAgent = AniNzServer.USER_AGENT)
        assertEquals("https://media.settlar.io/v1/object/master.m3u8", source?.url)
        assertEquals("https://embed.settlar.io/", source?.headers?.get("Referer"))
        assertEquals(AniNzServer.EMBED_ORIGIN, source?.headers?.get("Origin"))
        assertEquals(AniNzServer.USER_AGENT, source?.headers?.get("User-Agent"))
        assertEquals(true, source?.hls)
        assertEquals("1080p", source?.quality)
        assertEquals("English", source?.subtitles?.single()?.label)
        assertEquals(12.0, source?.skip?.intro?.startSec ?: -1.0, 0.01)
        assertEquals("ja", source?.audioLanguage)
        assertNull(aninzPlayable(pending, "not a playlist", skip, dub = false, userAgent = "ua"))
        assertNull(aninzPending("""{"kind":"file","source":"https://media.settlar.io/a.mp4","subtitles":[]}"""))
        assertNull(aninzPending("""{"kind":"hls","source":"https://third.example/master.m3u8","subtitles":[]}"""))
        assertFalse(aninzOwnMedia("https://cdn.example/master.m3u8"))
        assertTrue(aninzOwnMedia("https://media.settlar.io/v1/object/master.m3u8"))
    }

    @Test
    fun challengePageIsBlocked() {
        assertTrue(aninzBlocked(403, "<html>Just a moment...</html>"))
        assertTrue(aninzBlocked(200, "<html>challenge-platform</html>"))
        assertFalse(aninzBlocked(200, """{"items":[]}"""))
        assertFalse(AniNzServer.MISSING.contains("404"))
        assertFalse(AniNzServer.BLOCKED.contains("403"))
    }
}
