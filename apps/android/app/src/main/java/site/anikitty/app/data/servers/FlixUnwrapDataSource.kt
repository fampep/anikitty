// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import android.net.Uri
import androidx.annotation.OptIn
import androidx.media3.common.C
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DataSpec
import androidx.media3.datasource.TransferListener
import java.util.Base64
import java.util.concurrent.atomic.AtomicReference

/**
 * Turns a FlixCloud response into bytes Media3 can play.
 * Playlists are XOR'd back to HLS text. WebP and PNG segments lose their
 * disguise header. Subtitles in ASS become WebVTT. The playback key never
 * leaves the phone.
 */
@OptIn(UnstableApi::class)
class FlixUnwrapDataSource(
    private val upstream: DataSource,
    private val flix: AtomicReference<FlixUnwrap?>,
) : DataSource {
    private var mode = Mode.PASSTHROUGH
    private var body: ByteArray? = null
    private var bodyPos = 0
    private var openedUri: Uri? = null

    private enum class Mode { PASSTHROUGH, BUFFER }

    override fun addTransferListener(transferListener: TransferListener) {
        upstream.addTransferListener(transferListener)
    }

    override fun open(dataSpec: DataSpec): Long {
        body = null
        bodyPos = 0
        mode = Mode.PASSTHROUGH
        openedUri = dataSpec.uri
        val params = flix.get()
        if (params == null || !shouldBuffer(dataSpec.uri)) {
            return upstream.open(dataSpec)
        }
        val full = dataSpec.buildUpon().setPosition(0L).setLength(C.LENGTH_UNSET.toLong()).build()
        val opened = upstream.open(full)
        val raw = readFully(opened)
        runCatching { upstream.close() }
        val plain = transform(dataSpec.uri, raw, params)
        val start = dataSpec.position.coerceAtLeast(0L).toInt()
        if (start >= plain.size) return 0L
        body = plain
        bodyPos = start
        mode = Mode.BUFFER
        return (plain.size - start).toLong()
    }

    override fun read(buffer: ByteArray, offset: Int, length: Int): Int {
        if (length <= 0) return 0
        if (mode == Mode.PASSTHROUGH) return upstream.read(buffer, offset, length)
        val buf = body ?: return C.RESULT_END_OF_INPUT
        if (bodyPos >= buf.size) return C.RESULT_END_OF_INPUT
        val n = minOf(length, buf.size - bodyPos)
        System.arraycopy(buf, bodyPos, buffer, offset, n)
        bodyPos += n
        return n
    }

    override fun getUri(): Uri? = upstream.uri ?: openedUri

    override fun getResponseHeaders(): Map<String, List<String>> =
        if (mode == Mode.BUFFER) emptyMap() else upstream.responseHeaders

    override fun close() {
        body = null
        bodyPos = 0
        mode = Mode.PASSTHROUGH
        openedUri = null
        runCatching { upstream.close() }
    }

    private fun transform(uri: Uri, raw: ByteArray, params: FlixUnwrap): ByteArray {
        val path = uri.path.orEmpty().lowercase()
        val key = Base64.getDecoder().decode(params.playlistKey)
        val mask = runCatching { Base64.getDecoder().decode(params.segmentMask) }.getOrNull()
            ?: FlixCrypto.fallbackSegmentMask
        if (path.endsWith(".m3u8") || path.contains(".m3u8")) {
            val text = raw.toString(Charsets.UTF_8)
            val clear = runCatching { FlixCrypto.decryptPlaylist(text, key) }.getOrDefault(text)
            val playlist = if (clear.startsWith("#EXTM3U")) {
                FlixCrypto.placeEncryptionKey(FlixCrypto.preferAudio(clear, params.englishAudio))
            } else {
                clear
            }
            return playlist.toByteArray(Charsets.UTF_8)
        }
        if (path.endsWith(".ass") || path.endsWith(".ssa")) {
            val text = raw.toString(Charsets.UTF_8)
            if (text.contains("Dialogue:")) {
                val vtt = runCatching { FlixCrypto.assToVtt(text) }.getOrNull()
                if (vtt != null) return vtt.toByteArray(Charsets.UTF_8)
            }
            return raw
        }
        return FlixCrypto.unwrapSegment(raw, mask)
    }

    private fun shouldBuffer(uri: Uri): Boolean {
        val path = uri.path.orEmpty().lowercase()
        return path.contains(".m3u8") ||
            path.endsWith(".webp") ||
            path.endsWith(".png") ||
            path.endsWith(".ass") ||
            path.endsWith(".ssa") ||
            path.contains("/_v7/")
    }

    private fun readFully(declaredLength: Long): ByteArray {
        val out = java.io.ByteArrayOutputStream(
            when {
                declaredLength > 0 -> declaredLength.toInt().coerceAtMost(8_000_000)
                else -> 64 * 1024
            },
        )
        val buf = ByteArray(16 * 1024)
        while (true) {
            val n = upstream.read(buf, 0, buf.size)
            if (n == C.RESULT_END_OF_INPUT || n < 0) break
            out.write(buf, 0, n)
            if (out.size() > 40_000_000) break
        }
        return out.toByteArray()
    }

    class Factory(
        private val upstreamFactory: DataSource.Factory,
        private val flix: AtomicReference<FlixUnwrap?> = AtomicReference(null),
    ) : DataSource.Factory {
        fun update(value: FlixUnwrap?) {
            flix.set(value)
        }

        override fun createDataSource(): DataSource =
            FlixUnwrapDataSource(upstreamFactory.createDataSource(), flix)
    }
}
