// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.download

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import site.anikitty.app.data.servers.FlixUnwrap
import site.anikitty.app.data.servers.GotakuObf
import site.anikitty.app.data.servers.PlayableSource
import site.anikitty.app.data.servers.SegmentStripDataSource
import java.io.File

class EpisodeDownloadTest {
    @Test
    fun wrappedSourcesAndLocalFilesCannotBeSaved() {
        val remote = source("https://cdn.example/a.m3u8")
        assertNull(offlineBlockReason(remote))
        assertEquals("Can't save this source", offlineBlockReason(remote.copy(gotakuObf = GotakuObf("k", "t"))))
        assertEquals(
            "Can't save this source",
            offlineBlockReason(remote.copy(flix = FlixUnwrap("p", "m", false))),
        )
        assertEquals("Already on this device", offlineBlockReason(source("file:/tmp/a.mp4")))
    }

    @Test
    fun theShelfShowsQueueProgressSaveAndRetry() {
        val remote = source("https://cdn.example/a.mp4", headers = mapOf("Referer" to "https://site"))
        assertEquals(DownloadStatus("Download", canStart = true, canRemove = false), downloadStatus(remote, null))
        val queued = saved(remote, DownloadPhase.QUEUED, percent = 0)
        assertEquals("Queued", downloadStatus(remote, queued).label)
        assertFalse(downloadStatus(remote, queued).canStart)
        assertEquals("Saving…", downloadStatus(remote, queued.copy(phase = DownloadPhase.RUNNING)).label)
        assertEquals(
            "Saving 40%",
            downloadStatus(remote, queued.copy(phase = DownloadPhase.RUNNING, progressPercent = 40)).label,
        )
        assertTrue(downloadStatus(remote, queued.copy(phase = DownloadPhase.READY)).canRemove)
        assertEquals(
            "Retry · The source refused the download",
            downloadStatus(
                remote,
                queued.copy(phase = DownloadPhase.FAILED, error = "The source refused the download"),
            ).label,
        )
        assertTrue(downloadStatus(source("https://cdn.example/other.mp4"), queued).canStart)
        val rotated = source("https://cdn.example/a.mp4?token=later")
        assertEquals("Queued", downloadStatus(rotated, queued).label)
        assertFalse(downloadStatus(rotated, queued).canStart)
    }

    @Test
    fun aRotatedUrlStillPlaysTheSavedCopy() {
        val savedUrl = "https://cdn.example/a.mp4?token=1"
        val live = source("https://cdn.example/a.mp4?token=2", headers = mapOf("Referer" to "https://site"))
        val file = File.createTempFile("episode", ".mp4")
        file.writeText("video")
        try {
            val ready = saved(source(savedUrl), DownloadPhase.READY, path = file.absolutePath)
            assertTrue(shouldRefreshSavedUrl(live, ready))
            assertFalse(shouldRefreshSavedUrl(live, ready.copy(hls = true)))
            val playing = sourceForPlayback(
                live,
                playbackSavedEpisode(live, ready, sessionStartedOffline = true),
            )
            assertTrue(playing.url.startsWith("file:"))
            assertNull(
                playbackSavedEpisode(live, ready, sessionStartedOffline = false),
            )
            assertEquals(
                live.url,
                sourceForPlayback(live, playbackSavedEpisode(live, null, sessionStartedOffline = true)).url,
            )
        } finally {
            file.delete()
        }
        val gone = saved(source(savedUrl), DownloadPhase.READY, path = file.absolutePath)
        assertNull(playbackSavedEpisode(live, gone, sessionStartedOffline = true))
        assertEquals(live.url, sourceForPlayback(live, gone).url)

        val cached = saved(source("https://cdn.example/master.m3u8?token=1", hls = true), DownloadPhase.READY, hls = true)
        val refreshed = source("https://cdn.example/master.m3u8?token=9", hls = true)
        val held = playbackSavedEpisode(refreshed, cached, sessionStartedOffline = true)
        assertTrue(usesHlsCache(refreshed, held))
        assertEquals(cached.url, sourceForPlayback(refreshed, held).url)
        assertFalse(shouldRefreshSavedUrl(refreshed, cached))
    }

