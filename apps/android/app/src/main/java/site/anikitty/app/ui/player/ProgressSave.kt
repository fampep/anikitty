// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.player

/**
 * Whether the playhead has moved far enough to write watch history.
 *
 * Forward playback saves every [stepMs]. A rewind does too, so leaving the
 * app after skipping back does not resume at the later spot. A drop to the
 * opening moments is the player resetting, not a seek, and is left for the
 * next real position. An opening resume that has not landed yet is skipped
 * so the pre-seek clock is not stored.
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
