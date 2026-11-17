// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.local

import site.anikitty.app.data.skip.SkipTimes

/** Last stretch of an episode that counts as watched when the credits time is unknown. */
const val WATCHED_REMAINING_MS = 90_000L

/**
 * True once this episode should be marked watched.
 *
 * The credits/outro start wins when that marker exists. Otherwise the episode
 * is watched when fewer than [WATCHED_REMAINING_MS] remain, and only after the
 * duration is known and the playhead has moved. A clip shorter than that
 * window is not completed on the opening frame.
 */
fun shouldMarkWatched(
    positionMs: Long,
    durationMs: Long,
    skip: SkipTimes = SkipTimes(),
): Boolean {
    val creditsStartMs = skip.outro?.startMs?.takeIf { it > 0L }
    if (creditsStartMs != null && positionMs >= creditsStartMs) return true
    if (durationMs <= 0L || positionMs <= 0L) return false
    return durationMs - positionMs < WATCHED_REMAINING_MS
}
