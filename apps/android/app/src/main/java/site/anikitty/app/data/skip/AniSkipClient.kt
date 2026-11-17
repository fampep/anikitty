// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.skip

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/**
 * AniSkip timestamps for one episode. The player shifts them onto the
 * stream that is playing. A failed request is an empty list.
 */
class AniSkipClient(
    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(6, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .callTimeout(10, TimeUnit.SECONDS)
        .build(),
) {
    private val cache = ConcurrentHashMap<String, List<AniSkipStamp>>()

    suspend fun load(malId: Int, episode: Int): List<AniSkipStamp> = withContext(Dispatchers.IO) {
        if (malId <= 0 || episode <= 0) return@withContext emptyList()
        val key = "$malId:$episode"
        cache[key]?.let { return@withContext it }
        val loaded = runCatching { fetch(malId, episode) }.getOrDefault(emptyList())
        cache[key] = loaded
        loaded
    }

    private fun fetch(malId: Int, episode: Int): List<AniSkipStamp> {
        val url = "$BASE/$malId/$episode?types=op&types=ed&types=mixed-op&types=mixed-ed&episodeLength=0"
        val req = Request.Builder()
            .url(url)
            .header("Accept", "application/json")
            .header("User-Agent", "AniKitty")
            .get()
            .build()
        http.newCall(req).execute().use { resp ->
            if (!resp.isSuccessful) return emptyList()
            return parseAniSkip(resp.body?.string().orEmpty())
        }
    }

    private companion object {
        const val BASE = "https://api.aniskip.com/v2/skip-times"
    }
}

/** AniSkip `results` rows. Unknown types and broken intervals are left out. */
fun parseAniSkip(body: String): List<AniSkipStamp> {
    val root = runCatching { JSONObject(body) }.getOrNull() ?: return emptyList()
    if (!root.optBoolean("found", false)) return emptyList()
    val rows = root.optJSONArray("results") ?: return emptyList()
    val out = ArrayList<AniSkipStamp>(rows.length())
    for (i in 0 until rows.length()) {
        val row = rows.optJSONObject(i) ?: continue
        val kind = when (row.optString("skipType")) {
            "op", "mixed-op" -> "op"
            "ed", "mixed-ed" -> "ed"
            else -> continue
        }
        val interval = row.optJSONObject("interval") ?: continue
        val start = interval.optDouble("startTime", Double.NaN)
        val end = interval.optDouble("endTime", Double.NaN)
        val length = row.optDouble("episodeLength", Double.NaN)
        if (!start.isFinite() || !end.isFinite() || !length.isFinite()) continue
        if (length <= 0.0 || end <= start) continue
        out += AniSkipStamp(kind, start, end, length)
    }
    return out
}
