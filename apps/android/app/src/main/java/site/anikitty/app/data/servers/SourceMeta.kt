// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

/**
 * Optional stream facts a resolver actually observed.
 * Missing fields stay null so the UI draws no badge.
 */
data class SourceFields(
    val quality: String? = null,
    val audio: String? = null,
    val qualityRating: String? = null,
)

/**
 * Maps built-in resolver evidence into [SourceFields].
 * Does not invent a grade from height. Codec and channel layout are set only
 * when the playlist or provider label states them.
 */
object BuiltInSourceMeta {
    fun anikoto(providerLabel: String, audioMode: String): SourceFields {
        val quality = resolutionToken(providerLabel)
        val rating = gradeToken(providerLabel)
        return SourceFields(
            quality = quality,
            audio = modeWord(audioMode),
            qualityRating = rating,
        )
    }

    fun reanime(streamInf: String, audioMode: String, audioMedia: String? = null): SourceFields =
        fromHls(streamInf, audioMode, audioMedia)

    /** mkissa states a video height on the episode, not a grade word. */
    fun mkissa(videoHeight: Int?, audioMode: String): SourceFields = SourceFields(
        quality = videoHeight?.let { heightLabel(it) },
        audio = when {
            audioMode.equals("dub", true) -> "DUB"
            audioMode.equals("sub", true) -> "SUB"
            audioMode.equals("raw", true) -> "RAW"
            else -> null
        },
    )

    fun gotaku(streamInf: String, audioMode: String, audioMedia: String? = null): SourceFields =
        fromHls(streamInf, audioMode, audioMedia)

    /** kaa.lt states resolution on the vidstream master playlist. */
    fun kaa(streamInf: String, audioMode: String): SourceFields = fromHls(streamInf, audioMode, null)

    /** animex.one states resolution on the master playlist, including deeznuts.txt. */
    fun animex(streamInf: String, audioMode: String): SourceFields = fromHls(streamInf, audioMode, null)

    /** xanime.app states resolution on the master playlist. Variants are a-index-….ico. */
    fun xanime(streamInf: String, audioMode: String): SourceFields = fromHls(streamInf, audioMode, null)

    /** ani.nz states resolution on the settlar master playlist. */
    fun aninz(streamInf: String, audioMode: String): SourceFields = fromHls(streamInf, audioMode, null)

    /** HTTP extensions: copy the optional JSON fields and nothing else. */
    fun fromExtension(quality: String?, audio: String?, qualityRating: String?): SourceFields =
        SourceFields(
            quality = quality?.trim()?.ifBlank { null },
            audio = audio?.trim()?.ifBlank { null },
            qualityRating = qualityRating?.trim()?.ifBlank { null },
        )

    private fun fromHls(streamInf: String, audioMode: String, audioMedia: String?): SourceFields {
        val quality = resolutionToken(streamInf)
        val codecs = attr(streamInf, "CODECS").orEmpty()
        val codec = audioCodec(codecs)
        val channels = channelLayout(attr(streamInf, "CHANNELS") ?: attr(audioMedia.orEmpty(), "CHANNELS"))
        val mode = modeWord(audioMode)
        val audio = listOfNotNull(codec, channels, mode).joinToString(" · ").ifBlank { null }
        return SourceFields(quality = quality, audio = audio, qualityRating = null)
    }

    private fun resolutionToken(text: String): String? {
        Regex("""RESOLUTION=\d+x(\d+)""", RegexOption.IGNORE_CASE).find(text)?.groupValues?.get(1)
            ?.toIntOrNull()
            ?.let { return heightLabel(it) }
        Regex("""(\d{3,4})\s*p""", RegexOption.IGNORE_CASE).find(text)?.groupValues?.get(1)
            ?.toIntOrNull()
            ?.let { return heightLabel(it) }
        if (Regex("""\b4\s*k\b""", RegexOption.IGNORE_CASE).containsMatchIn(text)) return "4K"
        return null
    }

    private fun heightLabel(height: Int): String? = when {
        height >= 2000 -> "4K"
        height >= 360 -> "${height}p"
        else -> null
    }

    private fun gradeToken(text: String): String? {
        val hit = Regex("""\b(UHD|FHD|HD|SD|HQ)\b""", RegexOption.IGNORE_CASE).find(text) ?: return null
        return hit.groupValues[1].uppercase()
    }

    private fun modeWord(audioMode: String): String? = when {
        audioMode.equals("dub", true) -> "DUB"
        audioMode.equals("sub", true) -> "SUB"
        else -> null
    }

    private fun attr(line: String, name: String): String? {
        if (line.isBlank()) return null
        val quoted = Regex("""$name="([^"]*)"""", RegexOption.IGNORE_CASE).find(line)
        if (quoted != null) return quoted.groupValues[1]
        return Regex("""$name=([^,\s]+)""", RegexOption.IGNORE_CASE).find(line)?.groupValues?.get(1)
    }

    private fun audioCodec(codecs: String): String? {
        val parts = codecs.split(',').map { it.trim().lowercase() }
        return when {
            parts.any { it.startsWith("mp4a") || it.startsWith("aac") } -> "AAC"
            parts.any { it.startsWith("ac-3") || it == "ac3" } -> "AC3"
            parts.any { it.startsWith("ec-3") || it == "eac3" } -> "EAC3"
            parts.any { it.startsWith("opus") } -> "Opus"
            parts.any { it.startsWith("flac") } -> "FLAC"
            parts.any { it.startsWith("dts") } -> "DTS"
            else -> null
        }
    }

    private fun channelLayout(raw: String?): String? = when (raw?.trim()) {
        "1" -> "1.0"
        "2" -> "2.0"
        "6" -> "5.1"
        "8" -> "7.1"
        else -> null
    }
}
