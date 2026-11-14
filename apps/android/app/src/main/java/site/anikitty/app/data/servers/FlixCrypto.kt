// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.Mac
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * FlixCloud embed unwrap. The site ships a tiny wasm mixer whose rotate
 * constants change on every page, so the mixer is executed rather than
 * hard-coded. Playlists are XOR'd with the mixer's playback key. Segments
 * wear a fake WebP or PNG header and a repeating mask.
 */
internal object FlixCrypto {
    val fallbackSegmentMask = byteArrayOf(
        157.toByte(), 42, 241.toByte(), 71, 179.toByte(), 142.toByte(), 92, 112,
        166.toByte(), 25, 228.toByte(), 59, 216.toByte(), 98, 15, 197.toByte(),
    )

    data class FieldNames(
        val keyField: String,
        val ivField: String,
        val container: String,
        val array: String,
        val objectName: String,
        val tokenField: String,
        val keyFrag2Field: String,
    )

    data class ServerLink(
        val name: String,
        val url: String,
        val kind: String,
        val hardsub: Boolean,
    )

    /** First eight hex digits as a wasm i32. Values at or above 0x80000000 wrap. */
    fun seedWord(seed: String): Int = seed.take(8).toLong(16).toInt()

    fun sha256Hex(text: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(text.toByteArray(StandardCharsets.UTF_8))
        return digest.joinToString("") { "%02x".format(it) }
    }

    fun fieldNames(seed: String): FieldNames {
        var hashed = seed
        repeat(3) { hashed = sha256Hex(hashed + it) }
        var second = hashed
        repeat(3) { second = sha256Hex(second + it) }
        return FieldNames(
            keyField = "kf_${hashed.substring(8, 16)}",
            ivField = "ivf_${hashed.substring(16, 24)}",
            container = "cd_${hashed.substring(24, 32)}",
            array = "ad_${hashed.substring(32, 40)}",
            objectName = "od_${hashed.substring(40, 48)}",
            tokenField = "${hashed.substring(48, 64)}_${hashed.substring(56, 64)}",
            keyFrag2Field = "${second.substring(0, 16)}_${second.substring(16, 24)}",
        )
    }

