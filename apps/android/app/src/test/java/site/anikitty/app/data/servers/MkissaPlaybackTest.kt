// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MkissaPlaybackTest {
    @Test
    fun maskAndBootTokenMatchTheSiteBuild() {
        val mask = MkissaCrypto.maskKey()
        assertEquals(
            "5f231750f7bfb2cd7a360a0c017515f52098d2c96e66a9226d6e7af80b070ae6",
            mask.joinToString("") { "%02x".format(it) },
        )
        assertEquals(
            "f872bcf637f7f2726d3f5c4e32df73f24363073ed9542948bd9232841440590f",
            MkissaCrypto.bootToken(epoch = 2967, host = "mkissa.to", group = "mkissa"),
        )
        val aes = MkissaCrypto.aesKey("lLyW/c50y4ilsVMvZK2R1Bx31EDqEgg9Mhb45hjSG8c=")
        assertEquals(
            "cb9f81ad39cb7945df87592365d884213cef06898474a11f5f78821e13d51121",
            aes.joinToString("") { "%02x".format(it) },
        )
    }

    @Test
    fun sealedQueryRoundTrips() {
        val key = MkissaCrypto.maskKey()
        val hash = MkissaCrypto.sha256Hex(MkissaServer.EPISODE_QUERY)
        val packed = MkissaCrypto.seal(key, hash, epoch = 2967, timestampMs = 1_794_753_000_000)
        val opened = MkissaCrypto.open(key, packed)
        assertEquals(
            MkissaCrypto.payload(hash, 2967, 1_794_753_000_000, MkissaCrypto.LANE, MkissaCrypto.BUILD_ID),
            opened,
        )
    }

    @Test
    fun searchKeepsTheShowThatListsTheEpisode() {
        val payload = """
            {"data":{"shows":{"edges":[
              {"_id":"movie","aniListId":"131680","availableEpisodesDetail":{"sub":["1"]}},
              {"_id":"season","aniListId":"195604","availableEpisodesDetail":{"sub":["2","1"],"dub":["1"]}},
              {"_id":"other","aniListId":"1","availableEpisodesDetail":{"sub":["1"]}}
            ]}}}
        """.trimIndent()
        val hit = mkissaPickShow(payload, anilistId = 195604, episode = 2, mode = "sub")
        assertEquals("season", hit?.id)
        assertEquals("2", hit?.episodeString)
        assertNull(mkissaPickShow(payload, anilistId = 999, episode = 1, mode = "sub"))
    }

    @Test
    fun directFileWinsOverIframesAndUsesTheStatedHeight() {
        val episode = JSONObject(
            """
            {
              "sourceUrls": [
                {"sourceUrl":"https://ok.ru/videoembed/1","priority":3.5,"sourceName":"Ok","type":"iframe"},
                {"sourceUrl":"https://mp4upload.com/embed-abc.html","priority":4,"type":"iframe","fileExtenstion":"mp4"},
                {"sourceUrl":"https://cdn.example/show/sub/1?Authorization=abc","priority":6,"sourceName":"Yt-mp4","type":"player","fallBack":"mp4","fileExtenstion":"mp4"},
                {"sourceUrl":"https://cdn.example/low.mp4","priority":1,"type":"player","fileExtenstion":"mp4"}
              ],
              "episodeInfo": {"vidInforssub":{"vidResolution":1080},"vidInforsdub":{"vidResolution":720}}
            }
            """.trimIndent(),
        )
        val source = mkissaDirectSource(episode, "sub")
        assertEquals("https://cdn.example/show/sub/1?Authorization=abc", source?.url)
        assertEquals("1080p", source?.quality)
        assertEquals("SUB", source?.audio)
        assertEquals("1080p", source?.label)
        assertEquals(0, source?.stripBytes)
        assertEquals("https://mkissa.to/", source?.headers?.get("Referer"))
        assertTrue(source?.subtitles?.isEmpty() == true)
        assertNull(source?.thumbnails)
        assertFalse(MkissaServer.MISSING.contains("404"))
        assertFalse(MkissaServer.BLOCKED.contains("403"))

        val dub = mkissaDirectSource(episode, "dub")
        assertEquals("720p", dub?.quality)
        assertEquals("DUB", dub?.audio)
    }

    @Test
    fun missingHeightStaysBlank() {
        val fields = BuiltInSourceMeta.mkissa(videoHeight = null, audioMode = "sub")
        assertNull(fields.quality)
        assertEquals("SUB", fields.audio)
        assertNull(BuiltInSourceMeta.mkissa(200, "raw").quality)
        assertEquals("RAW", BuiltInSourceMeta.mkissa(200, "raw").audio)
    }
}
