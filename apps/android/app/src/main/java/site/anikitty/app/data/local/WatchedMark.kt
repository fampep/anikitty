// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.local

import site.anikitty.app.data.skip.SkipTimes

/** Last stretch of an episode that counts as watched when the credits time is unknown. */
const val WATCHED_REMAINING_MS = 90_000L

/**
 * What the auto-watched path should do with the history row.
 *
 * [AutoMarkDecision.RetryPush] repeats the completed count only while the row is still
 * the next episode. [AutoMarkDecision.Stop] means a later mark, or an unwatch that put
 * the frontier back, owns the list. This episode must not be reported again.
 */
enum class AutoMarkDecision {
    MarkLocal,
    RetryPush,
    Stop,
}

/**
 * A failed AniList save may be retried only while the row is still exactly the
 * next episode. A later mark, or an unwatch that put the frontier back on
 * [currentEpisode], must not be overwritten with that completed count.
 */
fun autoMarkDecision(storedEpisode: Int, currentEpisode: Int, localMarked: Boolean): AutoMarkDecision =
    when {
        localMarked && storedEpisode == currentEpisode + 1 -> AutoMarkDecision.RetryPush
        storedEpisode > currentEpisode || localMarked -> AutoMarkDecision.Stop
        else -> AutoMarkDecision.MarkLocal
    }

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
