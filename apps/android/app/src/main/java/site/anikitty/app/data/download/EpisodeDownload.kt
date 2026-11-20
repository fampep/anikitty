// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.download

import org.json.JSONObject
import site.anikitty.app.data.servers.PlayableSource
import site.anikitty.app.data.servers.SegmentStripDataSource
import java.io.File

/** Same agent the player sends. A different one makes some CDNs reject the save. */
internal const val DOWNLOAD_USER_AGENT =
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"

internal const val DOWNLOAD_ANILIST_ID = "anilistId"
internal const val DOWNLOAD_EPISODE = "episode"

internal enum class DownloadPhase { QUEUED, RUNNING, READY, FAILED }

/** A saved episode the player can use without Room or WorkManager. */
internal data class SavedEpisode(
    val anilistId: Int,
    val episode: Int,
    val url: String,
    val hls: Boolean,
    val phase: DownloadPhase,
    val progressPercent: Int,
    val localPath: String?,
    val error: String?,
)

internal data class DownloadStatus(
    val label: String,
    val canStart: Boolean,
    val canRemove: Boolean,
)

/** Why this source cannot be saved, or null when a download can start. */
internal fun offlineBlockReason(source: PlayableSource): String? = when {
    source.gotakuObf != null || source.flix != null -> "Can't save this source"
    !source.url.startsWith("http://") && !source.url.startsWith("https://") -> "Already on this device"
    else -> null
}

internal fun isHlsSource(source: PlayableSource): Boolean =
    source.hls || source.url.contains(".m3u8", ignoreCase = true)

/** Same strip the player applies, so a cached segment is already unwrapped. */
internal fun resolvedStripBytes(source: PlayableSource): Int = when {
    source.gotakuObf != null || source.flix != null -> source.stripBytes.coerceAtLeast(0)
    source.stripBytes > 0 -> source.stripBytes
    else -> SegmentStripDataSource.DEFAULT_STRIP_BYTES
}

internal fun downloadStatus(source: PlayableSource, saved: SavedEpisode?): DownloadStatus {
    val blocked = offlineBlockReason(source)
    if (blocked != null) return DownloadStatus(blocked, canStart = false, canRemove = false)
    val row = saved?.takeIf { it.url == source.url }
        ?: return DownloadStatus("Download", canStart = true, canRemove = false)
    return when (row.phase) {
        DownloadPhase.QUEUED -> DownloadStatus("Queued", canStart = false, canRemove = false)
        DownloadPhase.RUNNING -> DownloadStatus(
            label = if (row.progressPercent <= 0) "Saving…" else "Saving ${row.progressPercent}%",
            canStart = false,
            canRemove = false,
        )
        DownloadPhase.READY -> DownloadStatus("Saved", canStart = false, canRemove = true)
        DownloadPhase.FAILED -> DownloadStatus(
            label = row.error?.takeIf { it.isNotBlank() }?.let { "Retry · $it" } ?: "Retry download",
            canStart = true,
            canRemove = false,
        )
    }
}

/**
 * Progressive saves play from the file. HLS keeps the original URL and is
 * served from the shared cache instead.
 */
internal fun sourceForPlayback(remote: PlayableSource, saved: SavedEpisode?): PlayableSource {
    val file = savedLocalFile(remote, saved) ?: return remote
    return remote.copy(
        url = file.toURI().toString(),
        headers = emptyMap(),
        hls = false,
        stripBytes = 0,
        gotakuObf = null,
        flix = null,
    )
}

internal fun usesHlsCache(remote: PlayableSource, saved: SavedEpisode?): Boolean =
    readyMatch(remote, saved)?.hls == true

internal fun savedLocalFile(remote: PlayableSource, saved: SavedEpisode?): File? {
    val row = readyMatch(remote, saved) ?: return null
    if (row.hls) return null
    val path = row.localPath ?: return null
    val file = File(path)
    if (!file.isFile || file.length() <= 0L) return null
    return file
}

internal fun downloadWorkName(anilistId: Int, episode: Int): String =
    "episode-download-$anilistId-$episode"

internal fun episodeCachePrefix(anilistId: Int, episode: Int): String =
    "anikitty:$anilistId:$episode:"

internal fun progressiveFile(root: File, anilistId: Int, episode: Int, url: String): File =
    File(root, "$anilistId/$episode.${progressiveExtension(url)}")

internal fun progressiveExtension(url: String): String {
    val leaf = url.substringBefore('?').substringBefore('#').substringAfterLast('/')
    val ext = leaf.substringAfterLast('.', missingDelimiterValue = "").lowercase()
    val ok = ext.length in 1..4 &&
        ext.all { it.isLetterOrDigit() } &&
        ext != "m3u8" &&
        ext != "txt"
    return if (ok) ext else "mp4"
}

internal fun encodeHeaders(headers: Map<String, String>): String {
    val json = JSONObject()
    headers.toSortedMap().forEach { (key, value) ->
        if (key.isNotBlank()) json.put(key, value)
    }
    return json.toString()
}

internal fun decodeHeaders(raw: String): Map<String, String> {
    if (raw.isBlank()) return emptyMap()
    return try {
        val json = JSONObject(raw)
        buildMap {
            val keys = json.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                put(key, json.optString(key))
            }
        }
    } catch (_: Exception) {
        emptyMap()
    }
}

/** Messages we wrote ourselves. Anything else becomes a generic failure. */
internal class DownloadRejectedException(message: String) : Exception(message)

internal fun downloadErrorMessage(error: Throwable): String = when (error) {
    is DownloadRejectedException -> error.message ?: "Couldn't save this episode"
    else -> "Couldn't save this episode"
}

internal fun httpFailure(code: Int): String = when (code) {
    401, 403 -> "The source refused the download"
    else -> "Couldn't save this episode"
}

private fun readyMatch(remote: PlayableSource, saved: SavedEpisode?): SavedEpisode? {
    val row = saved ?: return null
    if (row.phase != DownloadPhase.READY || row.url != remote.url) return null
    return row
}

internal fun EpisodeDownloadEntity.toSaved(): SavedEpisode = SavedEpisode(
    anilistId = anilistId,
    episode = episode,
    url = url,
    hls = hls,
    phase = runCatching { DownloadPhase.valueOf(phase) }.getOrDefault(DownloadPhase.FAILED),
    progressPercent = progressPercent.coerceIn(0, 100),
    localPath = localPath,
    error = error,
)
