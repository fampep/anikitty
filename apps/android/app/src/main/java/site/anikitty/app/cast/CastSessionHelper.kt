// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.cast

import android.content.Context
import android.net.wifi.WifiManager
import android.os.Handler
import android.os.Looper
import androidx.annotation.OptIn
import androidx.media3.cast.CastPlayer
import androidx.media3.cast.SessionAvailabilityListener
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
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
            val castPlayer = CastPlayer(castContext)
            val wifi = app.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            val multicast = wifi?.createMulticastLock("anikitty-cast-discover")?.apply {
                setReferenceCounted(false)
                acquire()
            }
            CastSessionHelper(castPlayer, CastRelay(app), multicast)
        }.getOrNull()
    }
}
