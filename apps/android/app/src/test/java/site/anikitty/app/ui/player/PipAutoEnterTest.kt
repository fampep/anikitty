// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.player

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PipAutoEnterTest {
    @Test
    fun homeShrinksLocalPlaybackThatIsStillGoing() {
        assertTrue(
            shouldAutoEnterPip(
                localPlaying = true,
                playbackEnded = false,
                castBlocks = false,
            ),
        )
    }

    @Test
    fun pausedOrFinishedPlaybackStaysFullScreen() {
        assertFalse(shouldAutoEnterPip(localPlaying = false, playbackEnded = false, castBlocks = false))
        assertFalse(shouldAutoEnterPip(localPlaying = true, playbackEnded = true, castBlocks = false))
    }

    @Test
    fun chromecastAndALiveReceiverDoNotEnterPip() {
        assertTrue(castBlocksPictureInPicture(casting = true, castPending = false, handoffToCast = false))
        assertTrue(castBlocksPictureInPicture(casting = false, castPending = true, handoffToCast = false))
        assertTrue(castBlocksPictureInPicture(casting = false, castPending = false, handoffToCast = true))
        assertFalse(castBlocksPictureInPicture(casting = false, castPending = false, handoffToCast = false))
        assertFalse(
            shouldAutoEnterPip(
                localPlaying = true,
                playbackEnded = false,
                castBlocks = true,
            ),
        )
        assertFalse(
            shouldAutoEnterPip(
                localPlaying = true,
                playbackEnded = true,
                castBlocks = true,
            ),
        )
    }
}
