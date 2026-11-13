package site.anikitty.app.data.link

import android.content.Context
import android.net.wifi.WifiManager
import org.json.JSONArray
import org.json.JSONObject
import site.anikitty.app.data.local.WatchHistoryEntity
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.Inet4Address
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.ServerSocket
import java.net.Socket
import java.net.SocketTimeoutException
import java.security.SecureRandom

/**
 * Same-Wi-Fi handoff. The TV shows a one-time code. The phone sends the AniList
 * token and on-device watch rows. Nothing is sent to a server fampep runs.
 */
data class DeviceLinkOffer(
    val host: String,
    val port: Int,
    val code: String,
) {
    val uri: String = "anikitty://pair?host=$host&port=$port&code=$code"
}

data class DeviceLinkPayload(
    val token: String,
    val history: List<WatchHistoryEntity>,
)

data class DeviceEndpoint(
    val host: String,
    val port: Int,
)

class DeviceLinkHost {
    private val random = SecureRandom()
    @Volatile private var running = false
    private var server: ServerSocket? = null
    private var thread: Thread? = null
    private var discovery: DatagramSocket? = null
    private var discoveryThread: Thread? = null
    private var multicast: WifiManager.MulticastLock? = null

    private var generation = 0

    fun start(context: Context, onLinked: (DeviceLinkPayload) -> Unit): DeviceLinkOffer? {
        stop()
        val host = lanIpv4() ?: return null
        val socket = ServerSocket()
        socket.reuseAddress = true
        socket.soTimeout = 1_000
        socket.bind(InetSocketAddress("0.0.0.0", 0))
        server = socket
        val gen = ++generation
        running = true
        val code = randomCode()
        val offer = DeviceLinkOffer(host, socket.localPort, code)
        holdMulticast(context)
        startDiscovery(socket.localPort, gen)
        thread = Thread({
            while (running && generation == gen) {
                val client = try {
                    socket.accept()
                } catch (_: Exception) {
                    if (!running || generation != gen || socket.isClosed) break
                    continue
                }
                client.use { accepted ->
                    val payload = runCatching { readPayload(accepted, code) }.getOrNull()
                    val writer = accepted.getOutputStream().bufferedWriter()
                    if (payload == null) {
                        writer.write("NO\n")
                        writer.flush()
                    } else {
                        writer.write("OK\n")
                        writer.flush()
                        running = false
                        onLinked(payload)
                    }
                }
            }
        }, "anikitty-pair").also { it.isDaemon = true; it.start() }
        return offer
    }

    fun stop() {
        generation++
        running = false
        runCatching { server?.close() }
        runCatching { discovery?.close() }
        runCatching { multicast?.release() }
        server = null
        thread = null
        discovery = null
        discoveryThread = null
        multicast = null
    }

    private fun holdMulticast(context: Context) {
        multicast = runCatching {
            context.applicationContext.getSystemService(WifiManager::class.java)
                ?.createMulticastLock("anikitty-pair")
                ?.apply {
                    setReferenceCounted(false)
                    acquire()
                }
        }.getOrNull()
    }

    private fun startDiscovery(tcpPort: Int, gen: Int) {
        val socket = try {
            DatagramSocket(null).apply {
                reuseAddress = true
                broadcast = true
                soTimeout = 400
                bind(InetSocketAddress(DISCOVERY_PORT))
            }
        } catch (_: Exception) {
            return
        }
        discovery = socket
        val announce = "ANK1 $tcpPort".toByteArray()
        discoveryThread = Thread({
            var nextBeacon = 0L
            while (running && generation == gen && !socket.isClosed) {
                val now = System.currentTimeMillis()
                if (now >= nextBeacon) {
                    sendDatagram(socket, announce, DISCOVERY_PORT)
                    nextBeacon = now + 1_000
                }
                val buffer = ByteArray(32)
                val packet = DatagramPacket(buffer, buffer.size)
                try {
                    socket.receive(packet)
                } catch (_: SocketTimeoutException) {
                    continue
                } catch (_: Exception) {
                    break
                }
                val text = String(packet.data, 0, packet.length, Charsets.US_ASCII).trim()
                val from = packet.address?.hostAddress ?: continue
                if (text == "ANK?" && isPrivateLan(from)) {
                    val reply = DatagramPacket(announce, announce.size, packet.address, packet.port)
                    runCatching { socket.send(reply) }
                }
            }
        }, "anikitty-pair-discover").also { it.isDaemon = true; it.start() }
    }