    fun decryptStreamUrl(
        wasm: ByteArray,
        frag1: ByteArray,
        frag2: ByteArray,
        keyFrag: ByteArray,
        seed: String,
        iv: ByteArray,
        ciphertext: ByteArray,
    ): String {
        require(frag1.size == frag2.size && frag2.size == keyFrag.size) { "Key fragments differ in length" }
        // Wasm takes an i32. Seeds at or above 0x80000000 must wrap, the way
        // the page's number-to-i32 conversion does. Kotlin's toInt(16) throws.
        val mixed = mix(wasm, frag1, frag2, keyFrag, seedWord(seed))
        val derived = pbkdf2Sha256(mixed, seed.toByteArray(StandardCharsets.UTF_8), 1000, 32)
        for (i in derived.indices) {
            derived[i] = (derived[i].toInt() xor seed[i % seed.length].code).toByte()
        }
        val aesKey = MessageDigest.getInstance("SHA-256").digest(derived)
        val cipher = Cipher.getInstance("AES/CBC/PKCS5Padding")
        cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(aesKey, "AES"), IvParameterSpec(iv))
        return String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8).trim()
    }

    fun playlistKey(wasm: ByteArray): ByteArray {
        val module = WasmModule.parse(wasm)
        val mem = module.memory()
        val global = intArrayOf(0)
        val ptr = module.run(2, intArrayOf(), mem, global) ?: 2064
        return mem.copyOfRange(ptr, ptr + 32)
    }

    fun decryptPlaylist(body: String, key: ByteArray): String {
        val trimmed = body.trim()
        if (trimmed.startsWith("#EXTM3U")) return trimmed
        val data = Base64.getDecoder().decode(trimmed)
        val out = ByteArray(data.size)
        for (i in data.indices) {
            out[i] = (data[i].toInt() xor key[i % key.size].toInt()).toByte()
        }
        return String(out, StandardCharsets.UTF_8)
    }

    /**
     * The media playlist says `URI="key.bin"`, which a normal player resolves
     * next to the playlist. The key is actually beside the segments, on the
     * CDN that 403s a request to the playlist host.
     */
    fun placeEncryptionKey(playlist: String): String {
        if (!playlist.contains("#EXT-X-KEY")) return playlist
        val segment = playlist.lineSequence()
            .map { it.trim() }
            .firstOrNull { it.startsWith("https://") || it.startsWith("http://") }
            ?: return playlist
        val slash = segment.lastIndexOf('/')
        if (slash < 0) return playlist
        val directory = segment.substring(0, slash + 1)
        return playlist.lineSequence().joinToString("\n") { line ->
            if (!line.startsWith("#EXT-X-KEY") || "URI=\"" !in line) {
                line
            } else {
                line.replace(Regex("""URI="([^"]+)"""")) { match ->
                    val uri = match.groupValues[1]
                    val absolute = if (uri.startsWith("https://") || uri.startsWith("http://")) {
                        uri
                    } else {
                        directory + uri.substringAfterLast('/')
                    }
                    "URI=\"$absolute\""
                }
            }
        }
    }

    /** Keep the Japanese or English rendition as the HLS default. */
    fun preferAudio(playlist: String, english: Boolean): String {
        if (!playlist.contains("#EXT-X-MEDIA")) return playlist
        val lines = playlist.lines()
        val audio = lines.filter { it.startsWith("#EXT-X-MEDIA") && it.contains("TYPE=AUDIO") }
        if (audio.isEmpty()) return playlist
        val target = if (english) {
            audio.firstOrNull { isEnglishAudio(it) }
        } else {
            audio.firstOrNull { isJapaneseAudio(it) }
        } ?: return playlist
        return lines.joinToString("\n") { line ->
            if (line !in audio) {
                line
            } else {
                line.replace(Regex("DEFAULT=(YES|NO)"), "DEFAULT=${if (line == target) "YES" else "NO"}")
            }
        }
    }

    fun unwrapSegment(raw: ByteArray, mask: ByteArray): ByteArray {
        if (mask.isEmpty()) return raw
        if (raw.size >= 12 &&
            raw[0] == 'R'.code.toByte() && raw[1] == 'I'.code.toByte() &&
            raw[2] == 'F'.code.toByte() && raw[3] == 'F'.code.toByte() &&
            raw[8] == 'W'.code.toByte() && raw[9] == 'E'.code.toByte() &&
            raw[10] == 'B'.code.toByte() && raw[11] == 'P'.code.toByte()
        ) {
            val payload = raw.copyOfRange(12, raw.size)
            val skip = raw.size >= 13 && raw[12] == 'G'.code.toByte()
            return if (skip) payload else xorMask(payload, mask)
        }
        if (raw.size >= 8 &&
            raw[0] == 0x89.toByte() && raw[1] == 'P'.code.toByte() &&
            raw[2] == 'N'.code.toByte() && raw[3] == 'G'.code.toByte()
        ) {
            val payload = raw.copyOfRange(8, raw.size)
            val skip = raw.size >= 9 && raw[8] == 'G'.code.toByte()
            return if (skip) payload else xorMask(payload, mask)
        }
        return raw
    }

    fun parseSegmentMask(script: String): ByteArray? {
        val match = Regex("""\[(\d{1,3}(?:,\d{1,3}){15})]""").find(script) ?: return null
        val parts = match.groupValues[1].split(',')
        if (parts.size != 16) return null
        return ByteArray(16) { parts[it].trim().toInt().toByte() }
    }

    fun assToVtt(ass: String): String {
        val cues = ArrayList<String>()
        for (line in ass.lineSequence()) {
            if (!line.startsWith("Dialogue:")) continue
            val parts = line.substringAfter("Dialogue:").split(',', limit = 10)
            if (parts.size < 10) continue
            val start = assTimeToVtt(parts[1].trim()) ?: continue
            val end = assTimeToVtt(parts[2].trim()) ?: continue
            val text = stripAssOverrides(parts[9])
                .replace("\\N", "\n", ignoreCase = true)
                .replace("\\n", "\n", ignoreCase = true)
                .replace("\\h", " ", ignoreCase = true)
                .trim()
            if (text.isEmpty()) continue
            cues += "$start --> $end\n$text"
        }
        return "WEBVTT\n\n" + cues.joinToString("\n\n") + if (cues.isEmpty()) "" else "\n"
    }

    /**
     * HD-2, then HD-1. Hardsubs are dropped when both HD servers are present,
     * matching the watch page.
     */
    fun pickServers(servers: List<ServerLink>, audio: String): List<ServerLink> {
        val dub = audio.equals("dub", ignoreCase = true)
        val wanted = servers.filter { link ->
            val kind = link.kind.lowercase()
            if (dub) kind == "dub" || kind == "s-dub" else kind == "sub" || kind == "s-sub"
        }
        val names = wanted.map { it.name.uppercase() }.toSet()
        val bothHd = "HD-1" in names && "HD-2" in names
        val filtered = if (bothHd) {
            wanted.filter { !it.hardsub && !it.name.equals("H-SUB", ignoreCase = true) }
        } else {
            wanted
        }
        return filtered.sortedBy { link ->
            when (link.name.uppercase()) {
                "HD-2" -> 0
                "HD-1" -> 1
                else -> 2
            }
        }
    }

    fun cleanTitle(hint: String?): String {
        if (hint.isNullOrBlank()) return ""
        return hint.substringBefore("||")
            .replace(Regex("""\bmal:\d+\b""", RegexOption.IGNORE_CASE), "")
            .trim()
    }

    fun shortId(slug: String): String =
        slug.substringBefore('?').substringAfterLast('-').trim()

    /** Saved Ani.pm selections become reanime. Anything else is unchanged. */
    fun migrateServerId(saved: String?): String? = when (saved) {
        "anipm" -> "reanime"
        else -> saved
    }

    /** The data object embedded as `type:"data",data:{…}`. */
    fun extractEmbedData(html: String): String? {
        val marker = "type:\"data\",data:"
        val start = html.indexOf(marker)
        if (start < 0) return null
        var i = start + marker.length
        if (i >= html.length || html[i] != '{') return null
        var depth = 0
        var inString = false
        var escaped = false
        val begin = i
        while (i < html.length) {
            val ch = html[i]
            if (inString) {
                if (escaped) escaped = false
                else if (ch == '\\') escaped = true
                else if (ch == '"') inString = false
            } else if (ch == '"') {
                inString = true
            } else if (ch == '{') {
                depth++
            } else if (ch == '}') {
                depth--
                if (depth == 0) return html.substring(begin, i + 1)
            }
            i++
        }
        return null
    }

    /** Quote unquoted keys so the embed object can be read as JSON. */
    fun jsObjectToJson(raw: String): String = raw
        .replace(Regex("""([{,]\s*)([A-Za-z_$][\w$]*)\s*:"""), "$1\"$2\":")
        .replace(Regex(""",(\s*[}\]])"""), "$1")
        .replace(Regex(""":\s*undefined"""), ": null")

    private fun isEnglishAudio(line: String): Boolean =
        line.contains("LANGUAGE=\"eng\"", ignoreCase = true) ||
            line.contains("NAME=\"English\"", ignoreCase = true)

    private fun isJapaneseAudio(line: String): Boolean =
        line.contains("LANGUAGE=\"jpn\"", ignoreCase = true) ||
            line.contains("NAME=\"Native\"", ignoreCase = true) ||
            line.contains("NAME=\"Japanese\"", ignoreCase = true)

    /** Drop `{...}` override blocks without a regexp. Android's ICU rejects `\}`. */
    private fun stripAssOverrides(text: String): String {
        if (!text.contains('{')) return text
        val out = StringBuilder(text.length)
        var i = 0
        while (i < text.length) {
            if (text[i] == '{') {
                val end = text.indexOf('}', i + 1)
                if (end < 0) {
                    out.append(text, i, text.length)
                    break
                }
                i = end + 1
            } else {
                out.append(text[i])
                i++
            }
        }
        return out.toString()
    }

    private fun assTimeToVtt(raw: String): String? {
        val match = Regex("""(\d+):(\d{2}):(\d{2})\.(\d{2})""").find(raw) ?: return null
        val hours = match.groupValues[1].toInt()
        val centi = match.groupValues[4].toInt()
        return "%02d:%s:%s.%03d".format(hours, match.groupValues[2], match.groupValues[3], centi * 10)
    }

    /** PBKDF2-HMAC-SHA256 with a raw password. JCE would UTF-8 the bytes and change the key. */
    private fun pbkdf2Sha256(password: ByteArray, salt: ByteArray, iterations: Int, dkLen: Int): ByteArray {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(password, "HmacSHA256"))
        val blocks = (dkLen + 31) / 32
        val out = ByteArray(blocks * 32)
        for (block in 1..blocks) {
            mac.reset()
            mac.update(salt)
            mac.update(
                byteArrayOf(
                    (block ushr 24).toByte(),
                    (block ushr 16).toByte(),
                    (block ushr 8).toByte(),
                    block.toByte(),
                ),
            )
            var u = mac.doFinal()
            val t = u.copyOf()
            for (round in 2..iterations) {
                mac.reset()
                u = mac.doFinal(u)
                for (j in t.indices) t[j] = (t[j].toInt() xor u[j].toInt()).toByte()
            }
            t.copyInto(out, (block - 1) * 32)
        }
        return out.copyOf(dkLen)
    }

    private fun xorMask(payload: ByteArray, mask: ByteArray): ByteArray {
        val out = ByteArray(payload.size)
        for (i in payload.indices) {
            out[i] = (payload[i].toInt() xor mask[i and 15].toInt()).toByte()
        }
        return out
    }

    private fun mix(
        wasm: ByteArray,
        frag1: ByteArray,
        frag2: ByteArray,
        keyFrag: ByteArray,
        seedInt: Int,
    ): ByteArray {
        val module = WasmModule.parse(wasm)
        val mem = module.memory()
        val length = frag1.size
        val base = 1000
        frag1.copyInto(mem, base)
        frag2.copyInto(mem, base + length)
        keyFrag.copyInto(mem, base + length * 2)
        val global = intArrayOf(0)
        module.run(0, intArrayOf(seedInt), mem, global)
        module.run(
            1,
            intArrayOf(base, base + length, base + length * 2, base + length * 3, length),
            mem,
            global,
        )
        return mem.copyOfRange(base + length * 3, base + length * 4)
    }
}

