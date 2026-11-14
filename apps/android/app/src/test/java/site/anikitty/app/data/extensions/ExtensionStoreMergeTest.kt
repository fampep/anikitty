// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.extensions

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class ExtensionStoreMergeTest {
    @Test
    fun retiredNamesAreAniPmSettlarAndYozora() {
        assertTrue(isRetiredExtension("anipm"))
        assertTrue(isRetiredExtension("settlar", "Settlar"))
        assertTrue(isRetiredExtension("custom", "Ani.pm"))
        assertTrue(isRetiredExtension("custom", "Yozora"))
        assertFalse(isRetiredExtension("reanime", "reanime"))
    }

    @Test
    fun newerMirrorDropsAniPmFromAnOlderCopy() {
        val merged = mergeStoreIndexes(
            listOf(
                index(
                    url = MIRROR,
                    updatedAt = "2026-11-15",
                    reanime(),
                ),
                index(
                    url = MONOREPO,
                    updatedAt = "2026-11-14",
                    anipm(),
                    reanime(version = "0.9.0"),
                ),
            ),
        )
        assertEquals(listOf("reanime"), merged.extensions.map { it.id })
        assertEquals("1.0.0", merged.extensions.single().version)
        assertEquals("1.1", merged.extensions.single().protocol)
        assertEquals("2026-11-15", merged.updatedAt)
    }

    @Test
    fun sameDayMirrorStillRefusesAniPm() {
        val merged = mergeStoreIndexes(
            listOf(
                index(MIRROR, "2026-11-15", reanime()),
                index(MONOREPO, "2026-11-15", anipm(), hello()),
            ),
        )
        assertEquals(listOf("reanime", "site.anikitty.example.hello"), merged.extensions.map { it.id })
        assertNull(merged.extensions.find { it.name == "Ani.pm" })
    }

    @Test
    fun publishedIndexNamesReanimeAndOmitsAniPm() {
        val file = listOf(
            File("extensions/store/index.json"),
            File("../../extensions/store/index.json"),
            File("../../../extensions/store/index.json"),
        ).firstOrNull { it.isFile }
        assertNotNull("store index not found from ${File(".").absolutePath}", file)
        val text = file!!.readText()
        assertTrue(text.contains("\"id\": \"reanime\""))
        assertTrue(text.contains("\"name\": \"reanime\""))
        assertTrue(text.contains("\"version\": \"1.0.0\""))
        assertTrue(text.contains("\"protocol\": \"1.1\""))
        assertTrue(text.contains("reanime.cz"))
        assertFalse(text.contains("anipm"))
        assertFalse(text.contains("Ani.pm"))
        assertFalse(text.contains("Settlar"))
        assertFalse(text.contains("Yozora"))
        assertTrue(text.contains("\"version\": \"1.1.1\""))
    }

    @Test
    fun newerMonorepoCanReplaceARowAndAddOne() {
        val merged = mergeStoreIndexes(
            listOf(
                index(MIRROR, "2026-11-14", reanime(version = "1.0.0")),
                index(MONOREPO, "2026-11-15", reanime(version = "1.0.1"), hello()),
            ),
        )
        val reanime = merged.extensions.first { it.id == "reanime" }
        assertEquals("1.0.1", reanime.version)
        assertTrue(merged.extensions.any { it.id == "site.anikitty.example.hello" })
    }

    private fun reanime(version: String = "1.0.0") = StoreListing(
        id = "reanime",
        name = "reanime",
        description = "Bundled reanime.cz resolver.",
        github = "https://github.com/fampep/anikitty-extensions/tree/main/providers/reanime",
        version = version,
        protocol = "1.1",
        iconUrl = "https://www.google.com/s2/favicons?domain=reanime.cz&sz=128",
        siteUrl = "https://reanime.cz",
    )

    private fun anipm() = StoreListing(
        id = "anipm",
        name = "Ani.pm",
        description = "Settlar / Yozora",
        github = "https://github.com/fampep/anikitty-extensions/tree/main/providers/anipm",
    )

    private fun hello() = StoreListing(
        id = "site.anikitty.example.hello",
        name = "Hello HTTP",
        description = "example",
        github = "https://github.com/fampep/anikitty-extensions/tree/main/examples/hello-http",
        version = "1.1.1",
        protocol = "1.1",
    )

    private fun index(url: String, updatedAt: String, vararg listings: StoreListing) = StoreIndex(
        apiVersion = 1,
        updatedAt = updatedAt,
        extensions = listings.toList(),
        sourceUrl = url,
    )

    private companion object {
        const val MIRROR =
            "https://raw.githubusercontent.com/fampep/anikitty-extensions/main/store/index.json"
        const val MONOREPO =
            "https://raw.githubusercontent.com/fampep/anikitty/main/extensions/store/index.json"
    }
}
