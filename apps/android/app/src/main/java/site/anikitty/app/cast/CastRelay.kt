// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.cast

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.net.wifi.WifiManager
import android.os.PowerManager
import androidx.annotation.OptIn
import androidx.media3.common.C
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DataSpec
import androidx.media3.datasource.DefaultHttpDataSource
import site.anikitty.app.data.servers.GotakuObfDataSource
import site.anikitty.app.data.servers.PlayableSource
import site.anikitty.app.data.servers.SegmentStripDataSource
import java.io.BufferedOutputStream
import java.io.ByteArrayOutputStream
import java.net.Inet4Address
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.ServerSocket
import java.net.Socket
import java.net.URI
import java.net.URLDecoder
import java.net.URLEncoder
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference

data class RelaySubtitle(
    val url: String,
    val label: String,
    val language: String?,
)

data class RelayPlayback(
    val url: String,
    val mimeType: String,
    val subtitles: List<RelaySubtitle>,
    /** Playlist bytes to serve on `/play` once the receiver is actually loaded. */
    val playlist: ByteArray?,
    /** Upstream URLs this playback may fetch. Kept off the live allowlist until publish. */
    val allowed: Set<String>,
)

/**
 * The Chromecast fetches the stream itself and cannot send Referer headers or
 * unwrap Gotaku / disguised segments. This serves a clean copy from the phone
 * on the same Wi-Fi, using the same request path as local playback.
 */
@OptIn(UnstableApi::class)
class CastRelay(context: Context) {
    private val appContext = context.applicationContext
    private val stripBytes = AtomicInteger(SegmentStripDataSource.DEFAULT_STRIP_BYTES)
    private val obf = AtomicReference(null as site.anikitty.app.data.servers.GotakuObf?)
    private val httpFactory = DefaultHttpDataSource.Factory()
        .setAllowCrossProtocolRedirects(true)
        .setConnectTimeoutMs(12_000)
        .setReadTimeoutMs(20_000)
    private val gotakuFactory = GotakuObfDataSource.Factory(httpFactory, obf)
    private val factory = SegmentStripDataSource.Factory(gotakuFactory, stripBytes = stripBytes)

    private val allowLock = Any()
    /** URLs the receiver is playing now, plus the previous load so a switch does not 403. */
    private var liveAllowed = emptySet<String>()
    private var priorAllowed = emptySet<String>()
    private val collecting = ThreadLocal<MutableSet<String>>()
    private var pool = newPool()
    @Volatile private var source: PlayableSource? = null
    @Volatile private var cachedPlaylist: ByteArray? = null
    @Volatile var segmentPack: String = "ts"
        private set
    @Volatile private var running = false
    private var server: ServerSocket? = null
    private var acceptThread: Thread? = null
    private var port = 0
    private var wifiLock: WifiManager.WifiLock? = null
    private var multicast: WifiManager.MulticastLock? = null
    private var wakeLock: PowerManager.WakeLock? = null

    fun prepare(next: PlayableSource): RelayPlayback {
        val host = lanIpv4() ?: error("Connect the phone and Chromecast to the same Wi-Fi")
        source = next
        httpFactory.setUserAgent(
            next.headers.entries.firstOrNull { it.key.equals("User-Agent", true) }?.value
                ?: DEFAULT_UA,
        )
        httpFactory.setDefaultRequestProperties(next.headers)
        gotakuFactory.updateObf(next.gotakuObf)
        obf.set(next.gotakuObf)
        val strip = when {
            next.gotakuObf != null -> next.stripBytes.coerceAtLeast(0)
            next.stripBytes > 0 -> next.stripBytes
            else -> SegmentStripDataSource.DEFAULT_STRIP_BYTES
        }
        stripBytes.set(strip)
        val fresh = LinkedHashSet<String>()
        collecting.set(fresh)
        allow(next.url)
        start()
        val playlist = readPlaylist(next.url)
        val mime = when {
            playlist != null -> HLS_MIME
            next.gotakuObf != null -> HLS_MIME
            next.url.contains(".m3u8", ignoreCase = true) -> HLS_MIME
            next.url.contains("/p/1") -> HLS_MIME
            else -> "video/mp4"
        }
        val subs = try {
            next.subtitles.mapIndexedNotNull { index, track ->
                if (!track.url.startsWith("http")) return@mapIndexedNotNull null
                val lower = track.url.lowercase()
                val text = lower.contains(".vtt") || lower.contains(".srt") ||
                    track.mimeType?.contains("vtt", true) == true ||
                    track.mimeType?.contains("subrip", true) == true
                if (!text) return@mapIndexedNotNull null
                allow(track.url)
                RelaySubtitle(
                    url = "http://$host:$port/sub?i=$index",
                    label = track.label.ifBlank { "Subtitles" },
                    language = track.language,
                )
            }
        } finally {
            collecting.remove()
        }
        val file = if (mime == HLS_MIME) "index.m3u8?pack=$segmentPack" else "video.mp4"
        return RelayPlayback(
            url = "http://$host:$port/$file",
            mimeType = mime,
            subtitles = subs,
            playlist = playlist,
            allowed = fresh,
        )
    }

