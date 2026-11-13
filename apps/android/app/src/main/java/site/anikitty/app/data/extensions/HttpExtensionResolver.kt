// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.extensions

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import site.anikitty.app.data.servers.PlayableSource
import site.anikitty.app.data.servers.StreamResolver
import site.anikitty.app.data.servers.StreamServer
import site.anikitty.app.data.servers.SubtitleTrack
import java.io.IOException

/**
 * Stream resolver that calls a user-hosted HTTP extension (apiVersion 1).
 */
class HttpExtensionResolver(
    private val manifest: ExtensionManifest,
) : StreamResolver {
    override val server = StreamServer(
        id = manifest.id,
        name = manifest.name,
        description = buildString {
            if (manifest.description.isNotBlank()) append(manifest.description)
            if (manifest.author.isNotBlank()) {
                if (isNotEmpty()) append(" · ")
                append(manifest.author)
            }
            if (isEmpty()) append("Community extension")
            append(" · v").append(manifest.version)
        },
        iconUrl = manifest.iconUrl,
        siteUrl = manifest.siteUrl ?: manifest.homepage,
    )

    override suspend fun resolve(
        anilistId: Int,
        episode: Int,
        audio: String,
        titleHint: String?,
    ): List<PlayableSource> = withContext(Dispatchers.IO) {
        require(anilistId > 0) { "anilistId required" }
        require(episode > 0) { "episode required" }
        val mode = if (audio.equals("dub", ignoreCase = true)) "dub" else "sub"
        val payload = JSONObject()
            .put("anilistId", anilistId)
            .put("episode", episode)
            .put("audio", mode)
            .put("titleHint", titleHint)
            .toString()
        val req = Request.Builder()
            .url(manifest.resolveEndpoint())
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .header("User-Agent", "AniKitty-ExtensionClient/1")
            .post(payload.toRequestBody(JSON_MEDIA))
            .build()
        val (code, body) = postOnce(req)
        if (code !in 200..299) {
            val msg = runCatching { JSONObject(body).optString("error") }
                .getOrNull()
                ?.takeIf { it.isNotBlank() }
            error(msg ?: "${manifest.name} HTTP $code")
        }
        parseSources(body).also {
            if (it.isEmpty()) error("${manifest.name} returned no playable sources")
        }
    }

    /** One retry when the connection drops. HTTP errors are returned as-is. */
    private fun postOnce(req: Request): Pair<Int, String> {
        fun call(): Pair<Int, String> {
            ExtensionHttp.client.newCall(req).execute().use { resp ->
                return resp.code to resp.body?.string().orEmpty()
            }
        }
        return try {
            call()
        } catch (first: IOException) {
            try {
                call()
            } catch (_: IOException) {
                throw first
            }
        }
    }

    private fun parseSources(body: String): List<PlayableSource> {
        val root = JSONObject(body)
        val arr = root.optJSONArray("sources") ?: JSONArray()
        val out = ArrayList<PlayableSource>()
        for (i in 0 until arr.length()) {
            val s = arr.getJSONObject(i)
            val url = s.optString("url", "").trim()
            if (!url.startsWith("http")) continue
            val headersObj = s.optJSONObject("headers")
            val headers = buildMap {
                if (headersObj != null) {
                    val keys = headersObj.keys()
                    while (keys.hasNext()) {
                        val k = keys.next()
                        put(k, headersObj.optString(k, ""))
                    }
                }
            }.filterValues { it.isNotBlank() }.toMutableMap()
            val referer = s.optString("referer").ifBlank { s.optString("Referer") }.trim()
            if (referer.startsWith("http") && headers.keys.none { it.equals("Referer", true) }) {
                headers["Referer"] = referer
            }
            val origin = s.optString("origin").ifBlank { s.optString("Origin") }.trim()
            if (origin.startsWith("http") && headers.keys.none { it.equals("Origin", true) }) {
                headers["Origin"] = origin
            }
            val subsArr = s.optJSONArray("subtitles")
            val subs = buildList {
                if (subsArr != null) {
                    for (j in 0 until subsArr.length()) {
                        val t = subsArr.getJSONObject(j)
                        val su = t.optString("url", "").trim()
                        if (!su.startsWith("http")) continue
                        add(
                            SubtitleTrack(
                                url = su,
                                label = t.optString("label", "Subs"),
                                language = t.optString("language").takeIf { it.isNotBlank() },
                                mimeType = t.optString("mimeType").takeIf { it.isNotBlank() },
                            ),
                        )
                    }
                }
            }
            out += PlayableSource(
                url = url,
                headers = headers,
                label = s.optString("label", "Stream").ifBlank { "Stream" },
                stripBytes = s.optInt("stripBytes", 0).coerceAtLeast(0),
                subtitles = subs,
            )
        }
        return out
            .distinctBy { it.url }
            .sortedByDescending { qualityHeight(it.label) }
    }

    /** 1080p / 720 / HD-style labels so the best listed quality plays first. */
    private fun qualityHeight(label: String): Int {
        Regex("""(\d{3,4})\s*p""", RegexOption.IGNORE_CASE).find(label)?.groupValues?.get(1)
            ?.toIntOrNull()?.let { return it }
        Regex("""\b(2160|1440|1080|720|480|360|240)\b""").find(label)?.groupValues?.get(1)
            ?.toIntOrNull()?.let { return it }
        return when {
            label.contains("4k", true) || label.contains("ultra", true) -> 2160
            label.contains("hd", true) || label.contains("high", true) -> 1080
            label.contains("sd", true) || label.contains("low", true) -> 480
            else -> 0
        }
    }

    private companion object {
        val JSON_MEDIA = "application/json; charset=utf-8".toMediaType()
    }
}
