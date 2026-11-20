// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.updates

import java.io.IOException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class AppReleaseListCacheTest {
    @Test
    fun aFreshListIsReusedUntilItExpires() = runBlocking {
        var now = 1_000L
        var fetches = 0
        val cache = AppReleaseListCache(freshForMs = 1_000, clock = { now })
        val first = cache.load {
            fetches += 1
            listOf(build("1.2.10-dev.20"))
        }
        val second = cache.load { error("home came back and must not fetch again") }
        assertEquals(1, fetches)
        assertEquals(first, second)
        assertEquals("1.2.10-dev.20", cache.peek()?.single()?.versionName)

        val forced = cache.load(force = true) {
            fetches += 1
            listOf(build("1.2.10-dev.21"))
        }
        assertEquals(2, fetches)
        assertEquals("1.2.10-dev.21", forced?.single()?.versionName)

        now = 2_000L
        assertNull(cache.peek())
    }

    @Test
    fun aFailedLoadWaitsBeforeTryingAgain() = runBlocking {
        var now = 0L
        var fetches = 0
        val cache = AppReleaseListCache(retryAfterFailureMs = 500, clock = { now })
        val failed = cache.load {
            fetches += 1
            throw IOException("offline")
        }
        assertNull(failed)
        val quiet = cache.load { error("still cooling down") }
        assertEquals(1, fetches)
        assertNull(quiet)

        now = 500L
        cache.load {
            fetches += 1
            listOf(build("1.2.10-dev.20"))
        }
        assertEquals(2, fetches)
    }

    @Test
    fun overlappingLoadsShareOneFetch() = runBlocking {
        var fetches = 0
        val cache = AppReleaseListCache()
        val loaded = coroutineScope {
            val first = async {
                cache.load {
                    fetches += 1
                    delay(40)
                    listOf(build("1.2.10-dev.20"))
                }
            }
            val second = async {
                delay(10)
                cache.load { error("the home banner and App builds fetched together") }
            }
            listOf(first.await(), second.await())
        }
        assertEquals(1, fetches)
        assertEquals("1.2.10-dev.20", loaded[0]?.single()?.versionName)
        assertEquals(loaded[0], loaded[1])
    }

    @Test
    fun leavingTheScreenStillPublishesTheList() = runBlocking {
        val loader = CoroutineScope(SupervisorJob() + Dispatchers.Default)
        val started = CompletableDeferred<Unit>()
        val release = CompletableDeferred<Unit>()
        var fetches = 0
        val cache = AppReleaseListCache(loader = loader)
        val caller = launch {
            cache.load {
                fetches += 1
                started.complete(Unit)
                release.await()
                listOf(build("1.2.10-dev.20"))
            }
        }
        started.await()
        caller.cancel()
        release.complete(Unit)
        withTimeout(2_000) {
            while (cache.peek() == null) delay(10)
        }
        val again = cache.load { error("the cancelled screen already fetched this") }
        assertEquals(1, fetches)
        assertEquals("1.2.10-dev.20", again?.single()?.versionName)
        loader.coroutineContext[Job]?.cancel()
        Unit
    }

    @Test
    fun aFailedRefreshKeepsTheLastList() = runBlocking {
        var now = 0L
        var fetches = 0
        val cache = AppReleaseListCache(freshForMs = 1_000, retryAfterFailureMs = 500, clock = { now })
        cache.load {
            fetches += 1
            listOf(build("1.2.10-dev.20"))
        }
        now = 1_000L
        assertNull(cache.peek())
        val kept = cache.load {
            fetches += 1
            throw IOException("offline")
        }
        assertEquals("1.2.10-dev.20", kept?.single()?.versionName)
        assertEquals(kept, cache.retained())
        val duringCooldown = cache.load { error("still cooling down") }
        assertEquals(kept, duringCooldown)
        assertEquals(2, fetches)
    }

    private fun build(name: String) = PublishedBuild(
        versionName = name,
        tag = "v$name",
        prerelease = true,
        publishedAt = "2026-11-20T21:16:47Z",
        notes = "",
        apkUrl = "https://example.com/$name.apk",
        pullRequests = emptyList(),
    )
}
