// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.cast

import android.content.Context
import android.net.wifi.WifiManager
import android.os.Handler
import android.os.Looper
import android.util.Log
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
import com.google.android.gms.cast.MediaError
import com.google.android.gms.cast.MediaInfo
import com.google.android.gms.cast.MediaQueueItem
import com.google.android.gms.cast.MediaStatus
import com.google.android.gms.cast.framework.CastContext
import com.google.android.gms.cast.framework.media.RemoteMediaClient
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
    private val castContext: CastContext,
    val castPlayer: CastPlayer,
    private val relay: CastRelay,
    private val multicast: WifiManager.MulticastLock?,
) {
    var casting: Boolean = false
        private set

    private val main = Handler(Looper.getMainLooper())
    private val generation = AtomicInteger(0)
    /** Applied again inside each Cast load, before playback starts. */
    @Volatile var heldVolume: Float = 1f

    private val closed = AtomicBoolean(false)
    private val loadSettled = AtomicBoolean(false)
    private var statusCallback: RemoteMediaClient.Callback? = null

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
                        runCatching { start(playback, title, episode, positionMs, ticket, onReady, onError) }
                            .onFailure {
                                relay.stop()
                                Log.w(TAG, "Cast prepare failed", it)
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

    private fun start(
        playback: RelayPlayback,
        title: String,
        episode: Int,
        positionMs: Long,
        ticket: Int,
        onReady: () -> Unit,
        onError: (String) -> Unit,
    ) {
        relay.publish(playback)
        val client = castContext.sessionManager.currentCastSession?.remoteMediaClient
            ?: error("Chromecast is not connected")
        watchLoad(client, ticket, onReady, onError)
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
        castPlayer.volume = heldVolume
        castPlayer.playWhenReady = true
        Log.i(TAG, "Cast load requested ${playback.url}")
    }

    /**
     * Media3 1.5 [CastPlayer.getPlayerError] is always null, so a receiver that
     * rejects the load never reaches [androidx.media3.common.Player.Listener].
     * The first idle status is the session before this load and is ignored.
     */
    private fun watchLoad(
        client: RemoteMediaClient,
        ticket: Int,
        onReady: () -> Unit,
        onError: (String) -> Unit,
    ) {
        loadSettled.set(false)
        statusCallback?.let { previous -> runCatching { client.unregisterCallback(previous) } }
        var baselineIdle = true
        val callback = object : RemoteMediaClient.Callback() {
            override fun onStatusUpdated() {
                if (closed.get() || ticket != generation.get() || loadSettled.get()) return
                val status = client.mediaStatus ?: return
                if (baselineIdle && status.playerState == MediaStatus.PLAYER_STATE_IDLE) {
                    baselineIdle = false
                    return
                }
                baselineIdle = false
                when (status.playerState) {
                    MediaStatus.PLAYER_STATE_PLAYING,
                    MediaStatus.PLAYER_STATE_BUFFERING,
                    MediaStatus.PLAYER_STATE_PAUSED,
                    -> settleReady(onReady)
                    MediaStatus.PLAYER_STATE_IDLE -> {
                        if (status.idleReason == MediaStatus.IDLE_REASON_ERROR) {
                            settleError(onError, "Chromecast could not play this stream")
                        }
                    }
                }
            }

            override fun onMediaError(error: MediaError) {
                if (closed.get() || ticket != generation.get()) return
                val detail = listOfNotNull(error.type, error.reason).joinToString(" ").ifBlank {
                    "Chromecast could not play this stream"
                }
                Log.w(TAG, "Cast media error type=${error.type} reason=${error.reason} code=${error.detailedErrorCode}")
                settleError(onError, detail)
            }
        }
        statusCallback = callback
        client.registerCallback(callback)
    }

    private fun settleReady(onReady: () -> Unit) {
        if (!loadSettled.compareAndSet(false, true)) return
        casting = true
        Log.i(TAG, "Cast playback started")
        main.post(onReady)
    }

    private fun settleError(onError: (String) -> Unit, message: String) {
        if (!loadSettled.compareAndSet(false, true)) return
        casting = false
        Log.w(TAG, "Cast load failed: $message")
        relay.stop()
        main.post { onError(message) }
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
            CastSessionHelper(castContext, castPlayer, CastRelay(app), multicast)
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
        val pack = raw.substringAfter("pack=", "").substringBefore('&').takeIf { it == "ts" || it == "fmp4" }
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
            .apply {
                when (pack) {
                    "fmp4" -> {
                        setHlsSegmentFormat(HlsSegmentFormat.FMP4)
                        setHlsVideoSegmentFormat(HlsVideoSegmentFormat.FMP4)
                    }
                    "ts" -> {
                        setHlsSegmentFormat(HlsSegmentFormat.TS)
                        setHlsVideoSegmentFormat(HlsVideoSegmentFormat.MPEG2_TS)
                    }
                }
            }
            .build()
        return MediaQueueItem.Builder(info).build()
    }

    override fun toMediaItem(mediaQueueItem: MediaQueueItem): MediaItem = fallback.toMediaItem(mediaQueueItem)
}

private const val TAG = "AniKittyCast"
