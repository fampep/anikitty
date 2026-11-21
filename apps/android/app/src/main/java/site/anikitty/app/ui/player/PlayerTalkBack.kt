// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.player

/** Phrases TalkBack reads for the player and cast controls. */
internal fun downloadActionDescription(label: String): String {
    val saving = SAVING_PERCENT.matchEntire(label)
    if (saving != null) return "Saving this episode, ${saving.groupValues[1]} percent"
    return when {
        label == "Download" -> "Download this episode"
        label == "Queued" -> "Download queued"
        label == "Saving…" -> "Saving this episode"
        label == "Saved" -> "Saved on this device"
        label == "Retry download" -> "Retry download"
        label.startsWith("Retry · ") -> "Retry download. ${label.removePrefix("Retry · ")}"
        else -> label
    }
}

internal fun removeDownloadDescription(): String = "Remove downloaded episode"

internal fun skipActionDescription(kind: String): String = when (kind) {
    "intro" -> "Skip intro"
    "credits" -> "Skip outro"
    "recap" -> "Skip recap"
    "preview" -> "Skip preview"
    else -> "Skip"
}

internal fun castButtonDescription(unavailable: String?): String =
    if (unavailable.isNullOrBlank()) "Cast" else "Cast unavailable. $unavailable"

internal fun castStatusDescription(
    buffering: Boolean,
    isMovie: Boolean,
    episode: Int,
    title: String,
    connecting: Boolean = false,
): String {
    val state = when {
        connecting -> "Connecting to your TV"
        buffering -> "Buffering on your TV"
        else -> "Casting to your TV"
    }
    val what = if (isMovie) title else "Episode $episode, $title"
    return "$state. $what"
}

internal fun playerToolDescription(
    label: String,
    value: String,
    enabled: Boolean,
    selected: Boolean,
): String {
    val shown = value.takeIf { it.isNotBlank() && it != "—" }
    val core = if (shown == null) label else "$label, $shown"
    return when {
        !enabled -> "$core, unavailable"
        selected -> "$core, selected"
        else -> core
    }
}

internal fun episodeCellDescription(number: Int, selected: Boolean, watched: Boolean): String {
    val state = when {
        selected -> "playing"
        watched -> "watched"
        else -> null
    }
    return if (state == null) "Episode $number" else "Episode $number, $state"
}

internal fun menuRowDescription(label: String, value: String, selected: Boolean): String {
    val core = if (value.isBlank()) label else "$label, $value"
    return if (selected) "$core, selected" else core
}

internal fun audioChoiceDescription(label: String, selected: Boolean): String =
    if (selected) "$label, selected" else label

internal fun autoplayDescription(on: Boolean): String =
    if (on) "Autoplay next episode, on" else "Autoplay next episode, off"

internal fun seekFlashDescription(deltaMs: Long): String {
    val seconds = (kotlin.math.abs(deltaMs) / 1000L).toInt().coerceAtLeast(1)
    val direction = if (deltaMs < 0L) "Back" else "Forward"
    return "$direction ${countWord(seconds, "second")}"
}

internal fun playbackClockDescription(positionMs: Long, durationMs: Long): String {
    val position = positionMs.coerceAtLeast(0L)
    val duration = durationMs.coerceAtLeast(0L)
    val remain = (duration - position).coerceAtLeast(0L)
    return "Elapsed ${spokenDuration(position)}, ${spokenDuration(remain)} remaining"
}

internal fun seekBarDescription(progress: Float, durationMs: Long): String {
    if (durationMs <= 0L) return "Seek"
    val at = (progress.coerceIn(0f, 1f) * durationMs).toLong()
    return "Seek, ${spokenDuration(at)} of ${spokenDuration(durationMs)}"
}

internal fun spokenDuration(ms: Long): String {
    val totalSec = (ms.coerceAtLeast(0L) / 1000L).toInt()
    val hours = totalSec / 3600
    val minutes = (totalSec % 3600) / 60
    val seconds = totalSec % 60
    val parts = mutableListOf<String>()
    if (hours > 0) parts += countWord(hours, "hour")
    if (minutes > 0 || hours > 0) parts += countWord(minutes, "minute")
    if (seconds > 0 || parts.isEmpty()) parts += countWord(seconds, "second")
    return parts.joinToString(" ")
}

private fun countWord(count: Int, singular: String): String =
    "$count ${if (count == 1) singular else "${singular}s"}"

private val SAVING_PERCENT = Regex("""Saving (\d+)%""")
