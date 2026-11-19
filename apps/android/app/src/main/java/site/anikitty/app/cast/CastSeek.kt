// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.cast

/**
 * Clamp a seek so Chromecast (and local) never snap to 0 when duration is
 * still unknown — TIME_UNSET / 0 must not collapse the upper bound.
 *
 * Skip Intro and scrub both call this so cast seeks land on the marker, not
 * the start of the stream.
 */
fun safeSeekTarget(positionMs: Long, playerDurationMs: Long, knownDurationMs: Long): Long {
    val limit = when {
        playerDurationMs > 0L -> playerDurationMs
        knownDurationMs > 0L -> knownDurationMs
        else -> Long.MAX_VALUE
    }
    return positionMs.coerceIn(0L, limit)
}
