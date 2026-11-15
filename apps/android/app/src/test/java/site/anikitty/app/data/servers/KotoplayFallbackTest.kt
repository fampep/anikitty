// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class KotoplayFallbackTest {
    @Test
    fun suggestPrefersTheAnilistId() {
        val hits = AnikotoServer.parseKotoSuggest(
            JSONObject(
                """
                {"anime":[
                  {"slug":"one-piece-recap","title":"One Piece Recap","ani_id":999,"mal_id":1},
                  {"slug":"one-piece-odmau","title":"One Piece","ani_id":21,"mal_id":21}
                ]}
                """.trimIndent(),
            ),
        )
        val picked = AnikotoServer.pickKotoHit(hits, 21, listOf("One Piece"), 21)
        assertEquals("one-piece-odmau", picked?.slug)
    }

    @Test
    fun chaptersAndServersKeepSubDubAndSkipTheEmptyWindow() {
        val anime = AnikotoServer.kotoAnimeObject(
            JSONObject(
                """
                {"anime":{"slug":"hell-girl","ani_id":228,"chapters":[
                  {"id":5810,"chapter_number":"1","is_sub":1,"is_dub":0}
                ]}}
                """.trimIndent(),
            ),
        )!!
        val chapters = AnikotoServer.parseKotoChapters(anime)
        assertEquals(1, chapters.single().number)
        assertEquals(5810, chapters.single().chapterId)
        assertTrue(chapters.single().hasSub)
        assertFalse(chapters.single().hasDub)
        val links = AnikotoServer.parseKotoServerLinks(
            JSONObject(
                """
                {"servers":{"sub":[
                  {"name":"HD-1","link":"https://megaplay.buzz/stream/s-2/17534/sub?s=tcdn","skip_data":{"intro":[0,0],"outro":[0,0]}},
                  {"name":"Vidstream-2","link":"https://megaplay.buzz/stream/s-2/17534/sub","skip_data":{"intro":[12,90],"outro":[1300,1400]}}
                ]}}
                """.trimIndent(),
            ),
            "sub",
        )
        assertEquals(listOf("HD-1", "Vidstream-2"), links.map { it.label })
        assertTrue(links[1].url.contains("/sub"))
        assertFalse(links[1].url.contains("tcdn"))
        assertNull(links.firstOrNull { it.label == "missing" })
    }

    @Test
    fun titleMatchDoesNotStealADifferentAnilistId() {
        val hits = listOf(
            KotoHit("other", "Ghost in the Shell", aniId = 40, malId = 40),
            KotoHit("untitled", "Ghost in the Shell", aniId = null, malId = null),
        )
        assertNull(AnikotoServer.pickKotoHit(hits, 43, listOf("Ghost in the Shell"), 43))
    }

    @Test
    fun malIdStillSelectsTheRow() {
        val hits = listOf(
            KotoHit("sequel", "Ghost in the Shell", aniId = null, malId = 99),
            KotoHit("film", "Ghost in the Shell", aniId = null, malId = 43),
        )
        assertEquals("film", AnikotoServer.pickKotoHit(hits, 43, listOf("Ghost in the Shell"), 43)?.slug)
    }
}
