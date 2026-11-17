// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

/**
 * On-device animex.one resolve.
 *
 * The public client searches `POST https://graphql.animex.one/graphql`
 * (`searchAnime`), then reads episodes, servers, and sources from
 * `https://pp.animex.one/rest/api`. The default server is tried first.
 * Playback stays on this phone and sends the headers that server listed.
 * The playlist is HLS even when the path is `deeznuts.txt`.
 */
class AnimexServer(
    private val cache: ResolveCache? = null,
    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(14, TimeUnit.SECONDS)
        .callTimeout(22, TimeUnit.SECONDS)
        .followRedirects(true)
        .retryOnConnectionFailure(true)
        .build(),
) : StreamResolver {
    override val server = StreamServer(
        id = ID,
        name = "animex",
        description = "On-device animex.one resolve. The playlist plays on this phone.",
        iconUrl = "https://www.google.com/s2/favicons?domain=animex.one&sz=128",
        siteUrl = ORIGIN,
    )

    override suspend fun resolve(
        anilistId: Int,
        episode: Int,
        audio: String,
        titleHint: String?,
    ): List<PlayableSource> = withContext(Dispatchers.IO) {
        require(anilistId > 0) { "anilistId required" }
        require(episode > 0) { "episode required" }
        val dub = audio.equals("dub", ignoreCase = true)
        val show = findShow(anilistId, titleHint)
        openEpisode(show.id, episode, dub)
        listOf(openSource(show.id, episode, dub))
    }

    private fun findShow(anilistId: Int, titleHint: String?): AnimexShow {
        cache?.getShow(ID, anilistId)?.siteId?.takeIf { it.isNotBlank() }?.let { id ->
            return AnimexShow(id, titleHint.orEmpty(), "", anilistId)
        }
        val title = FlixCrypto.cleanTitle(titleHint)
        if (title.isBlank()) error("animex needs a title to find this show.")
        val body = post(
            GQL,
            JSONObject()
                .put("query", SEARCH)
                .put(
                    "variables",
                    JSONObject().put("query", title).put("limit", 24),
                )
                .toString(),
        )
        if (animexBlocked(body.code, body.text)) error(BLOCKED)
        if (body.code == 404) error(MISSING)
        if (body.code !in 200..299) error(BLOCKED)
        val show = animexPickShow(body.text, anilistId, title) ?: error(MISSING)
        cache?.putShow(ID, anilistId, show.id, "$ORIGIN/watch/${enc(show.id)}")
        return show
    }

    private fun openEpisode(id: String, episode: Int, dub: Boolean): AnimexEpisode {
        val list = get("$API/episodes?id=${enc(id)}")
        if (animexBlocked(list.code, list.text)) error(BLOCKED)
        if (list.code == 404) error(MISSING)
        if (list.code !in 200..299) error(BLOCKED)
        val row = animexEpisode(list.text, episode) ?: error(MISSING)
        val audio = if (dub) row.hasDub else row.hasSub
        if (!audio) error(MISSING)
        return row
    }

    private fun openSource(id: String, episode: Int, dub: Boolean): PlayableSource {
        val type = if (dub) "dub" else "sub"
        val servers = get("$API/servers?id=${enc(id)}&epNum=$episode&type=$type")
        if (animexBlocked(servers.code, servers.text)) error(BLOCKED)
        if (servers.code == 404) error(MISSING)
        if (servers.code !in 200..299) error(BLOCKED)
        val providers = animexProviderIds(servers.text, dub)
        if (providers.isEmpty()) error(MISSING)
        var blocked = false
        for (provider in providers) {
            val body = getOrNull(
                "$API/sources?id=${enc(id)}&epNum=$episode&type=$type&providerId=${enc(provider)}",
            ) ?: continue
            if (animexBlocked(body.code, body.text)) {
                blocked = true
                continue
            }
            if (body.code !in 200..299) continue
            val link = animexLink(body.text, USER_AGENT) ?: continue
            val playlist = getOrNull(link.url, link.headers) ?: continue
            if (playlist.code !in 200..299) continue
            val source = animexPlayable(link, playlist.text, dub) ?: continue
            return source
        }
        error(if (blocked) BLOCKED else MISSING)
    }

    private fun getOrNull(url: String, headers: Map<String, String> = apiHeaders()): HttpText? {
        val builder = Request.Builder().url(url).get()
        headers.forEach { (name, value) -> builder.header(name, value) }
        val response = runCatching { http.newCall(builder.build()).execute() }.getOrNull() ?: return null
        response.use { return HttpText(it.code, it.body?.string().orEmpty()) }
    }

    private fun get(url: String, headers: Map<String, String> = apiHeaders()): HttpText =
        getOrNull(url, headers) ?: error(BLOCKED)

    private fun post(url: String, json: String): HttpText {
        val request = Request.Builder()
            .url(url)
            .header("Accept", "application/json")
            .header("Content-Type", "application/json")
            .header("Origin", ORIGIN)
            .header("Referer", "$ORIGIN/")
            .header("User-Agent", USER_AGENT)
            .post(json.toRequestBody(JSON_MEDIA))
            .build()
        val response = runCatching { http.newCall(request).execute() }.getOrElse { error(BLOCKED) }
        response.use { return HttpText(it.code, it.body?.string().orEmpty()) }
    }

    private fun apiHeaders(): Map<String, String> = mapOf(
        "Accept" to "application/json",
        "Origin" to ORIGIN,
        "Referer" to "$ORIGIN/",
        "User-Agent" to USER_AGENT,
    )

    private fun enc(value: String): String =
        URLEncoder.encode(value, Charsets.UTF_8.name()).replace("+", "%20")

    private data class HttpText(val code: Int, val text: String)

    companion object {
        const val ID = "animex"
        const val MISSING = "animex does not have this episode."
        const val BLOCKED = "animex could not be reached."
        const val ORIGIN = "https://animex.one"
        private const val GQL = "https://graphql.animex.one/graphql"
        private const val API = "https://pp.animex.one/rest/api"
        private val JSON_MEDIA = "application/json".toMediaType()
        const val USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0"
        private const val SEARCH =
            "query Search(\$query: String!, \$limit: Int) { " +
                "searchAnime(query: \$query, limit: \$limit) { " +
                "items { id anilistId titleRomaji titleEnglish } } }"
    }
}

