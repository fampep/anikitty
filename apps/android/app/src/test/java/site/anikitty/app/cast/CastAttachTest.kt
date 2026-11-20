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
}
