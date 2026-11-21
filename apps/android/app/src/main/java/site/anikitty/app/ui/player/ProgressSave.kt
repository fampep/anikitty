// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.player

/**
 * Resume target to hold until the player actually reaches it.
 * A later request wins. Zero means nothing is waiting.
 */
internal fun armedResumeMs(armedMs: Long, requestedMs: Long): Long =
    if (requestedMs > 2_000L) maxOf(armedMs, requestedMs) else armedMs

/**
 * Duration reported by the player that is on screen now.
 * An unknown or untrusted sample stays 0. The previous file's length must
 * not be substituted, or a short leftover looks final and drops the hold.
 */
internal fun liveDurationForResume(playerDurationMs: Long, clockTrusted: Boolean): Long =
    if (clockTrusted && playerDurationMs > 0L) playerDurationMs else 0L

/**
 * Drop a resume target the player will not seek to.
 * The seek is skipped when this player's own duration is known and no longer
 * than the target. An unknown duration (0) keeps the hold until that length arrives.
 */
internal fun reachableResumeMs(heldMs: Long, durationMs: Long): Long {
    if (heldMs <= 2_000L) return 0L
    if (durationMs > 0L && durationMs <= heldMs) return 0L
    return heldMs
}

/**
 * True while [positionMs] is still behind a resume seek.
 * Quality, failover, and offline reloads start the player near zero and then
 * seek. That gap is not a rewind.
 */
internal fun resumeStillAhead(armedMs: Long, positionMs: Long): Boolean =
    armedMs > 2_000L && positionMs < armedMs - 1_000L

/**
 * Whether the playhead has moved far enough to write watch history.
 *
 * Forward playback saves every [stepMs]. A rewind does too, so leaving the
 * app after skipping back does not resume at the later spot. A drop to the
 * opening moments is the player resetting, not a seek, and is left for the
 * next real position. A resume seek that has not landed yet is skipped so
 * the pre-seek clock is not stored.
 */
internal fun progressSaveDue(
    positionMs: Long,
    lastSavedMs: Long,
    stepMs: Long = 2_000L,
    openingSeekPending: Boolean = false,
): Boolean {
    if (openingSeekPending || stepMs <= 0L || positionMs < 0L) return false
    val delta = positionMs - lastSavedMs
    if (delta >= stepMs) return true
    return delta <= -stepMs && positionMs >= 1_000L
}
