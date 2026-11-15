// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.player

internal data class ThumbnailCue(
    val startMs: Long,
    val endMs: Long,
    val spriteUrl: String,
    val x: Int,
    val y: Int,
    val w: Int,
    val h: Int,
)

/**
 * WebVTT thumbnail cues. A payload is a sprite URL plus an optional
 * `#xywh=x,y,w,h` crop. Relative sprite paths resolve against the VTT URL.
 */
internal fun parseThumbnailVtt(body: String, vttUrl: String): List<ThumbnailCue> {
    val cues = ArrayList<ThumbnailCue>()
    val lines = body.replace("\r\n", "\n").replace('\r', '\n').lines()
    var i = 0
    while (i < lines.size) {
        val range = parseCueRange(lines[i].trim())
        if (range == null) {
            i++
            continue
        }
        i++
        val payload = StringBuilder()
        while (i < lines.size && lines[i].isNotBlank()) {
            if (payload.isNotEmpty()) payload.append('\n')
            payload.append(lines[i].trim())
            i++
        }
        val raw = payload.lineSequence().map { it.trim() }.lastOrNull { it.isNotEmpty() } ?: continue
        val cue = cueFromPayload(raw, vttUrl, range.first, range.second) ?: continue
        cues += cue
    }
    return cues
}

internal fun cueAt(cues: List<ThumbnailCue>, positionMs: Long): ThumbnailCue? {
    if (cues.isEmpty()) return null
    val ms = positionMs.coerceAtLeast(0L)
    return cues.firstOrNull { ms >= it.startMs && ms < it.endMs }
        ?: cues.lastOrNull { ms >= it.startMs }
        ?: cues.first()
}

private fun parseCueRange(line: String): Pair<Long, Long>? {
    val arrow = line.indexOf("-->")
    if (arrow < 0) return null
    val start = parseVttTime(line.substring(0, arrow).trim()) ?: return null
    val end = parseVttTime(line.substring(arrow + 3).trim().substringBefore(' ')) ?: return null
    if (end <= start) return null
    return start to end
}

private fun parseVttTime(raw: String): Long? {
    val clock = raw.trim()
    if (clock.isEmpty()) return null
    val main = clock.substringBefore('.')
    val fraction = clock.substringAfter('.', "0").padEnd(3, '0').take(3).toLongOrNull() ?: return null
    val parts = main.split(':')
    if (parts.size !in 2..3) return null
    val numbers = parts.map { it.toLongOrNull() ?: return null }
    val hours = if (numbers.size == 3) numbers[0] else 0L
    val minutes = numbers[numbers.size - 2]
    val seconds = numbers.last()
    return ((hours * 60 + minutes) * 60 + seconds) * 1000 + fraction
}

private fun cueFromPayload(raw: String, vttUrl: String, startMs: Long, endMs: Long): ThumbnailCue? {
    val xywh = Regex("""xywh=(\d+),(\d+),(\d+),(\d+)""").find(raw)
    val bare = raw.substringBefore('#').trim()
    if (bare.isEmpty()) return null
    val sprite = resolveSpriteUrl(bare, vttUrl) ?: return null
    val x = xywh?.groupValues?.get(1)?.toIntOrNull() ?: 0
    val y = xywh?.groupValues?.get(2)?.toIntOrNull() ?: 0
    val w = xywh?.groupValues?.get(3)?.toIntOrNull() ?: 0
    val h = xywh?.groupValues?.get(4)?.toIntOrNull() ?: 0
    return ThumbnailCue(startMs, endMs, sprite, x, y, w, h)
}

private fun resolveSpriteUrl(raw: String, vttUrl: String): String? {
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw
    val withoutHash = vttUrl.substringBefore('#')
    val query = withoutHash.substringAfter('?', "")
    val base = withoutHash.substringBefore('?')
    val resolved = when {
        raw.startsWith("//") -> {
            val scheme = base.substringBefore("://", "https")
            "$scheme:$raw"
        }
        raw.startsWith("/") -> {
            val origin = Regex("""^https?://[^/]+""").find(base)?.value ?: return null
            origin + raw
        }
        else -> {
            val dir = base.substringBeforeLast('/', "")
            if (!dir.startsWith("http")) return null
            "$dir/$raw"
        }
    }
    if (query.isEmpty() || resolved.contains('?')) return resolved
    return "$resolved?$query"
}