    /** Swap the served playlist and allowlist when the receiver is given this load. */
    fun publish(playback: RelayPlayback) {
        synchronized(allowLock) {
            priorAllowed = liveAllowed
            liveAllowed = playback.allowed
            cachedPlaylist = playback.playlist
        }
    }

    fun stop() {
        running = false
        runCatching { server?.close() }
        server = null
        acceptThread = null
        cachedPlaylist = null
        synchronized(allowLock) {
            liveAllowed = emptySet()
            priorAllowed = emptySet()
        }
        val retiring = pool
        pool = newPool()
        retiring.shutdownNow()
        runCatching { wifiLock?.release() }
        runCatching { multicast?.release() }
        runCatching { wakeLock?.release() }
        wifiLock = null
        multicast = null
        wakeLock = null
    }

    private fun start() {
        if (running && server?.isClosed == false) return
        val socket = ServerSocket()
        socket.reuseAddress = true
        socket.bind(InetSocketAddress("0.0.0.0", 0))
        server = socket
        port = socket.localPort
        running = true
        holdLocks()
        acceptThread = Thread({
            while (running) {
                val client = try {
                    socket.accept()
                } catch (_: Exception) {
                    break
                }
                workers().execute { handle(client) }
            }
        }, "anikitty-cast-accept").apply {
            isDaemon = true
            start()
        }
    }

