// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.player

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import site.anikitty.app.data.servers.ThumbnailTrack
import site.anikitty.app.data.servers.spriteTrack
import site.anikitty.app.data.servers.thumbnailUrlFromLooseText

class ThumbnailVttTest {
    @Test
    fun parsesSpriteCropsAndRelativeUrls() {
        val vtt = """
            WEBVTT

            00:00:00.000 --> 00:00:05.000
            https://cdn.example/sheet.jpg#xywh=0,0,160,90

            1
            00:05.000 --> 00:10.000
            sheet-2.jpg#xywh=160,0,160,90
        """.trimIndent()
        val cues = parseThumbnailVtt(vtt, "https://cdn.example/thumbs/story.vtt")
        assertEquals(2, cues.size)
        assertEquals(0L, cues[0].startMs)
        assertEquals(5_000L, cues[0].endMs)
        assertEquals("https://cdn.example/sheet.jpg", cues[0].spriteUrl)
        assertEquals(160, cues[0].w)
        assertEquals("https://cdn.example/thumbs/sheet-2.jpg", cues[1].spriteUrl)
        assertEquals(cues[1], cueAt(cues, 7_000L))
        assertEquals(cues[0], cueAt(cues, 0L))
    }

    @Test
    fun findsSpriteSheetsAndSkipsSubtitleFiles() {
        val html = """
            <div data-thumbnails="https://cdn.example/sprites.vtt"></div>
            <track src="https://cdn.example/english.vtt" kind="captions">
        """.trimIndent()
        assertEquals("https://cdn.example/sprites.vtt", thumbnailUrlFromLooseText(html))
        assertNull(thumbnailUrlFromLooseText("https://cdn.example/english.vtt"))
    }

    @Test
    fun keepsSignedQueryOnSpriteVttAndSkipsPosters() {
        val html = """
            <img data-thumbnail="https://cdn.example/thumb/poster.jpg">
            <div data-thumbnails="https://cdn.example/sprites.vtt?token=abc&exp=9"></div>
        """.trimIndent()
        assertEquals(
            "https://cdn.example/sprites.vtt?token=abc&exp=9",
            thumbnailUrlFromLooseText(html),
        )
        assertEquals(
            "https://cdn.example/storyboard.vtt?sig=xyz",
            thumbnailUrlFromLooseText("see https://cdn.example/storyboard.vtt?sig=xyz now"),
        )
        assertNull(thumbnailUrlFromLooseText("""data-thumbnail="https://cdn.example/episode-still.webp""""))
        assertNull(spriteTrack(ThumbnailTrack("https://cdn.example/thumb/poster.jpg")))
        assertEquals(
            "https://cdn.example/sprites.vtt?token=abc",
            spriteTrack(ThumbnailTrack("https://cdn.example/sprites.vtt?token=abc"))?.url,
        )
    }

    @Test
    fun relativeSpriteKeepsTheVttToken() {
        val vtt = """
            WEBVTT

            00:00:00.000 --> 00:00:05.000
            sheet.jpg?own=1#xywh=0,0,160,90

            00:00:05.000 --> 00:00:10.000
            sheet-2.jpg#xywh=160,0,160,90
        """.trimIndent()
        val cues = parseThumbnailVtt(vtt, "https://cdn.example/thumbs/story.vtt?token=abc")
        assertEquals("https://cdn.example/thumbs/sheet.jpg?own=1", cues[0].spriteUrl)
        assertEquals("https://cdn.example/thumbs/sheet-2.jpg?token=abc", cues[1].spriteUrl)
    }
}