    @Test
    fun aFinishedFilePlaysOfflineAndAPlaylistUsesTheCache() {
        val remote = source("https://cdn.example/a.mp4?token=1", headers = mapOf("Referer" to "https://site"))
        val file = File.createTempFile("episode", ".mp4")
        file.writeText("video")
        try {
            val ready = saved(remote, DownloadPhase.READY, path = file.absolutePath)
            val playing = sourceForPlayback(remote, ready)
            assertTrue(playing.url.startsWith("file:"))
            assertTrue(playing.headers.isEmpty())
            assertFalse(playing.hls)
            assertFalse(usesHlsCache(remote, ready))
        } finally {
            file.delete()
        }
        val missing = saved(remote, DownloadPhase.READY, path = file.absolutePath)
        assertEquals(remote.url, sourceForPlayback(remote, missing).url)

        val playlist = source("https://cdn.example/master.m3u8", hls = true)
        val cached = saved(playlist, DownloadPhase.READY, hls = true)
        assertTrue(usesHlsCache(playlist, cached))
        assertEquals(playlist.url, sourceForPlayback(playlist, cached).url)
        assertFalse(usesHlsCache(playlist, cached.copy(phase = DownloadPhase.RUNNING)))
    }

    @Test
    fun headersRoundTripAndTheFileNameStaysInsideTheEpisodeFolder() {
        val encoded = encodeHeaders(mapOf("Referer" to "https://site/a", "User-Agent" to "phone"))
        assertEquals(mapOf("Referer" to "https://site/a", "User-Agent" to "phone"), decodeHeaders(encoded))
        assertTrue(decodeHeaders("not-json").isEmpty())
        val file = progressiveFile(File("/data/files"), 42, 7, "https://cdn.example/path/show.webm?token=1")
        assertEquals("42/7.webm", file.relativeTo(File("/data/files")).path)
        assertEquals("mp4", progressiveExtension("https://cdn.example/playlist.m3u8"))
        assertEquals("anikitty:42:7:", episodeCachePrefix(42, 7))
    }

    @Test
    fun stripBytesMatchPlaybackAndFailuresStayShort() {
        assertEquals(SegmentStripDataSource.DEFAULT_STRIP_BYTES, resolvedStripBytes(source("https://cdn/a.mp4")))
        assertEquals(12, resolvedStripBytes(source("https://cdn/a.mp4").copy(stripBytes = 12)))
        assertEquals(0, resolvedStripBytes(source("https://cdn/a.mp4").copy(gotakuObf = GotakuObf("k", "t"), stripBytes = 0)))
        assertEquals("The source refused the download", httpFailure(403))
        assertEquals("Couldn't save this episode", httpFailure(500))
        assertEquals("Couldn't save this episode", downloadErrorMessage(java.io.IOException("https://secret")))
        assertEquals(
            "The source refused the download",
            downloadErrorMessage(DownloadRejectedException("The source refused the download")),
        )
    }

