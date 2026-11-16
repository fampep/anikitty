// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AnikotoLatestParserTest {
    @Test
    fun parsesSubAndDubCountsFromWidgetHtml() {
        val html = """
            <div class="ani items">
              <div class="item">
                <div class="ani poster" data-tip="9081">
                  <a href="https://anikoto.cz/watch/kanata-kara-c16d8/ep-7">
                    <img src="https://cdn.example/poster.jpg" alt="From Far Away" />
                    <div class="meta"><div class="inner"><div class="left">
                      <span class="ep-status sub"><span> 7</span></span>
                      <span class="ep-status dub"><span> 4</span></span>
                      <span class="ep-status total"><span>12</span></span>
                    </div></div></div>
                  </a>
                </div>
                <div class="info">
                  <a class="name d-title" href="https://anikoto.cz/watch/kanata-kara-c16d8/ep-7"
                    data-jp="Kanata kara">From Far Away, From the Other Side</a>
                </div>
              </div>
              <div class="item">
                <div class="ani poster" data-tip="9063">
                  <a href="https://anikoto.cz/watch/my-girlfriend-s-friend-5cc36/ep-7">
                    <img src="https://cdn.example/g.jpg" />
                    <div class="meta"><div class="inner"><div class="left">
                      <span class="ep-status sub"><span> 7</span></span>
                    </div></div></div>
                  </a>
                </div>
                <div class="info">
                  <a class="name d-title" href="https://anikoto.cz/watch/my-girlfriend-s-friend-5cc36/ep-7">
                    My Girlfriend&#039;s Friend
                  </a>
                </div>
              </div>
            </div>
        """.trimIndent()
        val items = AnikotoLatestParser.parseWidgetHtml(html)
        assertEquals(2, items.size)
        val first = items[0]
        assertEquals("9081", first.siteId)
        assertEquals("kanata-kara-c16d8", first.slug)
        assertEquals(7, first.latestSub)
        assertEquals(4, first.latestDub)
        assertEquals(7, first.episodeFor("sub"))
        assertEquals(4, first.episodeFor("dub"))
        assertEquals("From Far Away, From the Other Side", first.title)
        assertEquals(7, items[1].latestSub)
        assertEquals(0, items[1].latestDub)
        assertTrue(items[1].title.contains("Girlfriend"))
    }

    @Test
    fun audioAvailabilityLabelJoinsSubAndDub() {
        assertEquals(
            "7 Sub · 4 Dub",
            AnikotoAudioAvailability(7, 4).label(),
        )
        assertEquals("7 Sub", AnikotoAudioAvailability(7, 0).label())
        assertEquals("4 Dub", AnikotoAudioAvailability(0, 4).label())
    }
}