/**
 * The few wasm opcodes the FlixCloud mixer uses. A full runtime is not required.
 */
internal class WasmModule(
    private val functions: List<ByteArray>,
    private val dataOffset: Int,
    private val data: ByteArray,
) {
    fun memory(): ByteArray {
        val mem = ByteArray(65536)
        data.copyInto(mem, dataOffset)
        return mem
    }

    fun run(index: Int, params: IntArray, mem: ByteArray, global: IntArray): Int? {
        val code = functions[index]
        var p = 0
        val localCount = uleb(code, p).also { p = it.second }.first
        val locals = ArrayList<Int>(params.size + 4)
        params.forEach { locals += it }
        repeat(localCount) {
            val count = uleb(code, p).also { pair -> p = pair.second }.first
            p += 1
            repeat(count) { locals += 0 }
        }
        val stack = ArrayList<Int>(16)
        val ctrl = ArrayList<Frame>(4)
        var ip = p
        while (ip < code.size) {
            val op = code[ip].toInt() and 0xff
            ip += 1
            when (op) {
                0x02, 0x03 -> {
                    ip += 1
                    ctrl += Frame(loop = op == 0x03, restart = ip, base = stack.size)
                }
                0x0b -> if (ctrl.isNotEmpty()) ctrl.removeAt(ctrl.lastIndex)
                0x0c, 0x0d -> {
                    val label = uleb(code, ip).also { ip = it.second }.first
                    val take = if (op == 0x0c) 1 else stack.removeAt(stack.lastIndex)
                    if (take != 0) {
                        val frame = ctrl[ctrl.lastIndex - label]
                        if (frame.loop) {
                            repeat(label) { ctrl.removeAt(ctrl.lastIndex) }
                            while (stack.size > frame.base) stack.removeAt(stack.lastIndex)
                            ip = frame.restart
                        } else {
                            repeat(label + 1) { ctrl.removeAt(ctrl.lastIndex) }
                            while (stack.size > frame.base) stack.removeAt(stack.lastIndex)
                            ip = skipEnd(code, ip, label + 1)
                        }
                    }
                }
                0x20 -> {
                    val n = uleb(code, ip).also { ip = it.second }.first
                    stack += locals[n]
                }
                0x21 -> {
                    val n = uleb(code, ip).also { ip = it.second }.first
                    locals[n] = stack.removeAt(stack.lastIndex)
                }
                0x23 -> {
                    uleb(code, ip).also { ip = it.second }
                    stack += global[0]
                }
                0x24 -> {
                    uleb(code, ip).also { ip = it.second }
                    global[0] = stack.removeAt(stack.lastIndex)
                }
                0x2d -> {
                    uleb(code, ip).also { ip = it.second }
                    val offset = uleb(code, ip).also { ip = it.second }.first
                    val addr = stack.removeAt(stack.lastIndex) + offset
                    stack += mem[addr].toInt() and 0xff
                }
                0x3a -> {
                    uleb(code, ip).also { ip = it.second }
                    val offset = uleb(code, ip).also { ip = it.second }.first
                    val value = stack.removeAt(stack.lastIndex) and 0xff
                    val addr = stack.removeAt(stack.lastIndex) + offset
                    mem[addr] = value.toByte()
                }
                0x41 -> {
                    val decoded = ileb(code, ip)
                    ip = decoded.second
                    stack += decoded.first
                }
                0x4f -> {
                    val right = stack.removeAt(stack.lastIndex).toLong() and 0xffffffffL
                    val left = stack.removeAt(stack.lastIndex).toLong() and 0xffffffffL
                    stack += if (left >= right) 1 else 0
                }
                0x6a -> binary(stack) { a, b -> a + b }
                0x6b -> binary(stack) { a, b -> a - b }
                0x6c -> binary(stack) { a, b -> a * b }
                0x71 -> binary(stack) { a, b -> a and b }
                0x72 -> binary(stack) { a, b -> a or b }
                0x73 -> binary(stack) { a, b -> a xor b }
                0x74 -> {
                    val shift = stack.removeAt(stack.lastIndex) and 31
                    val value = stack.removeAt(stack.lastIndex)
                    stack += value shl shift
                }
                0x76 -> {
                    val shift = stack.removeAt(stack.lastIndex) and 31
                    val value = stack.removeAt(stack.lastIndex).toLong() and 0xffffffffL
                    stack += (value ushr shift).toInt()
                }
                else -> error("Unsupported wasm opcode ${op.toString(16)}")
            }
        }
        return stack.lastOrNull()
    }

    private data class Frame(val loop: Boolean, val restart: Int, val base: Int)

    companion object {
        fun parse(wasm: ByteArray): WasmModule {
            var i = 8
            var code = ByteArray(0)
            var dataSection = ByteArray(0)
            while (i < wasm.size) {
                val id = wasm[i].toInt() and 0xff
                i += 1
                val sized = uleb(wasm, i)
                i = sized.second
                val body = wasm.copyOfRange(i, i + sized.first)
                i += sized.first
                if (id == 10) code = body
                if (id == 11) dataSection = body
            }
            var p = 0
            val count = uleb(code, p).also { p = it.second }.first
            val functions = ArrayList<ByteArray>(count)
            repeat(count) {
                val size = uleb(code, p).also { pair -> p = pair.second }.first
                functions += code.copyOfRange(p, p + size)
                p += size
            }
            var q = 0
            val segments = uleb(dataSection, q).also { q = it.second }.first
            var offset = 0
            var bytes = ByteArray(0)
            repeat(segments) {
                q += 1
                check(dataSection[q].toInt() == 0x41)
                q += 1
                val off = ileb(dataSection, q)
                q = off.second
                check(dataSection[q].toInt() == 0x0b)
                q += 1
                val n = uleb(dataSection, q).also { pair -> q = pair.second }.first
                offset = off.first
                bytes = dataSection.copyOfRange(q, q + n)
                q += n
            }
            return WasmModule(functions, offset, bytes)
        }

        private fun uleb(bytes: ByteArray, start: Int): Pair<Int, Int> {
            var result = 0
            var shift = 0
            var i = start
            while (true) {
                val byte = bytes[i].toInt() and 0xff
                i += 1
                result = result or ((byte and 0x7f) shl shift)
                if (byte and 0x80 == 0) return result to i
                shift += 7
            }
        }

        private fun ileb(bytes: ByteArray, start: Int): Pair<Int, Int> {
            var result = 0
            var shift = 0
            var i = start
            var byte: Int
            while (true) {
                byte = bytes[i].toInt() and 0xff
                i += 1
                result = result or ((byte and 0x7f) shl shift)
                shift += 7
                if (byte and 0x80 == 0) break
            }
            if (shift < 32 && byte and 0x40 != 0) result = result or (-1 shl shift)
            return result to i
        }

        private fun binary(stack: ArrayList<Int>, op: (Int, Int) -> Int) {
            val right = stack.removeAt(stack.lastIndex)
            val left = stack.removeAt(stack.lastIndex)
            stack += op(left, right)
        }

        private fun skipEnd(code: ByteArray, start: Int, depthStart: Int): Int {
            var ip = start
            var depth = depthStart
            while (depth > 0 && ip < code.size) {
                val op = code[ip].toInt() and 0xff
                ip += 1
                when (op) {
                    0x02, 0x03, 0x04 -> {
                        ip += 1
                        depth += 1
                    }
                    0x0b -> depth -= 1
                    0x0c, 0x0d, 0x10, 0x20, 0x21, 0x22, 0x23, 0x24 -> ip = uleb(code, ip).second
                    0x28, 0x2d, 0x36, 0x3a -> {
                        ip = uleb(code, ip).second
                        ip = uleb(code, ip).second
                    }
                    0x41 -> ip = ileb(code, ip).second
                }
            }
            return ip
        }
    }
}
