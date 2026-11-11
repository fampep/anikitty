package site.anikitty.app.data.servers

import android.net.Uri
import androidx.annotation.OptIn
import androidx.media3.common.C
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DataSpec
import androidx.media3.datasource.TransferListener
import java.util.concurrent.atomic.AtomicInteger
import java.util.regex.Pattern

/**
 * MegaPlay CDN wraps some HLS segments in a tiny fake PNG header.
 * Their web player strips the first [stripBytes] (default 252) for hosts
 * matching [stripUrlRe]. Media3 needs the same unwrap or playback fails.
 */
@OptIn(UnstableApi::class)
class SegmentStripDataSource(
    private val upstream: DataSource,
    private val stripUrlRe: Pattern = DEFAULT_STRIP_URL_RE,
    private val stripBytes: AtomicInteger = AtomicInteger(DEFAULT_STRIP_BYTES),
) : DataSource {
    private var bytesSkipped = 0

    override fun addTransferListener(transferListener: TransferListener) {
        upstream.addTransferListener(transferListener)
    }

    override fun open(dataSpec: DataSpec): Long {
        bytesSkipped = 0
        val opened = upstream.open(dataSpec)
        val url = dataSpec.uri.toString()
        val n = stripBytes.get().coerceAtLeast(0)
        // Only strip on full segment opens — ranged reads are already past the PNG header.
        if (n > 0 && dataSpec.position == 0L && shouldStrip(url)) {
            bytesSkipped = skipFully(n)
        }
        return when {
            opened == C.LENGTH_UNSET.toLong() -> C.LENGTH_UNSET.toLong()
            else -> (opened - bytesSkipped).coerceAtLeast(0L)
        }
    }

    override fun read(buffer: ByteArray, offset: Int, length: Int): Int =
        upstream.read(buffer, offset, length)

    override fun getUri(): Uri? = upstream.uri

    override fun getResponseHeaders(): Map<String, List<String>> = upstream.responseHeaders

    override fun close() {
        bytesSkipped = 0
        upstream.close()
    }

    private fun shouldStrip(url: String): Boolean = stripUrlRe.matcher(url).find()

    private fun skipFully(count: Int): Int {
        var skipped = 0
        val buf = ByteArray(4096)
        while (skipped < count) {
            val want = minOf(buf.size, count - skipped)
            val read = upstream.read(buf, 0, want)
            if (read == C.RESULT_END_OF_INPUT || read < 0) break
            skipped += read
        }
        return skipped
    }

    class Factory(
        private val upstreamFactory: DataSource.Factory,
        private val stripUrlRe: Pattern = DEFAULT_STRIP_URL_RE,
        private val stripBytes: AtomicInteger = AtomicInteger(DEFAULT_STRIP_BYTES),
    ) : DataSource.Factory {
        override fun createDataSource(): DataSource =
            SegmentStripDataSource(upstreamFactory.createDataSource(), stripUrlRe, stripBytes)

        fun updateStripBytes(n: Int) {
            if (n > 0) stripBytes.set(n)
        }
    }

    companion object {
        const val DEFAULT_STRIP_BYTES = 252
        val DEFAULT_STRIP_URL_RE: Pattern = Pattern.compile(
            "ibyteimg\\.com|tiktokcdn\\.com|ipstatp\\.com|yoot\\.akirax\\.buzz",
            Pattern.CASE_INSENSITIVE,
        )
    }
}