    @Test
    fun oneHlsRenditionStaysWatchable() {
        val variants = listOf(
            HlsVariantFacts(height = 1080, bandwidth = 8_000_000, audioGroupId = "aac"),
            HlsVariantFacts(height = 720, bandwidth = 2_000_000, audioGroupId = "aac"),
            HlsVariantFacts(height = 480, bandwidth = 800_000, audioGroupId = "aac"),
        )
        val audios = listOf(
            HlsAudioFacts(groupId = "aac"),
            HlsAudioFacts(groupId = "aac"),
        )
        val plan = chooseHlsSavePlan(variants, audios)
        assertEquals(HlsSavePlan(1, listOf(0, 1)), plan)
        assertEquals("v1a0,1", encodeHlsStreams(plan!!))
        assertEquals(plan, decodeHlsStreams("v1a0,1"))
        assertEquals(HlsSavePlan(1, listOf(1)), decodeHlsStreams("v1a1"))

        val huge = listOf(
            HlsVariantFacts(height = 1080, bandwidth = 4_000_000, audioGroupId = null),
            HlsVariantFacts(height = 2160, bandwidth = 1_200_000, audioGroupId = null),
        )
        assertEquals(1, chooseHlsSavePlan(huge, emptyList())?.variantIndex)
        assertEquals(emptyList<Int>(), chooseHlsSavePlan(huge, emptyList())?.audioIndices)

        val byRate = listOf(
            HlsVariantFacts(height = 0, bandwidth = 4_000_000, audioGroupId = "a"),
            HlsVariantFacts(height = 0, bandwidth = 1_500_000, audioGroupId = ""),
        )
        assertEquals(1, chooseHlsSavePlan(byRate, listOf(HlsAudioFacts("a")))?.variantIndex)
        assertEquals(emptyList<Int>(), chooseHlsSavePlan(byRate, listOf(HlsAudioFacts("a")))?.audioIndices)

        val onlyLarge = listOf(
            HlsVariantFacts(height = 0, bandwidth = 8_000_000, audioGroupId = "a"),
            HlsVariantFacts(height = 0, bandwidth = 3_000_000, audioGroupId = "a"),
        )
        val smallest = chooseHlsSavePlan(onlyLarge, listOf(HlsAudioFacts("a")))
        assertEquals(HlsSavePlan(1, listOf(0)), smallest)
        assertEquals("v1a0", encodeHlsStreams(smallest!!))

        val trick = listOf(
            HlsVariantFacts(height = 720, bandwidth = 400_000, audioGroupId = "aac", trickPlay = true),
            HlsVariantFacts(height = 480, bandwidth = 800_000, audioGroupId = "aac"),
        )
        assertEquals(1, chooseHlsSavePlan(trick, audios)?.variantIndex)
        assertNull(
            chooseHlsSavePlan(
                listOf(HlsVariantFacts(height = 720, bandwidth = 400_000, audioGroupId = null, trickPlay = true)),
                emptyList(),
            ),
        )
        assertNull(decodeHlsStreams(null))
        assertNull(decodeHlsStreams(" "))
        assertNull(decodeHlsStreams("audio"))
        assertNull(chooseHlsSavePlan(emptyList(), emptyList()))
    }

    @Test
    fun aStoredRowKeepsThePhaseTheShelfReads() {
        val row = EpisodeDownloadEntity(
            anilistId = 9,
            episode = 2,
            title = "Show",
            sourceKey = "stream",
            url = "https://cdn/a.mp4",
            headersJson = """{"Referer":"https://site"}""",
            hls = false,
            stripBytes = 252,
            phase = "NOPE",
            progressPercent = 140,
            localPath = null,
            error = null,
            updatedAtEpochMs = 1L,
        )
        val saved = row.toSaved()
        assertEquals(DownloadPhase.FAILED, saved.phase)
        assertEquals(100, saved.progressPercent)
        assertEquals(mapOf("Referer" to "https://site"), saved.headers)
    }

    private fun source(
        url: String,
        headers: Map<String, String> = emptyMap(),
        hls: Boolean = false,
    ) = PlayableSource(url = url, headers = headers, hls = hls)

    private fun saved(
        source: PlayableSource,
        phase: DownloadPhase,
        percent: Int = 0,
        path: String? = null,
        hls: Boolean = false,
    ) = SavedEpisode(
        anilistId = 9,
        episode = 2,
        sourceKey = sourceKey(source),
        url = source.url,
        headers = source.headers,
        hls = hls,
        phase = phase,
        progressPercent = percent,
        localPath = path,
        error = null,
    )
}
