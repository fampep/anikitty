// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.skip

import kotlin.math.abs

/** Shortest intro or credits window that is still a real skip, not a glitch. */
const val MIN_SKIP_SEC = 5.0

/** Longest intro or credits window we will trust. */
const val MAX_SKIP_SEC = 180.0

/**
 * How far a stream may differ from the AniSkip episode length and still be
 * the same cut. The difference is added to the marker.
 */
const val MAX_SKIP_OFFSET_SEC = 90.0

/** One AniSkip opening or ending, timed against that result's episode length. */
data class AniSkipStamp(
    val kind: String,
    val startSec: Double,
    val endSec: Double,
    val episodeLengthSec: Double,
)

private val MAL_HINT = Regex("""(?i)\bmal:(\d+)\b""")

/** MAL id carried on a stream title hint (`mal:43`). Zero when the hint has none. */
fun malIdFromTitleHint(titleHint: String?): Int {
    val raw = MAL_HINT.find(titleHint.orEmpty())?.groupValues?.getOrNull(1) ?: return 0
    return raw.toIntOrNull()?.takeIf { it > 0 } ?: 0
}

/**
 * Drop a window that is inverted, tiny, huge, or past the known duration.
 * [durationSec] of 0 means the player does not know the length yet.
 */
fun sanitizeInterval(interval: SkipInterval?, durationSec: Double = 0.0): SkipInterval? {
    if (interval == null) return null
    val start = interval.startSec
    val end = interval.endSec
    if (!start.isFinite() || !end.isFinite()) return null
    if (start < 0.0 || end <= start) return null
    val length = end - start
    if (length < MIN_SKIP_SEC || length > MAX_SKIP_SEC) return null
    if (durationSec > 0.0 && (start >= durationSec || end > durationSec + 1.5)) return null
    return interval
}

/** Keep only the intervals that pass [sanitizeInterval]. */
fun sanitizeSkip(skip: SkipTimes, durationSec: Double = 0.0): SkipTimes = SkipTimes(
    intro = sanitizeInterval(skip.intro, durationSec),
    outro = sanitizeInterval(skip.outro, durationSec),
    recap = sanitizeInterval(skip.recap, durationSec),
    preview = sanitizeInterval(skip.preview, durationSec),
)

/**
 * Markers for the stream that is actually playing.
 *
 * The provider's own intro and credits win. A missing side is filled from the
 * AniSkip result whose episode length is closest to [durationSec], shifted by
 * that difference. No duration, or no close match, leaves that side empty.
 */
fun chooseSkip(
    provider: SkipTimes,
    aniskip: List<AniSkipStamp> = emptyList(),
    durationSec: Double = 0.0,
): SkipTimes {
    val own = sanitizeSkip(provider, durationSec)
    return SkipTimes(
        intro = own.intro ?: aniskipInterval("op", aniskip, durationSec),
        outro = own.outro ?: aniskipInterval("ed", aniskip, durationSec),
        recap = own.recap,
        preview = own.preview,
    )
}

private fun aniskipInterval(
    kind: String,
    stamps: List<AniSkipStamp>,
    durationSec: Double,
): SkipInterval? {
    if (durationSec <= 0.0) return null
    val match = stamps
        .asSequence()
        .filter { it.kind == kind && it.episodeLengthSec > 0.0 }
        .minByOrNull { abs(it.episodeLengthSec - durationSec) }
        ?: return null
    val offset = durationSec - match.episodeLengthSec
    if (abs(offset) > MAX_SKIP_OFFSET_SEC) return null
    return sanitizeInterval(
        SkipInterval(match.startSec + offset, match.endSec + offset),
        durationSec,
    )
}
