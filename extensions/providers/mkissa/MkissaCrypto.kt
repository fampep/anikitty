// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.Mac
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * mkissa.to locks episode queries behind the site's aa-crypto lane.
 *
 * A boot token is two HMAC-SHA256 steps over a mask derived from the site
 * build. The bootstrap reply's partB is XOR'd with that mask to make the
 * AES-256-GCM key. The episode query is then sealed, and the reply is sealed
 * the same way. These constants come from the current site build. A new
 * build id needs a new mask.
 */
internal object MkissaCrypto {
    const val BUILD_ID = "189"
    const val LANE = "k7"
    const val EPOCH_MS = 604_800_000L
    const val QUERY_BUCKET_MS = 300_000L
    private const val BOOT_PREFIX = "iGmNgPGdi:"
    private val MASKS = arrayOf(
        "pF98Ab2CCc0=",
        "gEhpQrtSn+M=",
        "oPeHj9dBNTU=",
        "7XcuzKoXhgs=",
    )

    fun epoch(nowMs: Long): Long = nowMs / EPOCH_MS

    fun queryTimestamp(nowMs: Long): Long = nowMs / QUERY_BUCKET_MS * QUERY_BUCKET_MS

    fun maskKey(buildId: String = BUILD_ID): ByteArray {
        val id = buildId.toByteArray(Charsets.UTF_8)
        require(id.isNotEmpty())
        val mixed = ByteArray(32)
        for (i in mixed.indices) {
            val salt = (i * 175 + 202) and 0xFF
            mixed[i] = (id[i % id.size].toInt() xor salt).toByte()
        }
        val out = ByteArray(32)
        MASKS.forEachIndexed { piece, encoded ->
            val frag = Base64.getDecoder().decode(encoded)
            for (g in frag.indices) {
                val i = piece * 8 + g
                val salt = (piece * 129 + g * 61) and 0xFF
                out[i] = (frag[g].toInt() xor mixed[i].toInt() xor salt).toByte()
            }
        }
        return out
    }

    fun bootToken(
        epoch: Long,
        host: String,
        group: String,
        lane: String = LANE,
        buildId: String = BUILD_ID,
    ): String {
        val first = hmac(maskKey(buildId), (BOOT_PREFIX + buildId).toByteArray(Charsets.UTF_8))
        val message = listOf(epoch.toString(), lane, group, host, buildId).joinToString("|")
        return hmac(first, message.toByteArray(Charsets.UTF_8)).toHex()
    }

    fun aesKey(partB: String, buildId: String = BUILD_ID): ByteArray {
        val raw = Base64.getDecoder().decode(partB)
        require(raw.size >= 32) { "mkissa could not open this episode." }
        val mask = maskKey(buildId)
        return ByteArray(32) { i -> (raw[i].toInt() xor mask[i % mask.size].toInt()).toByte() }
    }

    fun seal(
        key: ByteArray,
        queryHash: String,
        epoch: Long,
        timestampMs: Long,
        lane: String = LANE,
        buildId: String = BUILD_ID,
    ): String {
        val payload = payload(queryHash, epoch, timestampMs, lane, buildId)
        val iv = sha256("$epoch:$buildId:$queryHash:$timestampMs:$lane").copyOf(12)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(128, iv))
        val body = cipher.doFinal(payload.toByteArray(Charsets.UTF_8))
        val wire = ByteArray(1 + iv.size + body.size)
        wire[0] = 1
        iv.copyInto(wire, destinationOffset = 1)
        body.copyInto(wire, destinationOffset = 13)
        return Base64.getEncoder().encodeToString(wire)
    }

    fun open(key: ByteArray, packed: String): String {
        val blob = Base64.getDecoder().decode(packed)
        require(blob.size > 13 + 16 && blob[0] == 1.toByte()) { "mkissa could not open this episode." }
        val iv = blob.copyOfRange(1, 13)
        val body = blob.copyOfRange(13, blob.size)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(128, iv))
        return cipher.doFinal(body).toString(Charsets.UTF_8)
    }

    fun sha256Hex(text: String): String = sha256(text).toHex()

    fun payload(
        queryHash: String,
        epoch: Long,
        timestampMs: Long,
        lane: String,
        buildId: String,
    ): String = """{"v":1,"ts":$timestampMs,"epoch":$epoch,"buildId":"$buildId","qh":"$queryHash","k":"$lane"}"""

    private fun sha256(text: String): ByteArray =
        java.security.MessageDigest.getInstance("SHA-256").digest(text.toByteArray(Charsets.UTF_8))

    private fun hmac(key: ByteArray, message: ByteArray): ByteArray {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(key, "HmacSHA256"))
        return mac.doFinal(message)
    }

    private fun ByteArray.toHex(): String = joinToString("") { "%02x".format(it) }
}