internal data class AnimexShow(
    val id: String,
    val title: String,
    val romaji: String,
    val anilistId: Int,
)

internal data class AnimexEpisode(
    val number: Int,
    val hasSub: Boolean,
    val hasDub: Boolean,
)

internal data class AnimexLink(
    val url: String,
    val headers: Map<String, String>,
    val subtitles: List<SubtitleTrack>,
    val skip: site.anikitty.app.data.skip.SkipTimes = site.anikitty.app.data.skip.SkipTimes(),
)

internal fun animexBlocked(code: Int, body: String): Boolean {
    if (code == 403 || code == 503) return true
    val probe = body.take(800).lowercase()
    return "just a moment" in probe || "cf-mitigated" in probe || "challenge-platform" in probe
}

internal fun animexNormalizeTitle(raw: String?): String {
    val cleaned = FlixCrypto.cleanTitle(raw)
    if (cleaned.isBlank()) return ""
    return cleaned.lowercase().replace(Regex("[^a-z0-9]+"), " ").trim()
}

internal fun animexPickShow(payload: String, anilistId: Int, titleHint: String?): AnimexShow? {
    val root = runCatching { JSONObject(payload) }.getOrNull() ?: return null
    val items = root.optJSONObject("data")
        ?.optJSONObject("searchAnime")
        ?.optJSONArray("items")
        ?: return null
    val shows = ArrayList<AnimexShow>(items.length())
    for (i in 0 until items.length()) {
        val row = items.optJSONObject(i) ?: continue
        val id = row.optString("id").trim()
        if (id.isEmpty()) continue
        val english = row.optString("titleEnglish").trim()
        val romaji = row.optString("titleRomaji").trim()
        shows += AnimexShow(
            id = id,
            title = english.ifBlank { romaji }.ifBlank { id },
            romaji = romaji,
            anilistId = row.optInt("anilistId"),
        )
    }
    if (anilistId > 0) {
        shows.firstOrNull { it.anilistId == anilistId }?.let { return it }
    }
    val want = animexNormalizeTitle(titleHint)
    if (want.isBlank()) return null
    val exact = shows.filter { show ->
        animexNormalizeTitle(show.title) == want || animexNormalizeTitle(show.romaji) == want
    }
    if (exact.isNotEmpty()) return exact.first()
    return shows.firstOrNull { show ->
        val title = animexNormalizeTitle(show.title)
        val romaji = animexNormalizeTitle(show.romaji)
        (title.isNotEmpty() && (title.contains(want) || want.contains(title))) ||
            (romaji.isNotEmpty() && (romaji.contains(want) || want.contains(romaji)))
    }
}

internal fun animexEpisode(payload: String, number: Int): AnimexEpisode? {
    val rows = runCatching { JSONArray(payload) }.getOrNull() ?: return null
    for (i in 0 until rows.length()) {
        val row = rows.optJSONObject(i) ?: continue
        if (row.optInt("number") != number) continue
        val sub = if (row.has("hasSub")) row.optBoolean("hasSub") else true
        val dub = if (row.has("hasDub")) row.optBoolean("hasDub") else true
        return AnimexEpisode(number, sub, dub)
    }
    return null
}

