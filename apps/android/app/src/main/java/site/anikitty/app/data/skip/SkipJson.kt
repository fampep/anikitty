// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.skip

import org.json.JSONObject

/**
 * Read intro and credits from a provider payload.
 *
 * Accepts the shapes sites already send: a `skip` or `skip_data` object,
 * `[start, end]` arrays, `{start, end}` objects, and `op` / `ed` names.
 * Missing or broken fields become no marker.
 */
fun skipTimesFromJson(raw: JSONObject?): SkipTimes {
    if (raw == null) return SkipTimes()
    val nested = raw.optJSONObject("skip")
        ?: raw.optJSONObject("skip_data")
        ?: raw.optJSONObject("skipData")
    val source = nested ?: raw
    return sanitizeSkip(
        SkipTimes(
            intro = readInterval(source, "intro", "intro_start", "intro_end")
                ?: readInterval(source, "op", "op_start", "op_end")
                ?: readInterval(source, "opening", "opening_start", "opening_end"),
            outro = readInterval(source, "outro", "outro_start", "outro_end")
                ?: readInterval(source, "ed", "ed_start", "ed_end")
                ?: readInterval(source, "ending", "ending_start", "ending_end"),
            recap = readInterval(source, "recap", "recap_start", "recap_end"),
            preview = readInterval(source, "preview", "preview_start", "preview_end"),
        ),
    )
}

private fun readInterval(raw: JSONObject, key: String, startKey: String, endKey: String): SkipInterval? {
    val arr = raw.optJSONArray(key)
    if (arr != null && arr.length() >= 2) {
        return interval(arr.optDouble(0, Double.NaN), arr.optDouble(1, Double.NaN))
    }
    val obj = raw.optJSONObject(key)
    if (obj != null) {
        val start = obj.optDouble("start", obj.optDouble("startTime", Double.NaN))
        val end = obj.optDouble("end", obj.optDouble("endTime", Double.NaN))
        interval(start, end)?.let { return it }
    }
    if (raw.has(startKey) || raw.has(endKey)) {
        return interval(raw.optDouble(startKey, Double.NaN), raw.optDouble(endKey, Double.NaN))
    }
    return null
}

private fun interval(start: Double, end: Double): SkipInterval? {
    if (!start.isFinite() || !end.isFinite() || start < 0.0 || end <= start) return null
    return SkipInterval(start, end)
}
