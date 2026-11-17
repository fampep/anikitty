// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import org.junit.Assert.assertEquals
import org.junit.Test

class PlaybackAudioTest {
    @Test
    fun subAndDubStampALanguageWhenTheSourceDidNot() {
        val source = PlayableSource(url = "https://hls.example/master.m3u8", hls = true)
        assertEquals("en", playbackAudioLanguage(listOf(source), "dub").single().audioLanguage)
        assertEquals("ja", playbackAudioLanguage(listOf(source), "SUB").single().audioLanguage)
        assertEquals(source.url, playbackAudioLanguage(listOf(source), "dub").single().url)
    }

    @Test
    fun anExplicitLanguageStays() {
        val source = PlayableSource(
            url = "https://hls.example/master.m3u8",
            audioLanguage = "es",
        )
        assertEquals("es", playbackAudioLanguage(listOf(source), "dub").single().audioLanguage)
    }
}
