// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.player

import org.junit.Assert.assertEquals
import org.junit.Test

class PlayerTalkBackTest {
    @Test
    fun downloadActionsNameTheEpisode() {
        assertEquals("Download this episode", downloadActionDescription("Download"))
        assertEquals("Download queued", downloadActionDescription("Queued"))
        assertEquals("Saving this episode", downloadActionDescription("Saving…"))
        assertEquals("Saving this episode, 40 percent", downloadActionDescription("Saving 40%"))
        assertEquals("Saved on this device", downloadActionDescription("Saved"))
        assertEquals("Retry download", downloadActionDescription("Retry download"))
        assertEquals(
            "Retry download. The source refused the download",
            downloadActionDescription("Retry · The source refused the download"),
        )
        assertEquals("Can't save this source", downloadActionDescription("Can't save this source"))
        assertEquals("Remove downloaded episode", removeDownloadDescription())
        assertEquals("Cancel download", removeDownloadDescription("Cancel"))
        assertEquals("Clear failed download", removeDownloadDescription("Clear"))
    }

    @Test
    fun skipAndCastNameTheAction() {
        assertEquals("Skip intro", skipActionDescription("intro"))
        assertEquals("Skip outro", skipActionDescription("credits"))
        assertEquals("Skip recap", skipActionDescription("recap"))
        assertEquals("Skip preview", skipActionDescription("preview"))
        assertEquals("Skip", skipActionDescription("other"))
        assertEquals("Cast", castButtonDescription(null))
        assertEquals("Cast", castButtonDescription("  "))
        assertEquals(
            "Cast unavailable. Play services are missing",
            castButtonDescription("Play services are missing"),
        )
        assertEquals(
            "Casting to your TV. Episode 4, Title",
            castStatusDescription(buffering = false, isMovie = false, episode = 4, title = "Title"),
        )
        assertEquals(
            "Buffering on your TV. A movie",
            castStatusDescription(buffering = true, isMovie = true, episode = 1, title = "A movie"),
        )
        assertEquals(
            "Connecting to your TV. Episode 4, Title",
            castStatusDescription(
                buffering = false,
                isMovie = false,
                episode = 4,
                title = "Title",
                connecting = true,
            ),
        )
    }

    @Test
    fun chromeStatesStayInTheLabel() {
        assertEquals("Speed, 1×", playerToolDescription("Speed", "1×", enabled = true, selected = false))
        assertEquals(
            "Quality, 1080p, selected",
            playerToolDescription("Quality", "1080p", enabled = true, selected = true),
        )
        assertEquals("Next, unavailable", playerToolDescription("Next", "—", enabled = false, selected = false))
        assertEquals("Episode 3", episodeCellDescription(3, selected = false, watched = false))
        assertEquals("Episode 3, playing", episodeCellDescription(3, selected = true, watched = false))
        assertEquals("Episode 2, watched", episodeCellDescription(2, selected = false, watched = true))
        assertEquals("Subtitles", menuRowDescription("Subtitles", "", selected = false))
        assertEquals("Quality, 720p, selected", menuRowDescription("Quality", "720p", selected = true))
        assertEquals("Subtitled, selected", audioChoiceDescription("Subtitled", selected = true))
        assertEquals("Autoplay next episode, off", autoplayDescription(false))
    }

    @Test
    fun timeLabelsAreSpoken() {
        assertEquals("Back 10 seconds", seekFlashDescription(-10_000))
        assertEquals("Forward 1 second", seekFlashDescription(400))
        assertEquals(
            "Elapsed 1 hour 2 minutes 3 seconds, 4 minutes 5 seconds remaining",
            playbackClockDescription(3_723_000, 3_968_000),
        )
        assertEquals("Seek", seekBarDescription(0.4f, 0L))
        assertEquals(
            "Seek, 30 seconds of 1 minute",
            seekBarDescription(0.5f, 60_000),
        )
    }
}
