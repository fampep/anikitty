// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import org.json.JSONObject

/** Pull a sprite-sheet VTT URL out of a Flix embed object or an extension source. */
internal fun thumbnailTrackFromJson(json: JSONObject, headers: Map<String, String>): ThumbnailTrack? {
    val keys = listOf("thumbnails", "thumbnail", "thumbnailUrl", "thumbnailsUrl", "storyboard", "preview")
    for (key in keys) {
        if (!json.has(key) || json.isNull(key)) continue
        when (val value = json.opt(key)) {
            is String -> {
                val url = value.trim()
                if (url.startsWith("http")) return ThumbnailTrack(url, headers)
            }
            is JSONObject -> {
                val url = value.optString("url").ifBlank { value.optString("file") }.trim()
                if (!url.startsWith("http")) continue
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
                return ThumbnailTrack(url, headers + extra)
            }
        }
    }
    return null
}
