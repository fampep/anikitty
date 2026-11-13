// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data

/** Short copy for failures the person can act on. */
fun friendlyFailure(raw: String?): String {
    val msg = raw?.trim().orEmpty()
    if (msg.isEmpty()) return "Something went wrong. Try again."
    val lower = msg.lowercase()
    return when {
        "429" in msg || "rate limit" in lower ->
            "AniList is busy. Wait a moment and try again."
        "timeout" in lower || "timed out" in lower ||
            "failed to connect" in lower || "unable to resolve" in lower ||
            "network" in lower || "connection reset" in lower ->
            "No connection. Check the network and try again."
        "http 403" in lower || " 403" in lower ->
            "That request was blocked. Try again in a moment."
        "http 404" in lower || " 404" in lower ->
            "That page was not found."
        else -> msg.take(160)
    }
}

/** Minutes still left in an episode, or null when there is nothing to resume. */
fun minutesLeft(positionMs: Long, durationMs: Long): Int? {
    if (durationMs <= 30_000L || positionMs < 15_000L) return null
    val left = durationMs - positionMs
    if (left < 15_000L) return null
    return (left / 60_000L).toInt().coerceAtLeast(1)
}

/** Clock label, or a short countdown when the episode is about to air. */
fun airingLabel(airingAtEpochSec: Long, nowEpochSec: Long, clock: String): String {
    val delta = airingAtEpochSec - nowEpochSec
    return when {
        delta < -20 * 60 -> clock
        delta <= 60 -> "Now"
        delta < 60 * 60 -> "in ${delta / 60} min"
        else -> clock
    }
}

/** Short relative time for a library row. Blank when the watch is older than two weeks. */
fun watchedAgo(updatedAtEpochMs: Long, nowEpochMs: Long = System.currentTimeMillis()): String {
    if (updatedAtEpochMs <= 0L) return ""
    val minutes = ((nowEpochMs - updatedAtEpochMs).coerceAtLeast(0L) / 60_000L)
    return when {
        minutes < 1L -> "Just now"
        minutes < 60L -> "${minutes}m ago"
        minutes < 60L * 24L -> "${minutes / 60L}h ago"
        minutes < 60L * 24L * 14L -> "${minutes / (60L * 24L)}d ago"
        else -> ""
    }
}

/** Drop AniList source footnotes and leftover entities after tag stripping. */
fun plainSynopsis(raw: String): String {
    return raw
        .replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&#039;", "'")
        .replace("&apos;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace(Regex("""\s*\(?\s*Source:.*$""", RegexOption.IGNORE_CASE), "")
        .replace(Regex("""\s+"""), " ")
        .trim()
}
