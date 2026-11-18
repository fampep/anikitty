// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AnimePahePlaybackTest {
    @Test
    fun searchKeepsTheExactTvTitle() {
        val payload = """
            {"data":[
              {"title":"Frieren","type":"Movie","session":"movie","episodes":1},
              {"title":"Frieren: Beyond Journey's End","type":"TV","session":"show","episodes":28},
              {"title":"Something Else","type":"TV","session":"other","episodes":12}
            ]}
        """.trimIndent()
        val hit = animepahePickShow(payload, "Frieren: Beyond Journey's End || mal:52991")
        assertEquals("show", hit?.session)
        assertNull(animepahePickShow(payload, "Naruto"))
    }

    @Test
    fun releaseKeepsTheRequestedEpisode() {
        val payload = """
            {"last_page":2,"per_page":30,"data":[
              {"episode":1,"session":"ep-1"},
              {"episode":"2","session":"ep-2"}
            ]}
        """.trimIndent()
        assertEquals("ep-2", animepaheEpisodeSession(payload, 2))
        assertNull(animepaheEpisodeSession(payload, 9))
        assertEquals(2, animepaheLastPage(payload))
        assertEquals(30, animepahePerPage(payload))
    }

    @Test
    fun playPagePicksJapanese1080OverAv1AndEnglish() {
        val html = """
            <div id="resolutionMenu">
              <button data-src="//kwik.cx/e/low" data-resolution="720" data-audio="jpn" data-av1="0"></button>
              <button data-src="https://kwik.cx/e/av1" data-resolution="1080" data-audio="jpn" data-av1="1"></button>
              <button data-src="https://kwik.cx/e/best&amp;x=1" data-resolution="1080" data-audio="jpn" data-av1="0"></button>
              <button data-src="https://kwik.cx/e/dub" data-resolution="1080" data-audio="eng" data-av1="0"></button>
            </div>
        """.trimIndent()
        val links = animepaheLinks(html)
        assertEquals(4, links.size)
        val sub = animepahePickLink(links, dub = false)
        assertEquals("https://kwik.cx/e/best&x=1", sub?.url)
        assertEquals(1080, sub?.resolution)
        assertFalse(sub!!.av1)
        assertEquals("https://kwik.cx/e/dub", animepahePickLink(links, dub = true)?.url)
        assertNull(animepahePickLink(links.filter { it.audio == "jpn" }, dub = true))
    }

    @Test
    fun packedScriptNamesThePlaylist() {
        val html = """
            <script>eval(function(p,a,c,k,e,d){while(c--)if(k[c])p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c]);return p}('const 0=\'a\';',36,11,'source||||||||||https://cdn.example/hls/master.m3u8'.split('|'),0,{}))</script>
        """.trimIndent()
        assertEquals("a", packerEncode(10, 36))
        assertEquals(
            "https://cdn.example/hls/master.m3u8",
            animepaheUnpackMedia(html),
        )
    }

    @Test
    fun formKeepsTheTokenWhenThereIsNoPlaylist() {
        val html = """
            <form method="POST" action="https://kwik.cx/d/file">
              <input type="hidden" name="_token" value="tok en">
            </form>
        """.trimIndent()
        val form = animepaheKwikForm(html)
        assertEquals("https://kwik.cx/d/file", form?.action)
        assertEquals("tok en", form?.token)
        assertNull(animepaheUnpackMedia(html))
    }

    @Test
    fun playlistQualityAndAudioComeFromTheMaster() {
        val playlist = """
            #EXTM3U
            #EXT-X-STREAM-INF:BANDWIDTH=1000,RESOLUTION=1280x720,CODECS="avc1.42c00d,mp4a.40.2"
            low.m3u8
            #EXT-X-STREAM-INF:BANDWIDTH=4000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"
            high.m3u8
        """.trimIndent()
        val source = animepahePlayable(
            mediaUrl = "https://cdn.example/hls/master.m3u8",
            playlist = playlist,
            resolution = 720,
            dub = false,
            refererOrigin = "https://kwik.cx",
            userAgent = AnimePaheServer.USER_AGENT,
        )
        assertEquals("https://cdn.example/hls/master.m3u8", source?.url)
        assertEquals("1080p", source?.quality)
        assertEquals("ja", source?.audioLanguage)
        assertEquals("https://kwik.cx/", source?.headers?.get("Referer"))
        assertTrue(source!!.hls)
        assertTrue(source.audio!!.contains("SUB"))

        val file = animepahePlayable(
            mediaUrl = "https://cdn.example/file.mp4",
            playlist = "",
            resolution = 720,
            dub = true,
            refererOrigin = "https://kwik.si/",
            userAgent = "ua",
        )
        assertEquals("720p", file?.quality)
        assertEquals("en", file?.audioLanguage)
        assertEquals("https://kwik.si/", file?.headers?.get("Referer"))
        assertFalse(file!!.hls)
        assertNull(
            animepahePlayable(
                mediaUrl = "https://cdn.example/not-media",
                playlist = "",
                resolution = 1080,
                dub = false,
                refererOrigin = "https://kwik.cx",
                userAgent = "ua",
            ),
        )
    }

    @Test
    fun cloudflarePageIsBlocked() {
        assertTrue(animepaheBlocked(403, "<html>Attention Required</html>"))
        assertTrue(animepaheBlocked(200, "<html>Just a moment...</html>"))
        assertFalse(animepaheBlocked(200, """{"data":[]}"""))
    }
}
