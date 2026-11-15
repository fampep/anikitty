// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import org.json.JSONArray
import org.json.JSONObject

/** Pull a sprite-sheet VTT URL out of a Flix embed object or an extension source. */
internal fun thumbnailTrackFromJson(json: JSONObject, headers: Map<String, String>): ThumbnailTrack? {
    val keys = listOf("thumbnails", "thumbnail", "thumbnailUrl", "thumbnailsUrl", "storyboard", "preview")
    for (key in keys) {
        if (!json.has(key) || json.isNull(key)) continue
        val track = when (val value = json.opt(key)) {
            is String -> {
                val url = value.trim()
                if (url.startsWith("http")) ThumbnailTrack(url, headers) else null
            }
            is JSONObject -> {
                val url = value.optString("url").ifBlank { value.optString("file") }.trim()
                if (!url.startsWith("http")) {
                    null
                } else {
                    val extra = linkedMapOf<String, String>()
                    val headerObj = value.optJSONObject("headers")
                    if (headerObj != null) {
                        val names = headerObj.keys()
                        while (names.hasNext()) {
                            val name = names.next()
                            val header = headerObj.optString(name).trim()
                            if (header.isNotEmpty()) extra[name] = header
                        }
                    }
                    ThumbnailTrack(url, headers + extra)
                }
            }
            else -> null
        } ?: continue
        // A poster under "thumbnail" must not hide a later sprite VTT.
        if (isSpriteVtt(track.url)) return track
    }
    return null
}

/** A captions/tracks row whose kind or file is a sprite sheet, not a subtitle. */
internal fun thumbnailTrackFromTracks(tracks: JSONArray?, headers: Map<String, String>): ThumbnailTrack? {
    if (tracks == null) return null
    for (i in 0 until tracks.length()) {
        val row = tracks.optJSONObject(i) ?: continue
        val kind = row.optString("kind").ifBlank { row.optString("type") }
        val file = row.optString("file").ifBlank { row.optString("url") }.trim()
        if (!file.startsWith("http") || !looksLikeThumbnail(kind, file)) continue
        return ThumbnailTrack(file, headers)
    }
    return null
}

/**
 * Sprite URL from embed HTML or a playlist. Poster stills and subtitle
 * WebVTT files are ignored. A signed query string stays on the URL.
 */
internal fun thumbnailUrlFromLooseText(text: String): String? {
    val explicit = Regex(
        """(?i)(?:data-thumbnails|data-thumbnail|["']thumbnails?["']|["']storyboard["'])\s*[=:]\s*["'](https?://[^"']+)""",
    )
    for (match in explicit.findAll(text)) {
        val url = match.groupValues.getOrNull(1)?.trim().orEmpty()
        if (isSpriteVtt(url)) return url
    }
    return Regex(
        """https?://[^\s"'<>]+(?:thumb|sprite|storyboard)[^\s"'<>]*\.vtt(?:\?[^\s"'<>]*)?(?:#[^\s"'<>]*)?""",
        RegexOption.IGNORE_CASE,
    ).find(text)?.value
}

/** A sprite-sheet VTT. Poster images and other non-VTT URLs are dropped. */
internal fun spriteTrack(track: ThumbnailTrack?): ThumbnailTrack? {
    val url = track?.url ?: return null
    return if (isSpriteVtt(url)) track else null
}

private fun looksLikeThumbnail(kind: String, file: String): Boolean {
    if (!isSpriteVtt(file)) return false
    val hint = "$kind $file"
    return hint.contains("thumb", ignoreCase = true) ||
        hint.contains("sprite", ignoreCase = true) ||
        hint.contains("storyboard", ignoreCase = true)
}

/** Path ends in .vtt, query string included. jpg/png/webp posters do not. */
private fun isSpriteVtt(url: String): Boolean {
    val path = url.substringBefore('#').substringBefore('?').lowercase()
    return path.endsWith(".vtt")
}
