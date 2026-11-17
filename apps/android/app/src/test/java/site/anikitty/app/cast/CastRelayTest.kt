// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.cast

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CastRelayTest {
    @Test
    fun corsAllowsPrivateAndLocalNetwork() {
        val lines = castRelayCorsLines()
        assertTrue(lines.any { it == "Access-Control-Allow-Private-Network: true" })
        assertTrue(lines.any { it == "Access-Control-Allow-Local-Network: true" })
        assertTrue(lines.any { it.startsWith("Access-Control-Allow-Origin:") })
    }

    @Test
    fun animexTxtVariantsStayPlaylists() {
        val variant = "https://s-91.megavid.se/i/abc/s/1080p/nut-1.txt"
        val master = "https://s-91.megavid.se/i/abc/s/deeznuts.txt"
        val segment = "https://s-91.megavid.se/i/abc/s/c/frame.jpg"
        assertTrue(castRelayPlaylistUrl(master))
        assertTrue(castRelayPlaylistUrl(variant))
        assertTrue(castRelayLooksLikePlaylist(variant, emptyMap()))
        assertTrue(!castRelayPlaylistUrl(segment))
        assertTrue(
            castRelayLooksLikePlaylist(
                segment,
                mapOf("content-type" to listOf("application/vnd.apple.mpegurl")),
            ),
        )
    }

    @Test
    fun segmentFormatIsOmittedUnlessThePlaylistProvesIt() {
        assertEquals("fmp4", certainHlsPack("#EXTM3U\n#EXT-X-MAP:URI=\"init.mp4\"\nseg.m4s\n"))
        assertEquals("ts", certainHlsPack("#EXTM3U\n#EXTINF:6,\nseg-1.ts\n"))
        assertNull(certainHlsPack("#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\nvideo.m3u8\n"))
    }
}