    private fun randomCode(): String = buildString(6) {
        repeat(6) { append(ALPHABET[random.nextInt(ALPHABET.length)]) }
    }

    private fun readPayload(socket: Socket, expectedCode: String): DeviceLinkPayload? {
        socket.soTimeout = 4_000
        val line = socket.getInputStream().bufferedReader().readLine()?.take(MAX_LINE) ?: return null
        val json = runCatching { JSONObject(line) }.getOrNull() ?: return null
        if (json.optInt("v") != 1) return null
        val code = json.optString("code")
        if (code.length != expectedCode.length || !constantTimeEquals(code, expectedCode)) return null
        val token = json.optString("token").trim()
        if (token.length !in 20..4_000 || token.any { it.isWhitespace() }) return null
        val history = json.optJSONArray("history").toHistory()
        return DeviceLinkPayload(token, history)
    }

    companion object {
        private const val ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        private const val MAX_LINE = 500_000
        private const val DISCOVERY_PORT = 47821

        fun normalizeCode(raw: String): String =
            raw.uppercase().filter { it in ALPHABET }.take(6)

        /** TVs waiting on this Wi-Fi. The code stays on the TV screen; this only finds addresses. */
        fun discover(context: Context, waitMs: Long = 1_600): List<DeviceEndpoint> {
            val lock = runCatching {
                context.applicationContext.getSystemService(WifiManager::class.java)
                    ?.createMulticastLock("anikitty-pair")
                    ?.apply {
                        setReferenceCounted(false)
                        acquire()
                    }
            }.getOrNull()
            val found = LinkedHashMap<String, DeviceEndpoint>()
            val socket = try {
                DatagramSocket(null).apply {
                    reuseAddress = true
                    broadcast = true
                    soTimeout = 250
                    bind(InetSocketAddress(0))
                }
            } catch (_: Exception) {
                runCatching { lock?.release() }
                return emptyList()
            }
            socket.use {
                val probe = "ANK?".toByteArray()
                sendDatagram(socket, probe, DISCOVERY_PORT)
                val deadline = System.currentTimeMillis() + waitMs
                while (System.currentTimeMillis() < deadline && found.size < 8) {
                    val buffer = ByteArray(48)
                    val packet = DatagramPacket(buffer, buffer.size)
                    try {
                        socket.receive(packet)
                    } catch (_: SocketTimeoutException) {
                        sendDatagram(socket, probe, DISCOVERY_PORT)
                        continue
                    } catch (_: Exception) {
                        break
                    }
                    val text = String(packet.data, 0, packet.length, Charsets.US_ASCII).trim()
                    val port = parseAnnounce(text) ?: continue
                    val host = packet.address?.hostAddress ?: continue
                    if (!isPrivateLan(host)) continue
                    found["$host:$port"] = DeviceEndpoint(host, port)
                }
            }
            runCatching { lock?.release() }
            return found.values.toList()
        }

        private fun parseAnnounce(text: String): Int? {
            val parts = text.split(' ')
            if (parts.size != 2 || parts[0] != "ANK1") return null
            val port = parts[1].toIntOrNull() ?: return null
            return port.takeIf { it in 1..65535 }
        }

        private fun sendDatagram(socket: DatagramSocket, payload: ByteArray, port: Int) {
            for (target in broadcastTargets()) {
                runCatching {
                    socket.send(DatagramPacket(payload, payload.size, target, port))
                }
            }
        }

        private fun broadcastTargets(): List<InetAddress> {
            val out = LinkedHashSet<String>()
            val addresses = ArrayList<InetAddress>()
            fun add(address: InetAddress?) {
                val host = address?.hostAddress ?: return
                if (out.add(host)) addresses += address
            }
            add(runCatching { InetAddress.getByName("255.255.255.255") }.getOrNull())
            val interfaces = NetworkInterface.getNetworkInterfaces() ?: return addresses
            for (nic in interfaces) {
                if (!runCatching { nic.isUp && !nic.isLoopback }.getOrDefault(false)) continue
                for (iface in nic.interfaceAddresses) add(iface.broadcast)
            }
            return addresses
        }

        fun lanIpv4(): String? {
            val interfaces = NetworkInterface.getNetworkInterfaces() ?: return null
            val addresses = interfaces.toList().flatMap { nic ->
                nic.inetAddresses.toList()
            }
            return addresses
                .filterIsInstance<Inet4Address>()
                .firstOrNull { !it.isLoopbackAddress && !it.isLinkLocalAddress && isPrivateLan(it) }
                ?.hostAddress
        }

        fun isPrivateLan(host: String): Boolean {
            val addr = runCatching { InetAddress.getByName(host) }.getOrNull() ?: return false
            return addr is Inet4Address && isPrivateLan(addr)
        }

        private fun isPrivateLan(addr: Inet4Address): Boolean {
            val b = addr.address
            val a = b[0].toInt() and 0xff
            val c = b[1].toInt() and 0xff
            return a == 10 || (a == 192 && c == 168) || (a == 172 && c in 16..31)
        }

        fun parse(raw: String): DeviceLinkOffer? {
            val uri = android.net.Uri.parse(raw.trim())
            if (uri.scheme != "anikitty" || uri.host != "pair") return null
            val host = uri.getQueryParameter("host")?.trim().orEmpty()
            val port = uri.getQueryParameter("port")?.toIntOrNull() ?: return null
            val code = uri.getQueryParameter("code")?.trim().orEmpty()
            if (!isPrivateLan(host) || port !in 1..65535 || code.length !in 4..12) return null
            return DeviceLinkOffer(host, port, code)
        }

        fun send(offer: DeviceLinkOffer, token: String, history: List<WatchHistoryEntity>) {
            val body = JSONObject()
                .put("v", 1)
                .put("code", offer.code)
                .put("token", token)
                .put("history", history.take(400).toJson())
                .toString()
            Socket().use { socket ->
                socket.connect(InetSocketAddress(offer.host, offer.port), 4_000)
                socket.soTimeout = 4_000
                val writer = socket.getOutputStream().bufferedWriter()
                writer.write(body)
                writer.write("\n")
                writer.flush()
                val reply = socket.getInputStream().bufferedReader().readLine()?.trim()
                if (reply != "OK") error("The TV did not accept that code")
            }
        }

        private fun constantTimeEquals(a: String, b: String): Boolean {
            if (a.length != b.length) return false
            var diff = 0
            for (i in a.indices) diff = diff or (a[i].code xor b[i].code)
            return diff == 0
        }
    }
}