    private fun holdLocks() {
        val wifi = appContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
        val wifiMode = if (android.os.Build.VERSION.SDK_INT >= 29) {
            WifiManager.WIFI_MODE_FULL_LOW_LATENCY
        } else {
            @Suppress("DEPRECATION")
            WifiManager.WIFI_MODE_FULL_HIGH_PERF
        }
        wifiLock = wifi?.createWifiLock(wifiMode, "anikitty-cast")?.apply {
            setReferenceCounted(false)
            acquire()
        }
        multicast = wifi?.createMulticastLock("anikitty-cast")?.apply {
            setReferenceCounted(false)
            acquire()
        }
        val power = appContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
        wakeLock = power?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "anikitty:cast")?.apply {
            setReferenceCounted(false)
            acquire(4 * 60 * 60 * 1000L)
        }
    }

    private fun handle(socket: Socket) {
        socket.use { client ->
            client.soTimeout = 20_000
            val header = readHeader(client)
            val request = header.lineSequence().firstOrNull().orEmpty()
            val parts = request.split(' ')
            val method = parts.getOrNull(0).orEmpty()
            if (method.equals("OPTIONS", true)) {
                writeStatus(client, 204, "text/plain", ByteArray(0), headOnly = true)
                return
            }
            if (parts.size < 2 || (!method.equals("GET", true) && !method.equals("HEAD", true))) {
                writeStatus(client, 405, "text/plain", "No".toByteArray())
                return
            }
            val headOnly = method.equals("HEAD", true)
            val target = parts[1]
            val path = target.substringBefore('?')
            val query = target.substringAfter('?', "")
            val range = rangeStart(header)
            when (path) {
                "/index.m3u8" -> servePlay(client, range, playlist = true, headOnly = headOnly)
                "/video.mp4" -> servePlay(client, range, playlist = false, headOnly = headOnly)
                "/play" -> servePlay(client, range, playlist = cachedPlaylist != null, headOnly = headOnly)
                "/u", "/u.m3u8" -> {
                    val raw = queryValue(query, "u")
                    if (raw == null || !permitted(raw)) {
                        writeStatus(client, 403, "text/plain", "No".toByteArray(), headOnly = headOnly)
                    } else {
                        serveUpstream(client, raw, range, headOnly)
                    }
                }
                "/sub" -> {
                    val index = queryValue(query, "i")?.toIntOrNull()
                    val track = index?.let { source?.subtitles?.getOrNull(it) }
                    if (track == null || !permitted(track.url)) {
                        writeStatus(client, 404, "text/plain", "No".toByteArray())
                    } else {
                        val body = readBytes(track.url)?.let { toVtt(it) }
                        if (body == null) {
                            writeStatus(client, 502, "text/plain", "No".toByteArray())
                        } else {
                            writeStatus(client, 200, "text/vtt; charset=utf-8", body)
                        }
                    }
                }
                else -> writeStatus(client, 404, "text/plain", "No".toByteArray())
            }
        }
    }

    private fun servePlay(client: Socket, range: Long?, playlist: Boolean, headOnly: Boolean) {
        val cached = cachedPlaylist
        val url = source?.url
        if (playlist && cached != null) {
            writeStatus(client, 200, "$HLS_MIME; charset=utf-8", cached, headOnly = headOnly)
            return
        }
        if (url == null) {
            writeStatus(client, 404, "text/plain", "No".toByteArray(), headOnly = headOnly)
            return
        }
        serveUpstream(client, url, range, headOnly)
    }

    private fun serveUpstream(client: Socket, url: String, range: Long?, headOnly: Boolean = false) {
        val position = range?.coerceAtLeast(0L) ?: 0L
        val spec = DataSpec.Builder()
            .setUri(Uri.parse(url))
            .setPosition(position)
            .build()
        val upstream = factory.createDataSource()
        try {
            val length = upstream.open(spec)
            if (position == 0L && looksLikePlaylist(url, upstream.responseHeaders)) {
                val body = readFully(upstream, length)
                val text = body.toString(Charsets.UTF_8)
                if (text.trimStart().startsWith("#EXTM3U")) {
                    val rewritten = rewritePlaylist(text, upstream.uri?.toString() ?: url)
                    writeStatus(
                        client,
                        200,
                        "$HLS_MIME; charset=utf-8",
                        rewritten.toByteArray(Charsets.UTF_8),
                        headOnly = headOnly,
                    )
                    return
                }
                writeBytes(
                    client,
                    200,
                    contentType(url, upstream.responseHeaders),
                    body,
                    null,
                    body.size.toLong(),
                    headOnly,
                )
                return
            }
            if (headOnly) {
                val total = if (length == C.LENGTH_UNSET.toLong()) null else position + length
                writeHead(client, if (position > 0L) 206 else 200, contentType(url, upstream.responseHeaders), if (length >= 0) length else null, position, total)
                return
            }
            val total = when {
                length == C.LENGTH_UNSET.toLong() -> null
                else -> position + length
            }
            val status = if (position > 0L) 206 else 200
            val type = contentType(url, upstream.responseHeaders)
            writeHead(client, status, type, if (length >= 0) length else null, position, total)
            val out = BufferedOutputStream(client.getOutputStream())
            val buf = ByteArray(16 * 1024)
            while (true) {
                val n = upstream.read(buf, 0, buf.size)
                if (n == C.RESULT_END_OF_INPUT || n < 0) break
                out.write(buf, 0, n)
            }
            out.flush()
        } catch (_: Exception) {
            runCatching { writeStatus(client, 502, "text/plain", "No".toByteArray()) }
        } finally {
            runCatching { upstream.close() }
        }
    }

    private fun readPlaylist(url: String): ByteArray? {
        val upstream = factory.createDataSource()
        return try {
            upstream.open(DataSpec(Uri.parse(url)))
            val hinted = looksLikePlaylist(url, upstream.responseHeaders)
            val peek = ByteArray(16)
            val n = readInto(upstream, peek)
            val head = if (n > 0) String(peek, 0, n, Charsets.UTF_8) else ""
            if (!hinted && !head.startsWith("#EXTM3U")) return null
            val rest = readFully(upstream, C.LENGTH_UNSET.toLong())
            val body = ByteArray(n + rest.size)
            if (n > 0) System.arraycopy(peek, 0, body, 0, n)
            System.arraycopy(rest, 0, body, n, rest.size)
            val text = body.toString(Charsets.UTF_8)
            if (!text.trimStart().startsWith("#EXTM3U")) return null
            val base = upstream.uri?.toString() ?: url
            segmentPack = classifyPack(text, base)
            rewritePlaylist(text, base).toByteArray(Charsets.UTF_8)
        } catch (_: Exception) {
            null
        } finally {
            runCatching { upstream.close() }
        }
    }

    private fun rewritePlaylist(text: String, baseUrl: String): String {
        val base = runCatching { URI(baseUrl) }.getOrNull()
        return text.lineSequence().joinToString("\n") { line ->
            val trimmed = line.trim()
            if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                URI_ATTR.replace(line) { match ->
                    val raw = match.groupValues[1]
                    if (raw.startsWith("data:") || raw.startsWith("skd:")) {
                        match.value
                    } else {
                        val abs = resolve(base, raw)
                        allow(abs)
                        "URI=\"${proxy(abs)}\""
                    }
                }
            } else {
                val abs = resolve(base, trimmed)
                allow(abs)
                proxy(abs)
            }
        }
    }

    private fun proxy(absolute: String): String {
        val host = lanIpv4() ?: return absolute
        val encoded = URLEncoder.encode(absolute, Charsets.UTF_8.name())
        val suffix = if (looksLikePlaylist(absolute, emptyMap())) ".m3u8" else ""
        return "http://$host:$port/u$suffix?u=$encoded"
    }

    private fun resolve(base: URI?, ref: String): String {
        if (base == null) return ref
        return runCatching { base.resolve(ref).toString() }.getOrDefault(ref)
    }

    private fun allow(url: String) {
        val set = collecting.get()
        if (set != null) {
            if (set.size < 8_000) set.add(url)
            return
        }
        // A variant playlist is rewritten when the TV asks for it, after publish.
        synchronized(allowLock) {
            if (url in liveAllowed || url in priorAllowed || liveAllowed.size >= 8_000) return
            liveAllowed = liveAllowed + url
        }
    }

    private fun permitted(url: String): Boolean = synchronized(allowLock) {
        url in liveAllowed || url in priorAllowed
    }

    private fun workers(): java.util.concurrent.ExecutorService {
        if (pool.isShutdown) pool = newPool()
        return pool
    }

    private fun newPool() = Executors.newFixedThreadPool(6) { runnable ->
        Thread(runnable, "anikitty-cast").apply { isDaemon = true }
    }

    private fun classifyPack(text: String, baseUrl: String, depth: Int = 0): String {
        val lower = text.lowercase()
        if (lower.contains("#ext-x-map") || lower.contains(".m4s") || lower.contains(".cmf") ||
            lower.contains(".m4a") || lower.contains(".m4v") || lower.contains(".mp4")
        ) {
            return "fmp4"
        }
        if (lower.contains(".ts")) return "ts"
        if (depth == 0 && lower.contains("#ext-x-stream-inf")) {
            val line = text.lineSequence().map { it.trim() }.firstOrNull { it.isNotEmpty() && !it.startsWith("#") }
            if (line != null) {
                val abs = resolve(runCatching { URI(baseUrl) }.getOrNull(), line)
                val nested = fetchText(abs)
                if (nested != null && nested.trimStart().startsWith("#EXTM3U")) {
                    return classifyPack(nested, abs, depth + 1)
                }
            }
        }
        return "ts"
    }

    private fun fetchText(url: String): String? {
        val upstream = factory.createDataSource()
        return try {
            upstream.open(DataSpec(Uri.parse(url)))
            readFully(upstream, C.LENGTH_UNSET.toLong()).toString(Charsets.UTF_8)
        } catch (_: Exception) {
            null
        } finally {
            runCatching { upstream.close() }
        }
    }

    private fun looksLikePlaylist(url: String, headers: Map<String, List<String>>): Boolean {
        val lower = url.lowercase()
        if (lower.contains(".m3u8") || lower.contains("/p/1")) return true
        val type = headers["Content-Type"]?.joinToString(",").orEmpty().lowercase()
        return type.contains("mpegurl") || type.contains("mpegURL".lowercase()) || type.contains("m3u")
    }

    private fun contentType(url: String, headers: Map<String, List<String>>): String {
        val lower = url.lowercase()
        return when {
            lower.contains(".m3u8") || lower.contains("/p/1") -> HLS_MIME
            lower.contains(".m4s") || lower.contains(".mp4") || lower.contains(".m4a") -> "video/mp4"
            lower.contains(".aac") -> "audio/aac"
            lower.contains(".vtt") -> "text/vtt"
            lower.contains(".ts") || lower.contains("/s/1") -> "video/mp2t"
            else -> {
                val raw = headers["Content-Type"]?.firstOrNull()?.substringBefore(';')?.trim().orEmpty()
                if (raw.startsWith("image/") || raw.isBlank() || raw.contains("octet-stream")) {
                    "video/mp2t"
                } else {
                    raw
                }
            }
        }
    }

    private fun readBytes(url: String): ByteArray? {
        val upstream = factory.createDataSource()
        return try {
            val length = upstream.open(DataSpec(Uri.parse(url)))
            readFully(upstream, length)
        } catch (_: Exception) {
            null
        } finally {
            runCatching { upstream.close() }
        }
    }

    private fun readFully(upstream: androidx.media3.datasource.DataSource, declared: Long): ByteArray {
        val out = ByteArrayOutputStream(
            if (declared in 1..(2_000_000)) declared.toInt() else 64 * 1024,
        )
        val buf = ByteArray(16 * 1024)
        var total = 0
        while (total < 8_000_000) {
            val n = upstream.read(buf, 0, buf.size)
            if (n == C.RESULT_END_OF_INPUT || n < 0) break
            out.write(buf, 0, n)
            total += n
        }
        return out.toByteArray()
    }

    private fun readInto(upstream: androidx.media3.datasource.DataSource, buf: ByteArray): Int {
        var got = 0
        while (got < buf.size) {
            val n = upstream.read(buf, got, buf.size - got)
            if (n == C.RESULT_END_OF_INPUT || n < 0) break
            got += n
        }
        return got
    }

    private fun toVtt(bytes: ByteArray): ByteArray {
        val text = bytes.toString(Charsets.UTF_8).removePrefix("\uFEFF")
        if (text.trimStart().startsWith("WEBVTT")) return text.toByteArray(Charsets.UTF_8)
        val converted = "WEBVTT\n\n" + TIME_COMMA.replace(text, "$1.$2")
        return converted.toByteArray(Charsets.UTF_8)
    }

    private fun readHeader(socket: Socket): String {
        val input = socket.getInputStream()
        val out = ByteArrayOutputStream()
        var matched = 0
        val needle = byteArrayOf(13, 10, 13, 10)
        while (out.size() < 8_192) {
            val b = input.read()
            if (b < 0) break
            out.write(b)
            matched = if (b == needle[matched].toInt()) matched + 1 else 0
            if (matched == needle.size) break
        }
        return out.toString(Charsets.ISO_8859_1.name())
    }

    private fun rangeStart(header: String): Long? {
        val line = header.lineSequence().firstOrNull { it.startsWith("Range:", true) } ?: return null
        val value = line.substringAfter(':').trim()
        if (!value.startsWith("bytes=", true)) return null
        return value.substringAfter('=').substringBefore('-').toLongOrNull()
    }

    private fun queryValue(query: String, key: String): String? {
        for (part in query.split('&')) {
            val name = part.substringBefore('=')
            if (name == key) {
                return URLDecoder.decode(part.substringAfter('='), Charsets.UTF_8.name())
            }
        }
        return null
    }

    private fun writeStatus(
        client: Socket,
        status: Int,
        type: String,
        body: ByteArray,
        headOnly: Boolean = false,
    ) {
        writeBytes(client, status, type, body, null, body.size.toLong(), headOnly)
    }

    private fun writeBytes(
        client: Socket,
        status: Int,
        type: String,
        body: ByteArray,
        position: Long?,
        total: Long?,
        headOnly: Boolean = false,
    ) {
        writeHead(client, status, type, body.size.toLong(), position ?: 0L, total)
        if (!headOnly) {
            client.getOutputStream().write(body)
            client.getOutputStream().flush()
        }
    }

    private fun writeHead(
        client: Socket,
        status: Int,
        type: String,
        length: Long?,
        position: Long,
        total: Long?,
    ) {
        val reason = when (status) {
            206 -> "Partial Content"
            204 -> "No Content"
            200 -> "OK"
            else -> "Error"
        }
        val builder = StringBuilder()
        builder.append("HTTP/1.1 ").append(status).append(' ').append(reason).append("\r\n")
        builder.append("Content-Type: ").append(type).append("\r\n")
        builder.append("Access-Control-Allow-Origin: *\r\n")
        builder.append("Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n")
        builder.append("Access-Control-Allow-Headers: Content-Type, Range, Accept, Origin\r\n")
        builder.append("Access-Control-Expose-Headers: Content-Length, Content-Range, Content-Type, Accept-Ranges\r\n")
        builder.append("Access-Control-Max-Age: 86400\r\n")
        builder.append("Accept-Ranges: bytes\r\n")
        builder.append("Connection: close\r\n")
        if (length != null && length >= 0) {
            builder.append("Content-Length: ").append(length).append("\r\n")
        }
        if (status == 206 && length != null && total != null) {
            val end = position + length - 1
            builder.append("Content-Range: bytes ").append(position).append('-').append(end)
                .append('/').append(total).append("\r\n")
        }
        builder.append("\r\n")
        client.getOutputStream().write(builder.toString().toByteArray(Charsets.ISO_8859_1))
    }

    private fun lanIpv4(): String? = wifiIpv4() ?: interfaceIpv4()

    private fun wifiIpv4(): String? {
        val cm = appContext.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            ?: return null
        val network = cm.activeNetwork ?: return null
        val caps = cm.getNetworkCapabilities(network) ?: return null
        val onLan = caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
        if (!onLan) return null
        val props = cm.getLinkProperties(network) ?: return null
        val found = ArrayList<Inet4Address>()
        for (link in props.linkAddresses) {
            val addr = link.address
            if (addr is Inet4Address && isPrivate(addr)) found += addr
        }
        return preferPrivate(found)
    }

    private fun interfaceIpv4(): String? {
        val interfaces = NetworkInterface.getNetworkInterfaces() ?: return null
        val found = ArrayList<Inet4Address>()
        for (nic in interfaces) {
            if (!runCatching { nic.isUp && !nic.isLoopback }.getOrDefault(false)) continue
            for (addr in nic.inetAddresses) {
                if (addr is Inet4Address && !addr.isLoopbackAddress && !addr.isLinkLocalAddress && isPrivate(addr)) {
                    found += addr
                }
            }
        }
        return preferPrivate(found)
    }

    private fun preferPrivate(found: List<Inet4Address>): String? {
        return found.minByOrNull { address ->
            val first = address.address[0].toInt() and 0xff
            when (first) {
                192 -> 0
                10 -> 1
                else -> 2
            }
        }?.hostAddress
    }

    private fun isPrivate(addr: Inet4Address): Boolean {
        val b = addr.address
        val a = b[0].toInt() and 0xff
        val c = b[1].toInt() and 0xff
        return a == 10 || (a == 192 && c == 168) || (a == 172 && c in 16..31)
    }

    companion object {
        private const val HLS_MIME = "application/vnd.apple.mpegurl"
        private const val DEFAULT_UA =
            "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36"
        private val URI_ATTR = Regex("""URI="([^"]*)"""")
        private val TIME_COMMA = Regex("""(\d{2}:\d{2}:\d{2}),(\d{3})""")
    }
}
