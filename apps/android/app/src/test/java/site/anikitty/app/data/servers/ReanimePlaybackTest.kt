// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import site.anikitty.app.data.friendlyFailure
import java.util.Base64

class ReanimePlaybackTest {
    @Test
    fun embedWasmDecryptsTheStreamUrl() {
        val url = FlixCrypto.decryptStreamUrl(
            wasm = Base64.getDecoder().decode(WASM),
            frag1 = Base64.getDecoder().decode(FRAG1),
            frag2 = Base64.getDecoder().decode(FRAG2),
            keyFrag = Base64.getDecoder().decode(KEY),
            seed = SEED,
            iv = Base64.getDecoder().decode(IV),
            ciphertext = Base64.getDecoder().decode(CIPHERTEXT),
        )
        assertTrue(url.startsWith("https://fetch9.flixcloud.cc/_v7/"))
        assertTrue(url.contains("master.m3u8?token="))
        val key = FlixCrypto.playlistKey(Base64.getDecoder().decode(WASM))
        assertEquals(PLAYBACK_KEY, Base64.getEncoder().encodeToString(key))
    }

    @Test
    fun playlistXorRestoresTheHlsHeader() {
        val key = Base64.getDecoder().decode(PLAYBACK_KEY)
        val clear = FlixCrypto.decryptPlaylist("jfuZTn5djvmUkucpoX6uaBAWDX3zCryCWw==", key)
        assertEquals("#EXTM3U\n#EXT-X-VERSION:3\n", clear)
    }

    @Test
    fun englishAudioBecomesTheDefaultRendition() {
        val master = """
            #EXTM3U
            #EXT-X-MEDIA:TYPE=AUDIO,LANGUAGE="jpn",NAME="Native",DEFAULT=YES,URI="a.m3u8"
            #EXT-X-MEDIA:TYPE=AUDIO,LANGUAGE="eng",NAME="English",DEFAULT=NO,URI="b.m3u8"
        """.trimIndent()
        val dub = FlixCrypto.preferAudio(master, english = true)
        assertTrue(dub.contains("LANGUAGE=\"eng\",NAME=\"English\",DEFAULT=YES"))
        assertTrue(dub.contains("LANGUAGE=\"jpn\",NAME=\"Native\",DEFAULT=NO"))
        val sub = FlixCrypto.preferAudio(master, english = false)
        assertTrue(sub.contains("DEFAULT=YES"))
        assertTrue(sub.contains("LANGUAGE=\"jpn\",NAME=\"Native\",DEFAULT=YES"))
    }

    @Test
    fun webpDisguiseIsStrippedAndUnmasked() {
        val mask = FlixCrypto.fallbackSegmentMask
        val payload = byteArrayOf(0, 1, 2, 3, 4)
        val wrapped = ByteArray(12 + payload.size)
        "RIFF".toByteArray().copyInto(wrapped)
        "WEBP".toByteArray().copyInto(wrapped, 8)
        for (i in payload.indices) wrapped[12 + i] = (payload[i].toInt() xor mask[i].toInt()).toByte()
        val plain = FlixCrypto.unwrapSegment(wrapped, mask)
        assertTrue(payload.contentEquals(plain))
        wrapped[12] = 'G'.code.toByte()
        val marked = FlixCrypto.unwrapSegment(wrapped, mask)
        assertEquals('G'.code.toByte(), marked[0])
    }

    @Test
    fun hd2ComesBeforeHd1AndHardsubDropsWhenBothExist() {
        val servers = listOf(
            FlixCrypto.ServerLink("HD-1", "https://cdn/e/1?v=1", "sub", false),
            FlixCrypto.ServerLink("H-SUB", "https://cdn/e/1?v=3", "sub", true),
            FlixCrypto.ServerLink("HD-2", "https://cdn/e/1?v=2", "sub", false),
            FlixCrypto.ServerLink("HD-2", "https://cdn/e/1?v=2", "dub", false),
        )
        val sub = FlixCrypto.pickServers(servers, "sub")
        assertEquals(listOf("HD-2", "HD-1"), sub.map { it.name })
        val dub = FlixCrypto.pickServers(servers, "dub")
        assertEquals(listOf("HD-2"), dub.map { it.name })
    }

    @Test
    fun savedAnipmSelectionBecomesReanime() {
        assertEquals("reanime", FlixCrypto.migrateServerId("anipm"))
        assertEquals("anikoto", FlixCrypto.migrateServerId("anikoto"))
        assertEquals(null, FlixCrypto.migrateServerId(null))
    }

    @Test
    fun blockedCopyDoesNotExposeAStatusCode() {
        assertEquals(ReanimeServer.BLOCKED, reanimeHttpFailure(403, "<html>Just a moment...</html>"))
        assertEquals(ReanimeServer.MISSING, reanimeHttpFailure(404, ""))
        assertFalse(ReanimeServer.BLOCKED.contains("403"))
        assertEquals(
            ReanimeServer.BLOCKED,
            friendlyFailure("Response code: 403"),
        )
        val joined = "All installed providers failed — reanime: ${ReanimeServer.BLOCKED}"
        assertEquals(joined, friendlyFailure(joined))
    }

    @Test
    fun coverIdDoesNotMatchALongerNumber() {
        val cover = "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx195604-abc.jpg"
        assertTrue(reanimeCoverListsAnilist(cover, 195604))
        assertFalse(reanimeCoverListsAnilist(cover, 19560))
        assertFalse(reanimeCoverListsAnilist(cover, 1956041))
        assertFalse(reanimeCoverListsAnilist(cover, 0))
        assertFalse(reanimeCoverListsAnilist("bx12", 1))
    }