internal fun animexProviderIds(payload: String, dub: Boolean): List<String> {
    val root = runCatching { JSONObject(payload) }.getOrNull() ?: return emptyList()
    val rows = root.optJSONArray(if (dub) "dubProviders" else "subProviders") ?: return emptyList()
    val ranked = ArrayList<Pair<Boolean, String>>(rows.length())
    for (i in 0 until rows.length()) {
        val row = rows.optJSONObject(i) ?: continue
        val id = row.optString("id").trim()
        if (id.isEmpty()) continue
        ranked += row.optBoolean("default") to id
    }
    return ranked.sortedByDescending { it.first }.map { it.second }
}

internal fun animexLink(payload: String, userAgent: String): AnimexLink? {
    val root = runCatching { JSONObject(payload) }.getOrNull() ?: return null
    val sources = root.optJSONArray("sources") ?: return null
    var url = ""
    for (i in 0 until sources.length()) {
        val row = sources.optJSONObject(i) ?: continue
        val candidate = row.optString("url").trim()
        if (candidate.startsWith("https://") || candidate.startsWith("http://")) {
            url = candidate
            break
        }
    }
    if (url.isEmpty()) return null
    val headers = LinkedHashMap<String, String>()
    val raw = root.optJSONObject("headers")
    if (raw != null) {
        val names = raw.keys()
        while (names.hasNext()) {
            val name = names.next()
            if (name.lowercase() !in HEADER_NAMES) continue
            val value = raw.optString(name).trim()
            if (value.isNotEmpty()) headers[canonicalHeader(name)] = value
        }
    }
    if (headers.keys.none { it.equals("User-Agent", ignoreCase = true) }) {
        headers["User-Agent"] = userAgent
    }
    if (headers.keys.none { it.equals("Referer", ignoreCase = true) }) {
        headers["Referer"] = "${AnimexServer.ORIGIN}/"
    }
    return AnimexLink(
        url,
        headers,
        animexSubtitles(root.optJSONArray("tracks")),
        site.anikitty.app.data.skip.skipTimesFromJson(root),
    )
}

internal fun animexPlayable(link: AnimexLink, playlist: String, dub: Boolean): PlayableSource? {
    if (!playlist.trimStart().startsWith("#EXTM3U")) return null
    val mode = if (dub) "dub" else "sub"
    val fields = BuiltInSourceMeta.animex(animexBestVariant(playlist), mode)
    return PlayableSource(
        url = link.url,
        headers = link.headers,
        label = fields.quality ?: if (dub) "DUB" else "SUB",
        stripBytes = 0,
        subtitles = link.subtitles,
        quality = fields.quality,
        audio = fields.audio,
        hls = true,
        skip = link.skip,
    )
}

internal fun animexBestVariant(playlist: String): String {
    var best = ""
    var bestHeight = -1
    for (line in playlist.lineSequence()) {
        if (!line.startsWith("#EXT-X-STREAM-INF")) continue
        val height = Regex("""RESOLUTION=\d+x(\d+)""")
            .find(line)
            ?.groupValues
            ?.get(1)
            ?.toIntOrNull()
            ?: 0
        if (height >= bestHeight) {
            best = line
            bestHeight = height
        }
    }
    return best
}

private fun animexSubtitles(rows: JSONArray?): List<SubtitleTrack> {
    if (rows == null) return emptyList()
    val tracks = ArrayList<SubtitleTrack>(rows.length())
    for (i in 0 until rows.length()) {
        val row = rows.optJSONObject(i) ?: continue
        val url = row.optString("url").ifBlank { row.optString("file") }.trim()
        if (!url.startsWith("https://") && !url.startsWith("http://")) continue
        val kind = row.optString("kind").lowercase()
        val caption = kind.isBlank() || kind == "captions" || kind == "subtitles" ||
            url.contains(".vtt", ignoreCase = true) || url.contains(".srt", ignoreCase = true)
        if (!caption) continue
        val language = row.optString("lang").ifBlank { row.optString("language") }.ifBlank { "und" }
        val label = row.optString("label").ifBlank { language }
        tracks += SubtitleTrack(
            url = url,
            label = label,
            language = language,
            mimeType = if (url.contains(".srt", ignoreCase = true)) "application/x-subrip" else "text/vtt",
        )
    }
    return tracks.distinctBy { it.url }
}

private fun canonicalHeader(name: String): String = when (name.lowercase()) {
    "user-agent" -> "User-Agent"
    "referer", "referrer" -> "Referer"
    "origin" -> "Origin"
    "accept" -> "Accept"
    else -> name
}

private val HEADER_NAMES = setOf(
    "referer",
    "referrer",
    "origin",
    "user-agent",
    "accept",
)
