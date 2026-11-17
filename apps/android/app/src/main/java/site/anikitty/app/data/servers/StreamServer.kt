// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import androidx.compose.runtime.Immutable
import site.anikitty.app.data.skip.SkipTimes

/**
 * A selectable stream source — bundled or a user-installed HTTP extension.
 *
 * Phone obtains a playable **request URL** (+ headers). HLS download /
 * bandwidth / playback stay on-device (Media3). The dedicated Go auth server
 * never carries stream bytes.
 */
data class StreamServer(
    val id: String,
    val name: String,
    val description: String,
    /** Site / brand icon (favicon or app icon URL). Required for store extensions. */
    val iconUrl: String? = null,
    /** Origin site the resolver scrapes / fronts (for attribution in the Store). */
    val siteUrl: String? = null,
)

data class SubtitleTrack(
    val url: String,
    val label: String,
    val language: String? = null,
    val mimeType: String? = null,
) {
    /** Absolute http, file, or content URI the player can open. Relative paths stay unset. */
    fun playableUri(): android.net.Uri? {
        val trimmed = url.trim()
        if (trimmed.isEmpty()) return null
        return when {
            trimmed.startsWith("https://", ignoreCase = true) ||
                trimmed.startsWith("http://", ignoreCase = true) ||
                trimmed.startsWith("file:", ignoreCase = true) ||
                trimmed.startsWith("content:", ignoreCase = true) -> android.net.Uri.parse(trimmed)
            trimmed.startsWith("/") -> android.net.Uri.fromFile(java.io.File(trimmed))
            else -> null
        }
    }

    /** MIME for sidecar captions. Declared type wins, then the URL suffix. */
    fun resolvedMime(): String {
        mimeType?.takeIf { it.isNotBlank() }?.let { return it }
        val probe = url.lowercase()
        return when {
            ".srt" in probe -> "application/x-subrip"
            ".ass" in probe || ".ssa" in probe -> "text/x-ssa"
            else -> "text/vtt"
        }
    }
}

@Immutable
data class PlayableSource(
    val url: String,
    val headers: Map<String, String> = emptyMap(),
    val label: String = "Stream",
    /** MegaPlay PNG-disguise unwrap size for HLS segments (0 = none). */
    val stripBytes: Int = SegmentStripDataSource.DEFAULT_STRIP_BYTES,
    val subtitles: List<SubtitleTrack> = emptyList(),
    /** Gotaku playlist/segment unwrap; when set, [GotakuObfDataSource] handles CDN crypto. */
    val gotakuObf: GotakuObf? = null,
    /** Intro / credits from the anime site that supplied this source. Empty when unknown. */
    val skip: SkipTimes = SkipTimes(),
    /** Resolver-reported picture size, e.g. "1080p" or "4K". Null when unknown. */
    val quality: String? = null,
    /** Resolver-reported audio, e.g. "AAC 2.0 · SUB". Null when unknown. */
    val audio: String? = null,
    /** Resolver-reported grade, e.g. "HD". Null when the source did not give one. */
    val qualityRating: String? = null,
    /** FlixCloud playlist key and segment mask. Null for every other source. */
    val flix: FlixUnwrap? = null,
    /** Sprite-sheet WebVTT for the seek preview. Null when the source has none. */
    val thumbnails: ThumbnailTrack? = null,
    /**
     * True when [url] is an HLS playlist whose path is not `.m3u8`.
     * AnimeX names the master `deeznuts.txt`.
     */
    val hls: Boolean = false,
)

/** Thumbnail VTT plus the headers its sprite sheets require. */
@Immutable
data class ThumbnailTrack(
    val url: String,
    val headers: Map<String, String> = emptyMap(),
)

/** Keys Media3 needs to turn a FlixCloud response into a normal HLS stream. */
data class FlixUnwrap(
    val playlistKey: String,
    val segmentMask: String,
    val englishAudio: Boolean,
)

interface StreamResolver {
    val server: StreamServer

    /**
     * Resolve a direct playable URL on-device / via extension HTTP.
     * @param titleHint AniList / display title to help map the watch page.
     */
    suspend fun resolve(
        anilistId: Int,
        episode: Int,
        audio: String = "sub",
        titleHint: String? = null,
    ): List<PlayableSource>
}

/** Outcome of [ServerCatalog.resolveWithFailover] across installed providers. */
data class ResolveFailoverResult(
    val sources: List<PlayableSource>,
    val server: StreamServer,
    /** True when a provider other than the previously selected one won. */
    val usedFallback: Boolean,
    val attempted: List<String> = emptyList(),
)