private fun List<WatchHistoryEntity>.toJson(): JSONArray {
    val array = JSONArray()
    for (entry in this) {
        array.put(
            JSONObject()
                .put("id", entry.anilistId)
                .put("title", entry.title)
                .put("cover", entry.coverImageUrl ?: "")
                .put("episode", entry.episode)
                .put("positionMs", entry.positionMs)
                .put("durationMs", entry.durationMs)
                .put("updatedAt", entry.updatedAtEpochMs)
                .put("status", entry.listStatus ?: "")
                .put("malId", entry.malId ?: 0),
        )
    }
    return array
}

private fun JSONArray?.toHistory(): List<WatchHistoryEntity> {
    if (this == null) return emptyList()
    return buildList {
        for (i in 0 until length().coerceAtMost(400)) {
            val row = optJSONObject(i) ?: continue
            val id = row.optInt("id")
            val title = row.optString("title").trim()
            if (id <= 0 || title.isEmpty()) continue
            add(
                WatchHistoryEntity(
                    anilistId = id,
                    title = title.take(300),
                    coverImageUrl = row.optString("cover").takeIf { it.isNotBlank() },
                    episode = row.optInt("episode").coerceAtLeast(0),
                    positionMs = row.optLong("positionMs").coerceAtLeast(0L),
                    durationMs = row.optLong("durationMs").coerceAtLeast(0L),
                    updatedAtEpochMs = row.optLong("updatedAt").coerceAtLeast(0L),
                    listStatus = row.optString("status").takeIf { it.isNotBlank() },
                    malId = row.optInt("malId").takeIf { it > 0 },
                ),
            )
        }
    }
}

/** Keep the newer row when both devices have watched the same show. */
suspend fun mergeWatchHistory(
    dao: site.anikitty.app.data.local.WatchHistoryDao,
    incoming: List<WatchHistoryEntity>,
) {
    for (row in incoming) {
        val existing = dao.get(row.anilistId)
        if (existing == null || row.updatedAtEpochMs >= existing.updatedAtEpochMs) {
            dao.upsert(row)
        }
    }
}
