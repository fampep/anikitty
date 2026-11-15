// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.extensions

import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The store of record at fampep/anikitty-extensions 4355811.
 * Providers are source trees. Only Hello publishes anikitty-extension.json.
 */
class ExtensionInstallLiveIndexTest {
    @Test
    fun liveIndexParsesVersionProtocolAndMkissa() = runBlocking {
        val index = ExtensionStoreClient(listOf(PINNED_INDEX)).fetchIndex()
        val ids = index.extensions.map { it.id }
        assertEquals(
            listOf("anikoto", "gotaku", "reanime", "mkissa", "site.anikitty.example.hello"),
            ids,
        )
        val mkissa = index.extensions.first { it.id == "mkissa" }
        assertEquals("1.0.0", mkissa.version)
        assertEquals("1.1", mkissa.protocol)
        assertEquals("1.1", index.extensions.first { it.id == "anikoto" }.protocol)
        assertTrue(index.extensions.all { it.version != null && it.protocol == "1.1" })
    }

    @Test
    fun bundledProvidersHaveNoManifestAndAreNotDownloaded() = runBlocking {
        val index = ExtensionStoreClient(listOf(PINNED_INDEX)).fetchIndex()
        val missing = ArrayList<String>()
        for (listing in index.extensions) {
            val plan = prepareStoreInstall(listing)
            val url = manifestUrls(listing.github, listing.manifestPath).first()
            assertTrue(url.startsWith("https://"))
            val pinned = url.replace("/main/", "/$PIN/")
            if (listing.id in BUNDLED_EXTENSION_IDS) {
                assertTrue(
                    "${listing.id} must stay on the phone, not be fetched",
                    plan is StoreInstall.OnDevice,
                )
                val failure = fetchFailure(pinned)
                assertEquals(404, failure?.code)
                val message = explainInstallFailure(failure)
                assertTrue(message, message.contains("ships with AniKitty"))
                assertTrue(message, message.contains("anikitty-extension.json"))
                assertFalse(message.contains("HTTP 404"))
                missing += listing.id
            } else {
                assertTrue(plan is StoreInstall.Fetch)
                val body = ExtensionHttp.getString(pinned)
                val manifest = ExtensionManifestParser.parse(body, listing.github, pinned)
                assertEquals(listing.id, manifest.id)
                assertEquals(listing.version, manifest.version)
                assertFalse(isNewerVersion(manifest.version, listing.version!!))
            }
        }
        assertEquals(BUNDLED_EXTENSION_IDS, missing.toSet())
    }

    @Test
    fun blankFailureStillSaysWhatHappened() {
        val message = explainInstallFailure(IllegalStateException())
        assertEquals("Could not install this extension.", message)
    }

    private fun fetchFailure(url: String): ExtensionFetchException? {
        return try {
            ExtensionHttp.getString(url)
            null
        } catch (e: ExtensionFetchException) {
            e
        }
    }

    private companion object {
        const val PIN = "4355811233efff0e8f222d76e7ee81e8c7a5e2ae"
        const val PINNED_INDEX =
            "https://raw.githubusercontent.com/fampep/anikitty-extensions/$PIN/store/index.json"
    }
}
