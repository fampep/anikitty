// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.cast

import androidx.media3.common.C
import androidx.media3.common.MediaItem
import com.google.android.gms.cast.MediaTrack

/**
 * Sidecar WebVTT tracks for the Default Media Receiver. Media3's
 * [MediaItem.SubtitleConfiguration] list is the source of truth; Cast needs
 * [MediaTrack] entries on [com.google.android.gms.cast.MediaInfo] or they never
 * reach the TV.
 */
internal fun castTextTracks(
    configs: List<MediaItem.SubtitleConfiguration>,
): List<MediaTrack> {
    if (configs.isEmpty()) return emptyList()
    return configs.mapIndexed { index, config ->
        val uri = config.uri?.toString().orEmpty()
        MediaTrack.Builder((index + 1L), MediaTrack.TYPE_TEXT)
            .setSubtype(MediaTrack.SUBTYPE_SUBTITLES)
            .setContentId(uri)
            .setContentType(config.mimeType?.takeIf { it.isNotBlank() } ?: "text/vtt")
            .setName(config.label?.toString()?.ifBlank { null } ?: "Subtitles")
            .apply {
                val lang = config.language?.trim()?.takeIf { it.isNotEmpty() }
                if (lang != null) setLanguage(lang)
            }
            .build()
    }
}

/**
 * Which text track IDs should start active. Empty when captions are off or
 * there are no tracks. Prefers [SELECTION_FLAG_DEFAULT], then language/label
 * hints, then the first track.
 */
internal fun castActiveTextTrackIds(
    configs: List<MediaItem.SubtitleConfiguration>,
    tracks: List<MediaTrack>,
    enabled: Boolean,
    preferLanguage: String? = null,
    preferLabel: String? = null,
): LongArray {
    if (!enabled || tracks.isEmpty()) return longArrayOf()
    val wantLang = preferLanguage?.trim()?.lowercase()?.substringBefore('-')?.takeIf { it.isNotEmpty() }
    val wantLabel = preferLabel?.trim()?.takeIf { it.isNotEmpty() }
    val defaultIndex = configs.indexOfFirst {
        (it.selectionFlags and C.SELECTION_FLAG_DEFAULT) != 0
    }.takeIf { it >= 0 }
    val byLang = if (wantLang == null) -1 else tracks.indexOfFirst { track ->
        track.language?.trim()?.lowercase()?.substringBefore('-') == wantLang
    }
    val byLabel = if (wantLabel == null) -1 else tracks.indexOfFirst { track ->
        track.name.equals(wantLabel, ignoreCase = true)
    }
    val index = when {
        // The name the user picked wins over a shared language code.
        byLabel >= 0 -> byLabel
        byLang >= 0 -> byLang
        defaultIndex != null && defaultIndex in tracks.indices -> defaultIndex
        else -> 0
    }
    return longArrayOf(tracks[index].id)
}

/**
 * Chromecast reports a finished item as idle, and Media3 [androidx.media3.cast.CastPlayer]
 * maps that to [androidx.media3.common.Player.STATE_IDLE] — never STATE_ENDED.
 * [MediaStatus.PLAYER_STATE_IDLE] is 1 and [MediaStatus.IDLE_REASON_FINISHED] is 1.
 */
internal fun castPlaybackFinished(playerState: Int, idleReason: Int): Boolean =
    playerState == 1 && idleReason == 1

/** Pick an active text-track id from the live cast session tracks. */
internal fun castPickTextTrackId(
    tracks: List<MediaTrack>,
    enabled: Boolean,
    preferLanguage: String? = null,
    preferLabel: String? = null,
): LongArray {
    val text = tracks.filter { it.type == MediaTrack.TYPE_TEXT }
    if (!enabled || text.isEmpty()) return longArrayOf()
    val wantLang = preferLanguage?.trim()?.lowercase()?.substringBefore('-')?.takeIf { it.isNotEmpty() }
    val wantLabel = preferLabel?.trim()?.takeIf { it.isNotEmpty() }
    val pick = text.firstOrNull { track ->
        wantLabel != null && track.name.equals(wantLabel, ignoreCase = true)
    } ?: text.firstOrNull { track ->
        wantLang != null && track.language?.trim()?.lowercase()?.substringBefore('-') == wantLang
    } ?: text.first()
    return longArrayOf(pick.id)
}
