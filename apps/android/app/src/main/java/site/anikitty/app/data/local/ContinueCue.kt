// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.local

import site.anikitty.app.data.minutesLeft

/**
 * What a Continue watching card should open.
 * An in-progress episode stays on that episode. A finished one moves to the next.
 */
data class ContinueCue(
    val episode: Int,
    val next: Boolean,
    val progress: Float,
    val minutesLeft: Int?,
)

fun continueCue(entry: WatchHistoryEntity, releasedEpisodes: Int? = null): ContinueCue? {
    val status = entry.listStatus?.uppercase()
    if (status == "COMPLETED" || status == "DROPPED" || status == "PLANNING" || status == "PAUSED") {
        return null
    }
    val stored = entry.episode.coerceAtLeast(0)
    val hasDuration = entry.durationMs > 30_000L
    val ratio = if (hasDuration) {
        (entry.positionMs.toFloat() / entry.durationMs.toFloat()).coerceIn(0f, 1f)
    } else {
        0f
    }
    // Same rule as playback: credits, or under 90 seconds left. Not a percent.
    val watched = hasDuration && shouldMarkWatched(entry.positionMs, entry.durationMs)
    val inProgress = hasDuration && entry.positionMs >= 15_000L && !watched
    val finishedHere = watched
    val started = entry.episodesFinished() > 0 || entry.positionMs > 0L
    if (!started && !inProgress) return null
    val cue = when {
        inProgress -> ContinueCue(
            episode = stored.coerceAtLeast(1),
            next = false,
            progress = ratio,
            minutesLeft = minutesLeft(entry.positionMs, entry.durationMs),
        )
        // The saved episode is already the one to open, unless playback is at the end of it.
        finishedHere -> ContinueCue(
            episode = stored + 1,
            next = true,
            progress = 0f,
            minutesLeft = null,
        )
        else -> ContinueCue(
            episode = stored.coerceAtLeast(1),
            next = true,
            progress = 0f,
            minutesLeft = null,
        )
    }
    if (releasedEpisodes != null && releasedEpisodes > 0 && cue.episode > releasedEpisodes) return null
    return cue
}

/** One card per series, most recently watched first, completed series omitted. */
fun continueQueue(
    history: List<WatchHistoryEntity>,
    hidden: Set<Int> = emptySet(),
    releasedEpisodes: Map<Int, Int> = emptyMap(),
): List<WatchHistoryEntity> {
    val seen = HashSet<Int>()
    return history
        .sortedByDescending { it.updatedAtEpochMs }
        .filter { entry ->
            if (entry.anilistId in hidden || entry.anilistId in seen) return@filter false
            if (continueCue(entry, releasedEpisodes[entry.anilistId]) == null) return@filter false
            seen.add(entry.anilistId)
            true
        }
}
