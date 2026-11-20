// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.cast

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CastAttachTest {
    @Test
    fun staysIdleWhenNoSession() {
        val decision = reduceCastAttach(
            pending = false,
            loadStarted = false,
            sessionUp = false,
            hasSource = true,
        )
        assertFalse(decision.pending)
        assertFalse(decision.loadStarted)
        assertFalse(decision.load)
    }

    @Test
    fun remembersASessionThatArrivesBeforeTheStream() {
        val waiting = reduceCastAttach(
            pending = false,
            loadStarted = false,
            sessionUp = true,
            hasSource = false,
        )
        assertTrue(waiting.pending)
        assertFalse(waiting.load)

        val ready = reduceCastAttach(
            pending = waiting.pending,
            loadStarted = waiting.loadStarted,
            sessionUp = true,
            hasSource = true,
        )
        assertTrue(ready.load)
        assertTrue(ready.loadStarted)
        assertFalse(ready.pending)
    }

    @Test
    fun loadsImmediatelyWhenTheSessionAndStreamAreBothReady() {
        val decision = reduceCastAttach(
            pending = false,
            loadStarted = false,
            sessionUp = true,
            hasSource = true,
        )
        assertTrue(decision.load)
        assertEquals(false, decision.pending)
    }

    @Test
    fun doesNotLoadAgainAfterTheAttachStarted() {
        val again = reduceCastAttach(
            pending = false,
            loadStarted = true,
            sessionUp = true,
            hasSource = true,
        )
        assertFalse(again.load)
        assertTrue(again.loadStarted)
    }

    @Test
    fun aDroppedSessionCanAttachAgainLater() {
        val dropped = reduceCastAttach(
            pending = true,
            loadStarted = true,
            sessionUp = false,
            hasSource = true,
        )
        assertFalse(dropped.pending)
        assertFalse(dropped.loadStarted)

        val again = reduceCastAttach(
            pending = dropped.pending,
            loadStarted = dropped.loadStarted,
            sessionUp = true,
            hasSource = true,
        )
        assertTrue(again.load)
    }

    @Test
    fun aConnectingSessionWaitsForTheReceiverClient() {
        val waiting = reduceCastAttach(
            pending = false,
            loadStarted = true,
            sessionUp = false,
            hasSource = true,
            sessionConnecting = true,
        )
        assertTrue(waiting.pending)
        assertFalse(waiting.load)
        assertFalse(waiting.loadStarted)
    }

    @Test
    fun aSourceChangeReloadsWhileTheFirstLoadIsInFlight() {
        val again = reduceCastAttach(
            pending = false,
            loadStarted = true,
            sessionUp = true,
            hasSource = true,
            sourceChanged = true,
        )
        assertTrue(again.load)
        assertTrue(again.loadStarted)
        assertFalse(again.pending)
    }

    @Test
    fun savedResumeBeatsALocalPlayerThatHasNotStarted() {
        assertEquals(
            90_000L,
            castAttachPositionMs(
                localPositionMs = 0L,
                resumeAtMs = 0L,
                startPositionMs = 90_000L,
                allowHistoryFallback = true,
            ),
        )
        assertEquals(
            40_000L,
            castAttachPositionMs(
                localPositionMs = 500L,
                resumeAtMs = 40_000L,
                startPositionMs = 0L,
                allowHistoryFallback = true,
            ),
        )
    }

    @Test
    fun aLivePlayheadBeatsAnOlderSavedResume() {
        assertEquals(
            30_000L,
            castAttachPositionMs(
                localPositionMs = 30_000L,
                resumeAtMs = 90_000L,
                startPositionMs = 90_000L,
                allowHistoryFallback = true,
            ),
        )
    }

    @Test
    fun pendingResumeBeatsPlaybackThatRanFromTheStart() {
        assertEquals(
            90_000L,
            castAttachPositionMs(
                localPositionMs = 5_000L,
                resumeAtMs = 0L,
                startPositionMs = 90_000L,
                allowHistoryFallback = true,
                pendingResume = true,
            ),
        )
    }

    @Test
    fun historyIsIgnoredAfterThePersonMovedOn() {
        assertEquals(
            0L,
            castAttachPositionMs(
                localPositionMs = 0L,
                resumeAtMs = 0L,
                startPositionMs = 90_000L,
                allowHistoryFallback = false,
            ),
        )
    }

    @Test
    fun connectedWithoutAClientIsStillConnecting() {
        assertEquals(
            CastSessionReadiness.Connecting,
            castSessionReadiness(
                connected = true,
                hasRemoteClient = false,
                playerSessionAvailable = false,
            ),
        )
    }

    @Test
    fun aRemoteClientIsReady() {
        assertEquals(
            CastSessionReadiness.Ready,
            castSessionReadiness(
                connected = true,
                hasRemoteClient = true,
                playerSessionAvailable = false,
            ),
        )
    }

    @Test
    fun castPlayerWithoutAClientIsStillConnecting() {
        assertEquals(
            CastSessionReadiness.Connecting,
            castSessionReadiness(
                connected = false,
                hasRemoteClient = false,
                playerSessionAvailable = true,
            ),
        )
    }

    @Test
    fun aLaterSessionSignalClearsGiveUpBeforeTheClientExists() {
        val reset = reduceCastGiveUp(
            gaveUp = true,
            retry = 3,
            pending = false,
            availabilitySignaled = true,
            clientReady = false,
        )
        assertFalse(reset.gaveUp)
        assertEquals(0, reset.retry)
        assertTrue(reset.pending)
        assertFalse(reset.load)
    }

    @Test
    fun aReadyClientAfterGiveUpLoadsOnce() {
        val reset = reduceCastGiveUp(
            gaveUp = true,
            retry = 3,
            pending = false,
            availabilitySignaled = true,
            clientReady = true,
        )
        assertFalse(reset.gaveUp)
        assertTrue(reset.load)
        assertFalse(reset.pending)
    }

    @Test
    fun giveUpStaysUntilANewSessionSignal() {
        val reset = reduceCastGiveUp(
            gaveUp = true,
            retry = 3,
            pending = false,
            availabilitySignaled = false,
            clientReady = false,
        )
        assertTrue(reset.gaveUp)
        assertFalse(reset.load)
    }

    @Test
    fun clientRetriesBackOffThenStop() {
        assertEquals(400L, castClientRetryDelayMs(1))
        assertEquals(800L, castClientRetryDelayMs(2))
        assertEquals(1_600L, castClientRetryDelayMs(3))
        assertEquals(null, castClientRetryDelayMs(4))
        assertEquals(null, castClientRetryDelayMs(0))
    }

    @Test
    fun noSessionIsDown() {
        assertEquals(
            CastSessionReadiness.Down,
            castSessionReadiness(
                connected = false,
                hasRemoteClient = false,
                playerSessionAvailable = false,
            ),
        )
    }
}
