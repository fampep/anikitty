// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class AnikotoSourceMetaTest {
    @Test
    fun resolutionAndDubFromProviderLabel() {
        val fields = BuiltInSourceMeta.anikoto("MegaPlay · 1080p", "dub")
        assertEquals("1080p", fields.quality)
        assertEquals("DUB", fields.audio)
        assertNull(fields.qualityRating)
    }

    @Test
    fun gradeWordWithoutInventingResolution() {
        val fields = BuiltInSourceMeta.anikoto("Vidstream · HD", "sub")
        assertNull(fields.quality)
        assertEquals("SUB", fields.audio)
        assertEquals("HD", fields.qualityRating)
    }

    @Test
    fun unknownLabelKeepsAudioModeOnly() {
        val fields = BuiltInSourceMeta.anikoto("Stream", "sub")
        assertNull(fields.quality)
        assertNull(fields.qualityRating)
        assertEquals("SUB", fields.audio)
    }
}

class ReanimeSourceMetaTest {
    @Test
    fun playlistResolutionCodecAndChannels() {
        val inf = "#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1920x1080," +
            "CODECS=\"avc1.640028,mp4a.40.2\",AUDIO=\"aac\""
        val media = "#EXT-X-MEDIA:TYPE=AUDIO,CHANNELS=\"2\",URI=\"audio.m3u8\""
        val fields = BuiltInSourceMeta.reanime(inf, "sub", media)
        assertEquals("1080p", fields.quality)
        assertEquals("AAC · 2.0 · SUB", fields.audio)
        assertNull(fields.qualityRating)
    }

    @Test
    fun surroundAc3OnADubVariant() {
        val inf = "#EXT-X-STREAM-INF:RESOLUTION=1280x720,CODECS=\"avc1.4d401f,ac-3\",CHANNELS=6"
        val fields = BuiltInSourceMeta.reanime(inf, "dub")
        assertEquals("720p", fields.quality)
        assertEquals("AC3 · 5.1 · DUB", fields.audio)
    }

    @Test
    fun masterRowHasModeOnly() {
        val fields = BuiltInSourceMeta.reanime("", "sub")
        assertNull(fields.quality)
        assertEquals("SUB", fields.audio)
        assertNull(fields.qualityRating)
    }
}

class GotakuSourceMetaTest {
    @Test
    fun fourKAndOpusWithoutAGrade() {
        val inf = "#EXT-X-STREAM-INF:BANDWIDTH=8000000,RESOLUTION=3840x2160,CODECS=\"avc1.640033,opus\""
        val fields = BuiltInSourceMeta.gotaku(inf, "sub")
        assertEquals("4K", fields.quality)
        assertEquals("Opus · SUB", fields.audio)
        assertNull(fields.qualityRating)
    }

    @Test
    fun missingPlaylistOmitsQuality() {
        val fields = BuiltInSourceMeta.gotaku("", "dub")
        assertNull(fields.quality)
        assertEquals("DUB", fields.audio)
    }
}

class ExtensionSourceMetaTest {
    @Test
    fun copiesOptionalFieldsAndDropsBlanks() {
        val fields = BuiltInSourceMeta.fromExtension("1080p", "  ", "FHD")
        assertEquals("1080p", fields.quality)
        assertNull(fields.audio)
        assertEquals("FHD", fields.qualityRating)
    }

    @Test
    fun omittedFieldsStayNull() {
        val fields = BuiltInSourceMeta.fromExtension(null, null, null)
        assertNull(fields.quality)
        assertNull(fields.audio)
        assertNull(fields.qualityRating)
    }
}
