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
internal const val DOWNLOAD_CANCEL_ACTION = "site.anikitty.app.download.CANCEL"

internal fun downloadNotificationId(anilistId: Int, episode: Int): Int {
    val mixed = (anilistId * 31 + episode) and 0x7fffffff
    return 20_000 + (mixed % 10_000)
}

/** A notification Cancel removes a save that has not finished. A saved file stays. */
internal fun downloadCancelRemovesRow(phase: String): Boolean =
    phase == DownloadPhase.QUEUED.name || phase == DownloadPhase.RUNNING.name

internal enum class DownloadPhase { QUEUED, RUNNING, READY, FAILED }

/** A saved episode the player can use without Room or WorkManager. */
internal data class SavedEpisode(
    val anilistId: Int,
    val episode: Int,
    val sourceKey: String,
    val url: String,
    val headers: Map<String, String>,
    val hls: Boolean,
    val phase: DownloadPhase,
    val progressPercent: Int,
    val localPath: String?,
    val error: String?,
    /** `v{variant}a{audio}` when the save kept one rendition. Null means the whole playlist. */
    val hlsStreams: String? = null,
)

internal data class DownloadStatus(
    val label: String,
    val canStart: Boolean,
    val canRemove: Boolean,
    /** Shown beside the status while a save can be stopped or deleted. */
    val removeLabel: String = "Remove",
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

/**
 * Identity of a source that survives a signed CDN URL rotating its query string.
 * The path, label, and reported quality stay; the token does not.
 */
internal fun sourceKey(source: PlayableSource): String {
    val stableUrl = source.url.substringBefore('?').substringBefore('#')
    return listOf(
        source.label,
        source.quality.orEmpty(),
        source.audio.orEmpty(),
        source.audioLanguage.orEmpty(),
        stableUrl,
    ).joinToString("\u0001")
}

internal fun savedMatches(saved: SavedEpisode, source: PlayableSource): Boolean =
    saved.sourceKey == sourceKey(source)

internal fun downloadStatus(source: PlayableSource, saved: SavedEpisode?): DownloadStatus {
    val blocked = offlineBlockReason(source)
    if (blocked != null) return DownloadStatus(blocked, canStart = false, canRemove = false)
    val row = saved?.takeIf { savedMatches(it, source) }
        ?: return DownloadStatus("Download", canStart = true, canRemove = false)
    return when (row.phase) {
        DownloadPhase.QUEUED -> DownloadStatus(
            "Queued",
            canStart = false,
            canRemove = true,
            removeLabel = "Cancel",
        )
        DownloadPhase.RUNNING -> DownloadStatus(
            label = if (row.progressPercent <= 0) "Saving…" else "Saving ${row.progressPercent}%",
            canStart = false,
            canRemove = true,
            removeLabel = "Cancel",
        )
        DownloadPhase.READY -> DownloadStatus("Saved", canStart = false, canRemove = true)
        DownloadPhase.FAILED -> DownloadStatus(
            label = row.error?.takeIf { it.isNotBlank() }?.let { "Retry · $it" } ?: "Retry download",
            canStart = true,
            canRemove = true,
            removeLabel = "Clear",
        )
    }
}

/**
 * Progressive saves play from the file. HLS plays the URL that was cached,
 * even when the live resolve handed back a new signature.
 *
 * [sessionStartedOffline] keeps a download that finishes during this visit
 * from restarting the player. Removing the copy, or losing the file, drops
 * back to [remote] on the next composition.
 */
internal fun playbackSavedEpisode(
    remote: PlayableSource,
    saved: SavedEpisode?,
    sessionStartedOffline: Boolean,
): SavedEpisode? {
    if (!sessionStartedOffline) return null
    val row = readyMatch(remote, saved) ?: return null
    if (row.hls) return row
    return row.takeIf { savedLocalFile(remote, row) != null }
}

/** A finished file can remember the latest signed URL without dropping the bytes. */
internal fun shouldRefreshSavedUrl(remote: PlayableSource, saved: SavedEpisode?): Boolean {
    val row = saved ?: return false
    if (row.hls || row.phase != DownloadPhase.READY) return false
    if (!savedMatches(row, remote) || row.url == remote.url) return false
    return savedLocalFile(remote, row) != null
}

internal fun sourceForPlayback(remote: PlayableSource, saved: SavedEpisode?): PlayableSource {
    val row = readyMatch(remote, saved) ?: return remote
    if (row.hls) return remote.copy(url = row.url, headers = row.headers)
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

/**
 * A progressive save writes the episode file and a `.part` beside it before
 * the row has a [SavedEpisode.localPath]. Cancelling has to delete both.
 */
internal fun progressiveLeftovers(root: File, anilistId: Int, episode: Int, url: String, hls: Boolean): List<File> {
    if (hls || anilistId <= 0 || episode < 0 || url.isBlank()) return emptyList()
    val dest = progressiveFile(root, anilistId, episode, url)
    return listOf(dest, File(dest.path + ".part"))
}

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
    if (row.phase != DownloadPhase.READY || !savedMatches(row, remote)) return null
    return row
}

/** One HLS variant. Trick-play rungs are keyframes only and are not a watchable copy. */
internal data class HlsVariantFacts(
    val height: Int,
    val bandwidth: Int,
    val audioGroupId: String?,
    val trickPlay: Boolean = false,
)

internal data class HlsAudioFacts(
    val groupId: String?,
)

/** One video rendition, plus every audio rendition in its group so language can still switch. */
internal data class HlsSavePlan(
    val variantIndex: Int,
    val audioIndices: List<Int>,
)

/**
 * Prefer the tallest rendition that is still 720p or below. When heights are
 * missing, stay under 2.5 Mbps. If every rendition is larger, keep the smallest.
 * Keyframe-only trick-play rungs are ignored. A separate audio group is saved
 * whole, not just its default language.
 */
internal fun chooseHlsSavePlan(
    variants: List<HlsVariantFacts>,
    audios: List<HlsAudioFacts>,
): HlsSavePlan? {
    val watchable = variants.withIndex().filter { !it.value.trickPlay }
    if (watchable.isEmpty()) return null
    val variantIndex = pickHlsVariantIndex(watchable)
    val group = variants[variantIndex].audioGroupId?.takeIf { it.isNotEmpty() }
    val audioIndices = if (group == null) {
        emptyList()
    } else {
        audios.indices.filter { audios[it].groupId == group }
    }
    return HlsSavePlan(variantIndex, audioIndices)
}

internal fun encodeHlsStreams(plan: HlsSavePlan): String =
    if (plan.audioIndices.isEmpty()) {
        "v${plan.variantIndex}"
    } else {
        "v${plan.variantIndex}a${plan.audioIndices.joinToString(",")}"
    }

internal fun decodeHlsStreams(raw: String?): HlsSavePlan? {
    if (raw.isNullOrBlank()) return null
    val match = HLS_STREAMS.matchEntire(raw) ?: return null
    val variant = match.groupValues[1].toIntOrNull() ?: return null
    val audio = match.groupValues[2]
    if (audio.isEmpty()) return HlsSavePlan(variant, emptyList())
    val indices = audio.split(',').map { part -> part.toIntOrNull() ?: return null }
    return HlsSavePlan(variant, indices)
}

private fun pickHlsVariantIndex(variants: List<IndexedValue<HlsVariantFacts>>): Int {
    val byHeight = variants.filter { it.value.height in 1..MAX_HLS_HEIGHT }
    if (byHeight.isNotEmpty()) return byHeight.maxBy { it.value.height }.index
    val byBandwidth = variants.filter { it.value.bandwidth in 1..MAX_HLS_BANDWIDTH }
    if (byBandwidth.isNotEmpty()) return byBandwidth.maxBy { it.value.bandwidth }.index
    return variants.minBy { facts ->
        facts.value.bandwidth.takeIf { it > 0 } ?: Int.MAX_VALUE
    }.index
}

private const val MAX_HLS_HEIGHT = 720
private const val MAX_HLS_BANDWIDTH = 2_500_000
private val HLS_STREAMS = Regex("""v(\d+)(?:a(\d+(?:,\d+)*))?""")

internal fun EpisodeDownloadEntity.toSaved(): SavedEpisode = SavedEpisode(
    anilistId = anilistId,
    episode = episode,
    sourceKey = sourceKey,
    url = url,
    headers = decodeHeaders(headersJson),
    hls = hls,
    phase = runCatching { DownloadPhase.valueOf(phase) }.getOrDefault(DownloadPhase.FAILED),
    progressPercent = progressPercent.coerceIn(0, 100),
    localPath = localPath,
    error = error,
    hlsStreams = hlsStreams,
)
