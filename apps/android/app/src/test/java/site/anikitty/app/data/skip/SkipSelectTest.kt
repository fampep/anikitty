// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.skip

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SkipSelectTest {
    @Test
    fun providerMarkersWinOverAniSkip() {
        val provider = SkipTimes(
            intro = SkipInterval(12.0, 90.0),
            outro = SkipInterval(1300.0, 1400.0),
        )
        val aniskip = listOf(AniSkipStamp("ed", 20.0, 110.0, 1440.0))
        val chosen = chooseSkip(provider, aniskip, durationSec = 1460.0)
        assertEquals(12.0, chosen.intro?.startSec ?: -1.0, 0.01)
        assertEquals(1300.0, chosen.outro?.startSec ?: -1.0, 0.01)
    }

    @Test
    fun aniskipFillsAMissingSideAndShiftsToThisDuration() {
        val provider = SkipTimes(intro = SkipInterval(10.0, 85.0))
        val stamps = listOf(
            AniSkipStamp("ed", 1200.0, 1290.0, 1400.0),
            AniSkipStamp("ed", 1320.0, 1410.0, 1440.0),
        )
        val chosen = chooseSkip(provider, stamps, durationSec = 1460.0)
        assertEquals(10.0, chosen.intro?.startSec ?: -1.0, 0.01)
        assertEquals(1340.0, chosen.outro?.startSec ?: -1.0, 0.01)
        assertEquals(1430.0, chosen.outro?.endSec ?: -1.0, 0.01)
    }

    @Test
    fun aFarEpisodeLengthIsNotUsed() {
        val stamps = listOf(AniSkipStamp("op", 0.0, 90.0, 600.0))
        val chosen = chooseSkip(SkipTimes(), stamps, durationSec = 1440.0)
        assertTrue(chosen.isEmpty)
    }

    @Test
    fun unknownDurationKeepsTheProviderAndSkipsAniSkip() {
        val provider = SkipTimes(outro = SkipInterval(1300.0, 1390.0))
        val stamps = listOf(AniSkipStamp("op", 0.0, 90.0, 1440.0))
        val chosen = chooseSkip(provider, stamps, durationSec = 0.0)
        assertNull(chosen.intro)
        assertEquals(1300.0, chosen.outro?.startSec ?: -1.0, 0.01)
    }

    @Test
    fun badWindowsAreDropped() {
        val raw = SkipTimes(
            intro = SkipInterval(90.0, 12.0),
            outro = SkipInterval(10.0, 12.0),
            recap = SkipInterval(0.0, 400.0),
            preview = SkipInterval(1400.0, 1460.0),
        )
        val clean = sanitizeSkip(raw, durationSec = 1440.0)
        assertTrue(clean.isEmpty)
    }

    @Test
    fun eachStreamKeepsItsOwnOutro() {
        val first = chooseSkip(SkipTimes(outro = SkipInterval(1200.0, 1290.0)), durationSec = 1400.0)
        val second = chooseSkip(SkipTimes(outro = SkipInterval(800.0, 880.0)), durationSec = 900.0)
        assertEquals(1200.0, first.outro?.startSec ?: -1.0, 0.01)
        assertEquals(800.0, second.outro?.startSec ?: -1.0, 0.01)
    }

    @Test
    fun jsonReadsArrayObjectAndAliases() {
        val anikoto = skipTimesFromJson(
            JSONObject("""{"intro":[12,90],"outro":[0,0],"ed":{"start":1300,"end":1400}}"""),
        )
        assertEquals(12.0, anikoto.intro?.startSec ?: -1.0, 0.01)
        assertEquals(1300.0, anikoto.outro?.startSec ?: -1.0, 0.01)
        val nested = skipTimesFromJson(
            JSONObject("""{"skip":{"op":[0,86],"ending":[1320,1410]}}"""),
        )
        assertEquals(86.0, nested.intro?.endSec ?: -1.0, 0.01)
        assertEquals(1320.0, nested.outro?.startSec ?: -1.0, 0.01)
        assertTrue(skipTimesFromJson(JSONObject("""{"intro":[1,2]}""")).isEmpty)
    }

    @Test
    fun aniskipBodyKeepsOpeningAndEnding() {
        val body = """
            {"found":true,"results":[
              {"interval":{"startTime":21,"endTime":111},"skipType":"op","episodeLength":1440},
              {"interval":{"startTime":1320,"endTime":1410},"skipType":"mixed-ed","episodeLength":1440},
              {"interval":{"startTime":1,"endTime":2},"skipType":"recap","episodeLength":1440}
            ]}
        """.trimIndent()
        val stamps = parseAniSkip(body)
        assertEquals(listOf("op", "ed"), stamps.map { it.kind })
        assertTrue(parseAniSkip("""{"found":false}""").isEmpty())
    }
}
