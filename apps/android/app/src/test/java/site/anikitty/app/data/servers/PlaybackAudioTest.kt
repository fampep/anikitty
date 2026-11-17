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
    fun switchLabelShowsUntilTheLoadedLanguageMatches() {
        assertEquals("Switching to Dub", audioSwitchLabel("dub", "ja"))
        assertEquals("Switching to Sub", audioSwitchLabel("sub", "en"))
        assertEquals(null, audioSwitchLabel("dub", "en"))
        assertEquals(null, audioSwitchLabel("sub", null))
    }

    @Test
    fun aSupersededOrCancelledSwitchDoesNotSaveTheLanguageItLeft() {
        assertEquals(
            "dub",
            audioToPersist(
                request = 2,
                latest = 2,
                cancelled = false,
                failed = false,
                requested = "dub",
                committed = "sub",
            ),
        )
        assertEquals(
            "sub",
            audioToPersist(
                request = 2,
                latest = 2,
                cancelled = false,
                failed = true,
                requested = "dub",
                committed = "sub",
            ),
        )
        assertEquals(
            null,
            audioToPersist(
                request = 2,
                latest = 2,
                cancelled = true,
                failed = true,
                requested = "dub",
                committed = "sub",
            ),
        )
        assertEquals(
            null,
            audioToPersist(
                request = 1,
                latest = 2,
                cancelled = false,
                failed = true,
                requested = "sub",
                committed = "dub",
            ),
        )
        assertEquals(
            null,
            audioToPersist(
                request = 1,
                latest = 2,
                cancelled = true,
                failed = true,
                requested = "dub",
                committed = "sub",
            ),
        )
        assertEquals(
            null,
            audioToPersist(
                request = 2,
                latest = 2,
                cancelled = false,
                dismissed = true,
                failed = false,
                requested = "dub",
                committed = "sub",
            ),
        )
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
