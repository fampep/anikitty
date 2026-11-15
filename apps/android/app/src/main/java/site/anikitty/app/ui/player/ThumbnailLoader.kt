// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.player

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import site.anikitty.app.data.servers.ThumbnailTrack
import java.util.concurrent.TimeUnit

/**
 * Loads a thumbnail VTT and its sprite sheets off the playback thread.
 * A missing track, a failed fetch, or a local file with no cheap frame
 * leaves the caller with a time bubble only.
 */
internal class ThumbnailLoader(
    context: Context,
    private val track: ThumbnailTrack?,
    private val mediaUrl: String?,
) {
    private val app = context.applicationContext
    private val gate = Mutex()
    private var cues: List<ThumbnailCue> = emptyList()
    private var indexed = false
    private var retryAtMs = 0L
    private val sprites = object : android.util.LruCache<String, Sprite>(4) {}
    private val localFrames = object : android.util.LruCache<Long, Bitmap>(6) {}

    suspend fun frame(positionMs: Long): Bitmap? = withContext(Dispatchers.IO) {
        ensureIndex()
        val cue = cueAt(cues, positionMs)
        if (cue != null) return@withContext crop(cue)
        localFrame(positionMs)
    }

    private suspend fun ensureIndex() {
        if (indexed) return
        val now = android.os.SystemClock.elapsedRealtime()
        if (now < retryAtMs) return
        gate.withLock {
            if (indexed) return
            if (android.os.SystemClock.elapsedRealtime() < retryAtMs) return
            val source = track ?: run {
                indexed = true
                return
            }
            val text = fetchText(source.url, source.headers)
            if (text == null) {
                retryAtMs = android.os.SystemClock.elapsedRealtime() + 2_000L
                return
            }
            cues = parseThumbnailVtt(text, source.url)
            indexed = true
        }
    }

    private fun crop(cue: ThumbnailCue): Bitmap? {
        val sprite = sprites.get(cue.spriteUrl) ?: loadSprite(cue.spriteUrl) ?: return null
        if (cue.w <= 0 || cue.h <= 0) return sprite.bitmap
        val sample = sprite.sample.coerceAtLeast(1)
        val x = (cue.x / sample).coerceIn(0, (sprite.bitmap.width - 1).coerceAtLeast(0))
        val y = (cue.y / sample).coerceIn(0, (sprite.bitmap.height - 1).coerceAtLeast(0))
        val w = (cue.w / sample).coerceAtMost(sprite.bitmap.width - x).coerceAtLeast(1)
        val h = (cue.h / sample).coerceAtMost(sprite.bitmap.height - y).coerceAtLeast(1)
        return runCatching { Bitmap.createBitmap(sprite.bitmap, x, y, w, h) }.getOrNull()
    }

    private fun loadSprite(url: String): Sprite? {
        val bytes = fetchBytes(url, track?.headers.orEmpty()) ?: return null
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
        var sample = 1
        while (bounds.outWidth / sample > 1280 || bounds.outHeight / sample > 1280) sample *= 2
        val opts = BitmapFactory.Options().apply { inSampleSize = sample }
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, opts) ?: return null
        val sprite = Sprite(bitmap, sample)
        sprites.put(url, sprite)
        return sprite
    }

    /** One nearby keyframe for a local file. Network streams are left alone. */
    private fun localFrame(positionMs: Long): Bitmap? {
        val url = mediaUrl ?: return null
        if (!url.startsWith("file:") && !url.startsWith("content:")) return null
        val bucket = positionMs.coerceAtLeast(0L) / 5_000L
        localFrames.get(bucket)?.let { return it }
        val retriever = MediaMetadataRetriever()
        val frame = try {
            if (url.startsWith("content:")) {
                retriever.setDataSource(app, Uri.parse(url))
            } else {
                retriever.setDataSource(url.removePrefix("file://"))
            }
            retriever.getFrameAtTime(
                positionMs.coerceAtLeast(0L) * 1_000L,
                MediaMetadataRetriever.OPTION_CLOSEST_SYNC,
            )
        } catch (_: RuntimeException) {
            null
        } finally {
            runCatching { retriever.release() }
        } ?: return null
        val scaled = if (frame.width > 320) {
            val height = (320f / frame.width * frame.height).toInt().coerceAtLeast(1)
            Bitmap.createScaledBitmap(frame, 320, height, true)
        } else {
            frame
        }
        localFrames.put(bucket, scaled)
        return scaled
    }

    private fun fetchText(url: String, headers: Map<String, String>): String? {
        val bytes = fetchBytes(url, headers, limit = 1_000_000) ?: return null
        return runCatching { bytes.toString(Charsets.UTF_8) }.getOrNull()
    }

    private fun fetchBytes(url: String, headers: Map<String, String>, limit: Int = 8_000_000): ByteArray? {
        val request = Request.Builder().url(url).apply {
            headers.forEach { (name, value) ->
                if (name.isNotBlank() && value.isNotBlank()) header(name, value)
            }
        }.build()
        return try {
            http.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return null
                val body = response.body ?: return null
                val stream = body.byteStream()
                val buffer = java.io.ByteArrayOutputStream()
                val chunk = ByteArray(16 * 1024)
                var total = 0
                while (true) {
                    val read = stream.read(chunk)
                    if (read < 0) break
                    total += read
                    if (total > limit) return null
                    buffer.write(chunk, 0, read)
                }
                buffer.toByteArray()
            }
        } catch (_: Exception) {
            null
        }
    }

    private data class Sprite(val bitmap: Bitmap, val sample: Int)

    private companion object {
        val http: OkHttpClient = OkHttpClient.Builder()
            .connectTimeout(6, TimeUnit.SECONDS)
            .readTimeout(8, TimeUnit.SECONDS)
            .callTimeout(10, TimeUnit.SECONDS)
            .followRedirects(true)
            .build()
    }
}
