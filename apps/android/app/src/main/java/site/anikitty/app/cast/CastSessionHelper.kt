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
import com.google.android.gms.cast.MediaTrack
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
    private val captionsEnabled: AtomicBoolean,
    private val captionLanguage: java.util.concurrent.atomic.AtomicReference<String?>,
    private val captionLabel: java.util.concurrent.atomic.AtomicReference<String?>,
) {
    var casting: Boolean = false
        private set

    private val main = Handler(Looper.getMainLooper())
    private val generation = AtomicInteger(0)
    /** Applied again inside each Cast load, before playback starts. */
    @Volatile var heldVolume: Float = 1f
    /** Last TV speaker level, 0–1. Separate from the muted stream flag. */
    @Volatile var heldDeviceVolume: Float = 1f
    /** Ignore a stale session read while a swipe is still landing. */
    private var lastDeviceVolumeWriteMs: Long = 0L
    /** Captions preference mirrored onto the remote [MediaTrack] after load. */
    var heldSubtitlesOn: Boolean
        get() = captionsEnabled.get()
        set(value) { captionsEnabled.set(value) }
    var heldSubtitleLanguage: String?
        get() = captionLanguage.get()
        set(value) { captionLanguage.set(value) }
    var heldSubtitleLabel: String?
        get() = captionLabel.get()
        set(value) { captionLabel.set(value) }

    private val closed = AtomicBoolean(false)
    private val loadSettled = AtomicBoolean(false)
    private val endedNotified = AtomicBoolean(false)
    private var statusCallback: RemoteMediaClient.Callback? = null
    private var playbackEndedListener: (() -> Unit)? = null

    /** Fires once per load when the receiver finishes the current item. */
    fun setPlaybackEndedListener(listener: (() -> Unit)?) {
        playbackEndedListener = listener
    }

    fun setAvailabilityListener(listener: SessionAvailabilityListener?) {
        castPlayer.setSessionAvailabilityListener(listener)
    }

    /**
     * Move the Chromecast speaker volume. Returns the new level, 0–1.
     * A swipe must not change the phone's media stream while the TV is playing.
     */
    fun adjustDeviceVolume(delta: Float): Float {
        val session = castContext.sessionManager.currentCastSession
        val now = android.os.SystemClock.uptimeMillis()
        val sessionLevel = session?.let { runCatching { it.volume.toFloat() }.getOrNull() }
            ?.takeIf { it.isFinite() }
            ?.coerceIn(0f, 1f)
        val current = if (sessionLevel != null && now - lastDeviceVolumeWriteMs > 400L) {
            sessionLevel
        } else {
            heldDeviceVolume
        }
        val next = castVolumeAfterNudge(current, delta)
        heldDeviceVolume = next
        if (session != null && next != current) {
            lastDeviceVolumeWriteMs = now
            // setVolume throws IOException, so it is not a Kotlin property setter.
            runCatching { session.setVolume(next.toDouble()) }
            if (delta > 0.012f && runCatching { session.isMute }.getOrDefault(false)) {
                runCatching { session.setMute(false) }
                heldVolume = 1f
                castPlayer.volume = 1f
            }
        }
        return next
    }

    /** Mute the TV stream without changing the remembered speaker level. */
    fun setTvMuted(muted: Boolean) {
        val session = castContext.sessionManager.currentCastSession
        runCatching { session?.setMute(muted) }
        heldVolume = if (muted) 0f else 1f
        castPlayer.volume = heldVolume
    }

    /**
     * Turn captions on/off on the Chromecast, or pick a language/label.
     * Safe to call before the first load — preference is held for the next one.
     */
    fun applySubtitles(
        enabled: Boolean,
        language: String? = null,
        label: String? = null,
    ) {
        heldSubtitlesOn = enabled
        heldSubtitleLanguage = language
        heldSubtitleLabel = label
        if (!casting) return
        pushActiveTextTracks()
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
        val preferLang = heldSubtitleLanguage
        val preferLabel = heldSubtitleLabel
        val subs = playback.subtitles.mapIndexed { index, track ->
            val default = when {
                preferLang != null &&
                    track.language?.trim()?.lowercase()?.substringBefore('-') ==
                    preferLang.trim().lowercase().substringBefore('-') -> true
                preferLabel != null && track.label.equals(preferLabel, ignoreCase = true) -> true
                preferLang == null && preferLabel == null && index == 0 -> true
                else -> false
            }
            MediaItem.SubtitleConfiguration.Builder(android.net.Uri.parse(track.url))
                .setMimeType(MimeTypes.TEXT_VTT)
                .apply {
                    track.language?.trim()?.takeIf { it.isNotEmpty() }?.let { setLanguage(it) }
                }
                .setLabel(track.label)
                .setSelectionFlags(if (default) C.SELECTION_FLAG_DEFAULT else 0)
                .build()
        }.let { list ->
            // Always mark one default when captions stay on and nothing matched.
            if (heldSubtitlesOn && list.isNotEmpty() && list.none {
                    (it.selectionFlags and C.SELECTION_FLAG_DEFAULT) != 0
                }
            ) {
                list.mapIndexed { index, config ->
                    if (index != 0) {
                        config
                    } else {
                        MediaItem.SubtitleConfiguration.Builder(config.uri)
                            .setMimeType(config.mimeType ?: MimeTypes.TEXT_VTT)
                            .setLanguage(config.language)
                            .setLabel(config.label)
                            .setSelectionFlags(C.SELECTION_FLAG_DEFAULT)
                            .build()
                    }
                }
            } else {
                list
            }
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
        Log.i(
            TAG,
            "Cast load requested ${playback.url} subs=${subs.size} captions=${heldSubtitlesOn}",
        )
    }

    private fun pushActiveTextTracks() {
        val client = castContext.sessionManager.currentCastSession?.remoteMediaClient ?: return
        val status = client.mediaStatus ?: return
        val info = status.mediaInfo ?: return
        val all = info.mediaTracks?.toList().orEmpty()
        val text = all.filter { it.type == MediaTrack.TYPE_TEXT }
        if (text.isEmpty()) return
        val chosen = castPickTextTrackId(
            tracks = text,
            enabled = heldSubtitlesOn,
            preferLanguage = heldSubtitleLanguage,
            preferLabel = heldSubtitleLabel,
        )
        // Keep any non-text active ids (audio) the receiver may already have.
        val keep = status.activeTrackIds
            ?.filter { id -> text.none { it.id == id } }
            .orEmpty()
        val next = (keep + chosen.toList()).distinct().toLongArray()
        runCatching { client.setActiveMediaTracks(next) }
            .onFailure { Log.w(TAG, "Cast subtitle select failed", it) }
        Log.i(TAG, "Cast captions active=${next.toList()} on=${heldSubtitlesOn}")
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
        endedNotified.set(false)
        statusCallback?.let { previous -> runCatching { client.unregisterCallback(previous) } }
        var baselineIdle = true
        var sawPlayback = false
        val callback = object : RemoteMediaClient.Callback() {
            override fun onStatusUpdated() {
                if (closed.get() || ticket != generation.get()) return
                val status = client.mediaStatus ?: return
                val started = status.playerState == MediaStatus.PLAYER_STATE_PLAYING ||
                    status.playerState == MediaStatus.PLAYER_STATE_BUFFERING ||
                    status.playerState == MediaStatus.PLAYER_STATE_PAUSED
                if (started) sawPlayback = true
                if (loadSettled.get()) {
                    // A leftover IDLE_REASON_FINISHED from the previous item is
                    // still the current status until this load leaves idle.
                    if (sawPlayback && castPlaybackFinished(status.playerState, status.idleReason)) {
                        notifyPlaybackEnded(ticket)
                    }
                    return
                }
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

    private fun notifyPlaybackEnded(ticket: Int) {
        if (!endedNotified.compareAndSet(false, true)) return
        Log.i(TAG, "Cast item finished")
        main.post {
            // A newer load owns the session. Do not end that episode.
            if (ticket != generation.get() || closed.get()) return@post
            playbackEndedListener?.invoke()
        }
    }

    private fun settleReady(onReady: () -> Unit) {
        if (!loadSettled.compareAndSet(false, true)) return
        casting = true
        Log.i(TAG, "Cast playback started")
        // Receiver may ignore queue-item activeTrackIds on the first load.
        main.post {
            pushActiveTextTracks()
            onReady()
        }
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
        setPlaybackEndedListener(null)
        runCatching { castPlayer.release() }
        relay.stop()
        runCatching { multicast?.release() }
        casting = false
    }

    companion object {
        fun create(context: Context): CastSessionHelper? = runCatching {
            val app = context.applicationContext
            val castContext = CastContext.getSharedInstance(app)
            val captionsEnabled = AtomicBoolean(true)
            val captionLanguage = java.util.concurrent.atomic.AtomicReference<String?>(null)
            val captionLabel = java.util.concurrent.atomic.AtomicReference<String?>(null)
            val castPlayer = CastPlayer(
                castContext,
                RelayMediaItemConverter(captionsEnabled, captionLanguage, captionLabel),
            )
            val wifi = app.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            val multicast = wifi?.createMulticastLock("anikitty-cast-discover")?.apply {
                setReferenceCounted(false)
                acquire()
            }
            CastSessionHelper(
                castContext,
                castPlayer,
                CastRelay(app),
                multicast,
                captionsEnabled,
                captionLanguage,
                captionLabel,
            )
        }.getOrNull()
    }
}

@OptIn(UnstableApi::class)
private class RelayMediaItemConverter(
    private val captionsEnabled: AtomicBoolean,
    private val captionLanguage: java.util.concurrent.atomic.AtomicReference<String?>,
    private val captionLabel: java.util.concurrent.atomic.AtomicReference<String?>,
) : MediaItemConverter {
    private val fallback = DefaultMediaItemConverter()

    override fun toMediaQueueItem(mediaItem: MediaItem): MediaQueueItem {
        val local = mediaItem.localConfiguration ?: return fallback.toMediaQueueItem(mediaItem)
        val raw = local.uri.toString()
        val hls = local.mimeType?.contains("mpegurl", ignoreCase = true) == true ||
            raw.contains(".m3u8", ignoreCase = true)
        val tracks = castTextTracks(local.subtitleConfigurations)
        val active = castActiveTextTrackIds(
            configs = local.subtitleConfigurations,
            tracks = tracks,
            enabled = captionsEnabled.get() && tracks.isNotEmpty(),
            preferLanguage = captionLanguage.get(),
            preferLabel = captionLabel.get(),
        )
        // Progressive mp4 still goes through the stock converter — but we must
        // attach WebVTT MediaTracks ourselves for HLS, because the custom
        // MediaInfo path used to drop every SubtitleConfiguration.
        if (!hls) {
            val stock = fallback.toMediaQueueItem(mediaItem)
            val stockInfo = stock.media ?: return stock
            if (tracks.isEmpty()) return stock
            val info = MediaInfo.Builder(stockInfo.contentId)
                .setContentUrl(stockInfo.contentUrl ?: stockInfo.contentId)
                .setStreamType(stockInfo.streamType)
                .setContentType(stockInfo.contentType)
                .setMetadata(stockInfo.metadata)
                .setStreamDuration(stockInfo.streamDuration)
                .setMediaTracks(tracks)
                .build()
            return MediaQueueItem.Builder(info).setActiveTrackIds(active).build()
        }
        val content = castRelayContent(raw)
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
        val info = MediaInfo.Builder(content.url)
            .setContentUrl(content.url)
            .setStreamType(MediaInfo.STREAM_TYPE_BUFFERED)
            .setContentType("application/x-mpegURL")
            .setMetadata(metadata)
            .setMediaTracks(tracks)
            .apply {
                when (content.pack) {
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
        return MediaQueueItem.Builder(info).setActiveTrackIds(active).build()
    }

    override fun toMediaItem(mediaQueueItem: MediaQueueItem): MediaItem = fallback.toMediaItem(mediaQueueItem)
}

/**
 * While casting, the activity sends volume keys here instead of the phone stream.
 * Direction is 1 for up, -1 for down, and 0 for the mute key.
 */
internal object CastHardwareVolume {
    @Volatile
    var onStep: ((direction: Int) -> Boolean)? = null
}

private const val TAG = "AniKittyCast"
