// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.cast

import android.content.Context
import android.net.wifi.WifiManager
import android.os.Handler
import android.os.Looper
import androidx.annotation.OptIn
import androidx.media3.cast.CastPlayer
import androidx.media3.cast.DefaultMediaItemConverter
import androidx.media3.cast.MediaItemConverter
import androidx.media3.cast.SessionAvailabilityListener
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
import com.google.android.gms.cast.HlsSegmentFormat
import com.google.android.gms.cast.HlsVideoSegmentFormat
import com.google.android.gms.cast.MediaInfo
import com.google.android.gms.cast.MediaQueueItem
import com.google.android.gms.cast.framework.CastContext
import site.anikitty.app.data.servers.PlayableSource
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import kotlin.concurrent.thread

/**
 * Plays through a phone-side relay so the Chromecast receives a clean stream.
 * Returns null when Play Services / Cast is unavailable.
 */
@OptIn(UnstableApi::class)
class CastSessionHelper private constructor(
    val castPlayer: CastPlayer,
    private val relay: CastRelay,
    private val multicast: WifiManager.MulticastLock?,
) {
    var casting: Boolean = false
        private set

    private val main = Handler(Looper.getMainLooper())
    private val generation = AtomicInteger(0)
    private val closed = AtomicBoolean(false)

    fun setAvailabilityListener(listener: SessionAvailabilityListener?) {
        castPlayer.setSessionAvailabilityListener(listener)
    }

    fun load(
        source: PlayableSource,
        title: String,
        episode: Int,
        positionMs: Long,
        onReady: () -> Unit,
        onError: (String) -> Unit,
    ) {
        val ticket = generation.incrementAndGet()
        thread(name = "anikitty-cast-load", isDaemon = true) {
            val prepared = runCatching { relay.prepare(source) }
            main.post {
                if (closed.get() || ticket != generation.get()) return@post
                prepared.fold(
                    onSuccess = { playback ->
                        runCatching { start(playback, title, episode, positionMs) }
                            .onSuccess { onReady() }
                            .onFailure {
                                relay.stop()
                                onError(it.message ?: "Cast failed")
                            }
                    },
                    onFailure = {
                        relay.stop()
                        onError(it.message ?: "Cast failed")
                    },
                )
            }
        }
    }

    private fun start(playback: RelayPlayback, title: String, episode: Int, positionMs: Long) {
        relay.publish(playback)
        val subs = playback.subtitles.mapIndexed { index, track ->
            MediaItem.SubtitleConfiguration.Builder(android.net.Uri.parse(track.url))
                .setMimeType(MimeTypes.TEXT_VTT)
                .setLanguage(track.language ?: "en")
                .setLabel(track.label)
                .setSelectionFlags(if (index == 0) C.SELECTION_FLAG_DEFAULT else 0)
                .build()
        }
        val item = MediaItem.Builder()
            .setUri(playback.url)
            .setMimeType(
                if (playback.mimeType.contains("mpegurl", ignoreCase = true)) {
                    MimeTypes.APPLICATION_M3U8
                } else {
                    MimeTypes.VIDEO_MP4
                },
            )
            .setMediaMetadata(
                MediaMetadata.Builder()
                    .setTitle(title)
                    .setArtist("Episode $episode")
                    .build(),
            )
            .setSubtitleConfigurations(subs)
            .build()
        castPlayer.setMediaItem(item, positionMs.coerceAtLeast(0L))
        castPlayer.prepare()
        castPlayer.playWhenReady = true
        casting = true
    }

    fun stopCasting() {
        generation.incrementAndGet()
        runCatching { castPlayer.stop() }
        relay.stop()
        casting = false
    }

    fun release() {
        closed.set(true)
        generation.incrementAndGet()
        setAvailabilityListener(null)
        runCatching { castPlayer.release() }
        relay.stop()
        runCatching { multicast?.release() }
        casting = false
    }

    companion object {
        fun create(context: Context): CastSessionHelper? = runCatching {
            val app = context.applicationContext
            val castContext = CastContext.getSharedInstance(app)
            val castPlayer = CastPlayer(castContext, RelayMediaItemConverter())
            val wifi = app.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            val multicast = wifi?.createMulticastLock("anikitty-cast-discover")?.apply {
                setReferenceCounted(false)
                acquire()
            }
            CastSessionHelper(castPlayer, CastRelay(app), multicast)
        }.getOrNull()
    }
}

@OptIn(UnstableApi::class)
private class RelayMediaItemConverter : MediaItemConverter {
    private val fallback = DefaultMediaItemConverter()

    override fun toMediaQueueItem(mediaItem: MediaItem): MediaQueueItem {
        val local = mediaItem.localConfiguration ?: return fallback.toMediaQueueItem(mediaItem)
        val raw = local.uri.toString()
        val hls = local.mimeType?.contains("mpegurl", ignoreCase = true) == true || raw.contains(".m3u8", ignoreCase = true)
        if (!hls) return fallback.toMediaQueueItem(mediaItem)
        val contentUrl = raw.substringBefore('?')
        val fmp4 = raw.contains("pack=fmp4")
        val metadata = com.google.android.gms.cast.MediaMetadata(
            com.google.android.gms.cast.MediaMetadata.MEDIA_TYPE_MOVIE,
        ).apply {
            putString(
                com.google.android.gms.cast.MediaMetadata.KEY_TITLE,
                mediaItem.mediaMetadata.title?.toString().orEmpty(),
            )
            putString(
                com.google.android.gms.cast.MediaMetadata.KEY_SUBTITLE,
                mediaItem.mediaMetadata.artist?.toString().orEmpty(),
            )
        }
        val info = MediaInfo.Builder(contentUrl)
            .setContentUrl(contentUrl)
            .setStreamType(MediaInfo.STREAM_TYPE_BUFFERED)
            .setContentType("application/x-mpegURL")
            .setMetadata(metadata)
            .setHlsSegmentFormat(if (fmp4) HlsSegmentFormat.FMP4 else HlsSegmentFormat.TS)
            .setHlsVideoSegmentFormat(
                if (fmp4) HlsVideoSegmentFormat.FMP4 else HlsVideoSegmentFormat.MPEG2_TS,
            )
            .build()
        return MediaQueueItem.Builder(info).build()
    }

    override fun toMediaItem(mediaQueueItem: MediaQueueItem): MediaItem = fallback.toMediaItem(mediaQueueItem)
}
