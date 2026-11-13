// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.skip

/**
 * Intro / credits / recap / preview windows in seconds — same shape as the web
 * `SkipTimes` used by KittyPlayer.
 */
data class SkipInterval(val startSec: Double, val endSec: Double) {
    val startMs: Long get() = (startSec * 1000.0).toLong()
    val endMs: Long get() = (endSec * 1000.0).toLong()
    fun contains(positionMs: Long): Boolean =
        positionMs >= startMs && positionMs < endMs
}

data class SkipTimes(
    val intro: SkipInterval? = null,
    val outro: SkipInterval? = null,
    val recap: SkipInterval? = null,
    val preview: SkipInterval? = null,
) {
    val segments: List<Pair<String, SkipInterval>>
        get() = listOfNotNull(
            recap?.let { "recap" to it },
            intro?.let { "intro" to it },
            outro?.let { "credits" to it },
            preview?.let { "preview" to it },
        )

    fun activeAt(positionMs: Long): Pair<String, SkipInterval>? =
        segments.firstOrNull { (_, iv) -> iv.contains(positionMs) }

    val isEmpty: Boolean
        get() = intro == null && outro == null && recap == null && preview == null
}