    @Test
    fun headersPointAtTheEmbedAndNotAtTheOldSource() {
        val headers = ReanimeServer.playbackHeaders()
        assertEquals("https://flixcloud.cc/", headers.getValue("Referer"))
        assertEquals("https://flixcloud.cc", headers.getValue("Origin"))
        assertTrue(headers.getValue("User-Agent").contains("Chrome/131"))
        assertFalse(headers.values.any { it.contains("ani.pm") })
    }

    @Test
    fun highSeedsWrapInsteadOfThrowing() {
        assertEquals(0x677d056a, FlixCrypto.seedWord("677d056af8b0bc1d"))
        assertEquals(0xc0495064L.toInt(), FlixCrypto.seedWord("c0495064ffffeeee"))
    }

    @Test
    fun encryptionKeyMovesBesideTheSegments() {
        val playlist = """
            #EXTM3U
            #EXT-X-KEY:METHOD=AES-128,URI="key.bin",IV=0xeb8bf3e3f797660ce19247e9a56879f8
            #EXTINF:6.0,
            https://vault-93.blazecdn.top/_v8/title/seg-0.png
        """.trimIndent()
        val fixed = FlixCrypto.placeEncryptionKey(playlist)
        assertTrue(fixed.contains("URI=\"https://vault-93.blazecdn.top/_v8/title/key.bin\""))
        assertFalse(fixed.contains("URI=\"key.bin\""))
    }

    @Test
    fun assDialogueBecomesWebVtt() {
        val ass = """
            [Script Info]
            Dialogue: 0,0:00:01.50,0:00:03.20,Default,,0,0,0,,Hello {\i1}there
        """.trimIndent()
        val vtt = FlixCrypto.assToVtt(ass)
        assertTrue(vtt.startsWith("WEBVTT"))
        assertTrue(vtt.contains("00:00:01.500 --> 00:00:03.200"))
        assertTrue(vtt.contains("Hello there"))
    }

    @Test
    fun titleHintDropsTheMalSuffix() {
        assertEquals("Black Clover", FlixCrypto.cleanTitle("Black Clover || mal:34572"))
        assertEquals("pj578y", FlixCrypto.shortId("black-clover-season-2-pj578y"))
    }

    private companion object {
        const val SEED = "677d056af8b0bc1d"
        const val PLAYBACK_KEY = "rr7BGjNu2/O31799jCaDPlVEXjS8RIaxUQXCdjvPmSw="
        const val WASM =
            "AGFzbQEAAAABEQNgAX8AYAV/f39/fwBgAAF/AwQDAAECBQMBAAEGBgF/AUEACwcZBAZtZW1vcnkCAAJfcwAAAl9yAAECX2MAAgrLAQMGACAAJAALgwEBA39BACEFA0ACQCAFIARPDQAgACAFai0AACABIAVqLQAAcyACIAVqLQAAcyEGIAZBAHYgBkEIdEH/AXFyIQYgBkEFdEH/AXEgBkEDdnIhBiAGQRNzIQYgBUHgAGwjAGpB/wFxIQcgBiAHcyEGIAMgBWogBjoAACAFQQFqIQUMAQsLCz0BAX9BACEAA0ACQCAAQSBPDQBBkBAgAGpB0A8gAGotAABB8A8gAGotAABzOgAAIABBAWohAAwBCwtBkBALC0cBAEHQDwtA6clY0Q6KeNdxLpcLJw/9roouL13WGt02Gjb6oejZSNtHd5nLPeSjJMb5KHarKX6Q32pxaWpeW4dLMzjX0xbR9w=="
        const val FRAG1 = "vmP+iyWD12q9X6C3xff4OrMdaPCnBFGdnCkTaZZSIdI="
        const val FRAG2 = "E9pxhewXKL5brWRLcFIwb3wLmC9bwJcw9t+vNPvH3Kk="
        const val KEY = "0MifRh3ODblamasVCcjolVrhI3NqJQU5LxmGj2YgvQ8="
        const val IV = "ROrpCAoMHFmQeCBS5ZUtUw=="
        const val CIPHERTEXT =
            "PFkFLptoYAuhxkVvzZ6IPD/saU7m3JowNxMNIiMf/UUS+lDUkqayOJl/SbalcMHWuMX+7vBGgivvCZZ32XyzCmz99UEbvtwJVEm+DBE/kv3qghZiZVhBhYd2uq9pX6sDePEMyqTMKmtJzrUfrEhs/mA7fwmizQvFa3rJVOUf/17hwDxF/t2CtexvtRNy2ZNuivfCF5pkaZVxP6PqeEnttoDBXrIQcod7j6edxSQ4z0dOQyRUWF+x/EG6jU4/BlSA04LQW6rERv3t52WfxnftH5XeahIWpGIBUKJnI1FRCCdb7NSEw7o6fElOIlK44AlbCf9/tRfO1de3kJIovJp91XpJUEuw0hcB5HqrqxAmgA5NKsyf7DmdaOKrOjDsJmXXu6WhiFtQu/9b8HL56wfG+ajd4tFfLrIeyOcxhNyMzKwOy1Xs9ZNJ6JhF+z0iA7RDPl9zl3QRjqCKfVuKULzMWnENFkagWfMmQCN+lSJF4Qc="
    }
}
