// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import site.anikitty.app.data.friendlyFailure

class AniPmHttpFailureTest {
    @Test
    fun cloudflareBlockPageIsAClearSourceError() {
        val html = "<!DOCTYPE html><title>Attention Required! | Cloudflare</title><h1>Sorry, you have been blocked</h1>"
        val message = aniPmHttpFailure(403, html)
        assertEquals(AniPmServer.BLOCKED, message)
        assertFalse(message.contains("403"))
        assertFalse(message.contains("http"))
    }

    @Test
    fun challengePageWithoutASuccessCodeIsStillBlocked() {
        val html = "<html><title>Just a moment...</title><span>cf-mitigated</span></html>"
        assertEquals(AniPmServer.BLOCKED, aniPmHttpFailure(503, html))
    }

    @Test
    fun missingEpisodeStaysDistinctFromABlock() {
        assertEquals("Ani.pm does not have this episode.", aniPmHttpFailure(404, ""))
    }

    @Test
    fun playbackHeadersUseACurrentChromeAgentAndForwardTheKeyProof() {
        val headers = AniPmServer.playbackHeaders("proof-token")
        assertTrue(headers.getValue("User-Agent").contains("Chrome/131"))
        assertFalse(headers.getValue("User-Agent").contains("Chrome/120"))
        assertEquals(AniPmServer.PLAY_REFERER, headers.getValue("Referer"))
        assertEquals("https://ani.pm", headers.getValue("Origin"))
        assertEquals("proof-token", headers.getValue(AniPmServer.HEADER_KEY_PROOF))
    }

    @Test
    fun blankKeyProofIsOmitted() {
        assertFalse(AniPmServer.playbackHeaders("").containsKey(AniPmServer.HEADER_KEY_PROOF))
    }

    @Test
    fun rawPlayer403BecomesASourceMessage() {
        assertEquals(
            "This source is blocked by the site. Try another source.",
            friendlyFailure("InvalidResponseCodeException: Response code: 403"),
        )
        assertEquals(
            "This source is blocked by the site. Try another source.",
            friendlyFailure("ani.pm HTTP 403 for https://embed.settlar.io/api/embed/session?t=abc"),
        )
    }

    @Test
    fun embedPageNonceMatchesTheNekoWatchPlayer() {
        val html = """
            <html><script id="anipm-embed-config" type="application/json">{"nonce":"abc/def+123","v":1}</script></html>
        """.trimIndent()
        assertEquals("abc/def+123", aniPmEmbedNonce(html))
        assertEquals(
            "https://ani.pm/embed/ani/181444/7/sub?autonext=0&episodes=0&adult=0",
            partnerEmbedUrl(181444, 7, "sub"),
        )
        assertEquals(
            "https://ani.pm/api/partner/v1/session?n=abc%2Fdef%2B123&id=181444&ep=7&lang=sub&hardsub=0&adult=0",
            partnerSessionUrl("abc/def+123", 181444, 7, "sub"),
        )
    }

    @Test
    fun challengePageHasNoEmbedNonce() {
        val html = "<html><title>Just a moment...</title></html>"
        assertEquals(null, aniPmEmbedNonce(html))
    }

    @Test
    fun clearBlockMessageIsKept() {
        val joined = "All installed providers failed — Ani.pm: ${AniPmServer.BLOCKED}"
        assertEquals(joined, friendlyFailure(joined))
    }
}
