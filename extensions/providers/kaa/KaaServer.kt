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
 * On-device kaa.lt resolve.
 *
 * The public catalog is `POST /api/fsearch`, then
 * `GET /api/show/{slug}/episodes?ep=&lang=` and
 * `GET /api/show/{slug}/episode/{ep-slug}` for the server list.
 * VidStreaming's player id is the HLS master on hls.krussdomi.com.
 * Playback stays on this phone and sends the player Origin and Referer.
 * Soft captions are read from the player page when it lists them.
 */
class KaaServer(
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
        name = "kaa",
        description = "On-device kaa.lt resolve. The vidstream playlist plays on this phone.",
        iconUrl = "https://www.google.com/s2/favicons?domain=kaa.lt&sz=128",
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
        val locale = if (dub) DUB_LOCALE else SUB_LOCALE
        val show = findShow(anilistId, titleHint)
        if (show.locales.isNotEmpty() && locale !in show.locales) error(MISSING)
        val opened = openEpisode(show.slug, episode, locale)
        val source = kaaPlayable(opened.detail, opened.playlist, opened.captions, dub)
            ?: error(MISSING)
        listOf(source)
    }

    private fun findShow(anilistId: Int, titleHint: String?): KaaShow {
        cache?.getShow(ID, anilistId)?.siteId?.takeIf { it.isNotBlank() }?.let { slug ->
            return KaaShow(slug, titleHint.orEmpty(), null, emptySet())
        }
        val title = FlixCrypto.cleanTitle(titleHint)
        if (title.isBlank()) error("kaa needs a title to find this show.")
        val body = post("$API/fsearch", JSONObject().put("query", title).toString())
        if (kaaBlocked(body.code, body.text)) error(BLOCKED)
        if (body.code == 404) error(MISSING)
        if (body.code !in 200..299) error(BLOCKED)
        val show = kaaPickShow(body.text, title) ?: error(MISSING)
        cache?.putShow(ID, anilistId, show.slug, "$ORIGIN/${show.slug}")
        return show
    }

    private fun openEpisode(slug: String, episode: Int, locale: String): Opened {
        val list = get(
            "$API/show/${enc(slug)}/episodes?ep=$episode&lang=${enc(locale)}",
            referer = "$ORIGIN/",
            origin = ORIGIN,
        )
        if (kaaBlocked(list.code, list.text)) error(BLOCKED)
        if (list.code == 404) error(MISSING)
        if (list.code !in 200..299) error(BLOCKED)
        val path = kaaEpisodePath(list.text, episode) ?: error(MISSING)
        val detail = get(
            "$API/show/${enc(slug)}/episode/${enc(path)}",
            referer = "$ORIGIN/",
            origin = ORIGIN,
        )
        if (kaaBlocked(detail.code, detail.text)) error(BLOCKED)
        if (detail.code == 404) error(MISSING)
        if (detail.code !in 200..299) error(BLOCKED)
        val player = kaaVidStreamingUrl(detail.text) ?: error(MISSING)
        val playerId = kaaPlayerId(player) ?: error(MISSING)
        val master = kaaMasterUrl(playerId)
        val playlist = get(master, referer = "$PLAYER_ORIGIN/", origin = PLAYER_ORIGIN)
        val page = runCatching {
            get(player, referer = "$ORIGIN/", origin = ORIGIN)
        }.getOrNull()
        return Opened(
            detail = detail.text,
            playlist = playlist.text.takeIf { playlist.code in 200..299 }.orEmpty(),
            captions = page?.text?.takeIf { page.code in 200..299 }.orEmpty(),
        )
    }

    private fun get(url: String, referer: String, origin: String): HttpText {
        val request = Request.Builder()
            .url(url)
            .header("Accept", "application/json,text/html,*/*")
            .header("Origin", origin)
            .header("Referer", referer)
            .header("User-Agent", USER_AGENT)
            .get()
            .build()
        val response = runCatching { http.newCall(request).execute() }.getOrElse { error(BLOCKED) }
        response.use { return HttpText(it.code, it.body?.string().orEmpty()) }
    }

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

    private fun enc(value: String): String =
        URLEncoder.encode(value, Charsets.UTF_8.name()).replace("+", "%20")

    private data class HttpText(val code: Int, val text: String)
    private data class Opened(val detail: String, val playlist: String, val captions: String)

    companion object {
        const val ID = "kaa"
        const val MISSING = "kaa does not have this episode."
        const val BLOCKED = "kaa could not be reached."
        const val ORIGIN = "https://kaa.lt"
        const val PLAYER_ORIGIN = "https://krussdomi.com"
        private const val API = "$ORIGIN/api"
        private const val SUB_LOCALE = "ja-JP"
        private const val DUB_LOCALE = "en-US"
        private val JSON_MEDIA = "application/json".toMediaType()
        private const val USER_AGENT =
            "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"

        fun playbackHeaders(): Map<String, String> = mapOf(
            "Referer" to "$PLAYER_ORIGIN/",
            "Origin" to PLAYER_ORIGIN,
            "User-Agent" to USER_AGENT,
        )
    }
}

internal data class KaaShow(
    val slug: String,
    val title: String,
    val type: String?,
    val locales: Set<String>,
)

internal fun kaaBlocked(code: Int, body: String): Boolean {
    if (code == 403 || code == 503) return true
    val probe = body.take(800).lowercase()
    return "just a moment" in probe || "cf-mitigated" in probe || "challenge-platform" in probe
}

internal fun kaaNormalizeTitle(raw: String?): String {
    val cleaned = FlixCrypto.cleanTitle(raw)
    if (cleaned.isBlank()) return ""
    return cleaned.lowercase().replace(Regex("[^a-z0-9]+"), " ").trim()
}

internal fun kaaPickShow(payload: String, titleHint: String): KaaShow? {
    val want = kaaNormalizeTitle(titleHint)
    if (want.isBlank()) return null
    val root = runCatching { JSONObject(payload) }.getOrNull() ?: return null
    val rows = kaaArray(root, "result") ?: return null
    val shows = ArrayList<KaaShow>(rows.length())
    for (i in 0 until rows.length()) {
        val row = rows.optJSONObject(i) ?: continue
        val slug = row.optString("slug").trim()
        if (slug.isBlank()) continue
        val title = row.optString("title_en").ifBlank { row.optString("title") }.ifBlank { slug }
        val locales = row.optJSONArray("locales")
        val codes = LinkedHashSet<String>()
        if (locales != null) {
            for (n in 0 until locales.length()) {
                val code = locales.optString(n).trim()
                if (code.isNotEmpty()) codes += code
            }
        }
        shows += KaaShow(
            slug = slug,
            title = title,
            type = row.optString("type").takeIf { it.isNotBlank() },
            locales = codes,
        )
    }
    val exact = shows.filter { kaaNormalizeTitle(it.title) == want }
    val pool = exact.ifEmpty {
        shows.filter { show ->
            val title = kaaNormalizeTitle(show.title)
            title.isNotEmpty() && (title.contains(want) || want.contains(title))
        }
    }
    if (pool.isEmpty()) return null
    return pool.firstOrNull { it.type.equals("tv", ignoreCase = true) } ?: pool.first()
}

internal fun kaaEpisodePath(payload: String, number: Int): String? {
    val root = runCatching { JSONObject(payload) }.getOrNull() ?: return null
    val rows = kaaArray(root, "result") ?: kaaArray(root, "episodes") ?: return null
    for (i in 0 until rows.length()) {
        val row = rows.optJSONObject(i) ?: continue
        val listed = when {
            row.has("episode_number") -> row.optInt("episode_number")
            row.has("episode") -> row.optInt("episode")
            else -> continue
        }
        if (listed != number) continue
        val id = row.optString("id").substringAfterLast('/').trim()
        if (id.startsWith("ep-")) return id
        val slug = row.optString("slug").trim().substringAfterLast('/')
        if (slug.startsWith("ep-")) return slug
        if (slug.isBlank()) continue
        return "ep-$number-$slug"
    }
    return null
}

internal fun kaaVidStreamingUrl(payload: String): String? {
    val root = runCatching { JSONObject(payload) }.getOrNull() ?: return null
    val servers = kaaArray(root, "servers") ?: return null
    var fallback: String? = null
    for (i in 0 until servers.length()) {
        val server = servers.optJSONObject(i) ?: continue
        val src = server.optString("src").ifBlank { server.optString("url") }.trim()
        val name = server.optString("name")
        val absolute = kaaAbsolutePlayer(src)
        val named = name.equals("VidStreaming", ignoreCase = true) ||
            name.equals("vidstream", ignoreCase = true) ||
            src.contains("vidstream", ignoreCase = true)
        if (named && absolute != null) return absolute
        if (fallback == null && absolute != null && absolute.contains("krussdomi", ignoreCase = true)) {
            fallback = absolute
        }
        val bareId = server.optString("id").trim()
        if (named && bareId.isNotEmpty() && !bareId.contains('/')) {
            return "$KaaServer.PLAYER_ORIGIN/player?id=$bareId&ep=vidstream"
        }
    }
    return fallback
}

internal fun kaaPlayerId(playerUrl: String): String? {
    val query = playerUrl.substringAfter('?', "")
    if (query.isBlank()) return null
    for (pair in query.split('&')) {
        val parts = pair.split('=', limit = 2)
        if (parts.firstOrNull() == "id") {
            return parts.getOrNull(1)?.takeIf { it.isNotBlank() }
        }
    }
    return null
}

internal fun kaaMasterUrl(playerId: String): String =
    "https://hls.krussdomi.com/manifest/$playerId/master.m3u8"

internal fun kaaBestVariant(playlist: String): String {
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

internal fun kaaSubtitles(html: String): List<SubtitleTrack> {
    if (html.isBlank()) return emptyList()
    val decoded = html
        .replace("\\u0026", "&")
        .replace("\\/", "/")
        .replace("&amp;", "&")
    val pattern = Regex(
        """"language":\[0,"([^"]*)"\],"name":\[0,"([^"]*)"\],"src":\[0,"(https?:[^"]+\.vtt)"\]""",
        RegexOption.IGNORE_CASE,
    )
    return pattern.findAll(decoded).map { match ->
        val language = match.groupValues[1].ifBlank { "und" }
        val label = match.groupValues[2].ifBlank { language }
        SubtitleTrack(
            url = match.groupValues[3],
            label = label,
            language = language,
            mimeType = "text/vtt",
        )
    }.distinctBy { it.url }.toList()
}

internal fun kaaPlayable(
    detail: String,
    playlist: String,
    captions: String,
    dub: Boolean,
): PlayableSource? {
    val player = kaaVidStreamingUrl(detail) ?: return null
    val playerId = kaaPlayerId(player) ?: return null
    val mode = if (dub) "dub" else "sub"
    val fields = BuiltInSourceMeta.kaa(kaaBestVariant(playlist), mode)
    return PlayableSource(
        url = kaaMasterUrl(playerId),
        headers = KaaServer.playbackHeaders(),
        label = fields.quality ?: if (dub) "DUB" else "SUB",
        stripBytes = 0,
        subtitles = kaaSubtitles(captions),
        quality = fields.quality,
        audio = fields.audio,
        skip = runCatching {
            site.anikitty.app.data.skip.skipTimesFromJson(JSONObject(detail))
        }.getOrDefault(site.anikitty.app.data.skip.SkipTimes()),
    )
}

private fun kaaAbsolutePlayer(src: String): String? {
    if (src.isBlank()) return null
    return when {
        src.startsWith("https://") || src.startsWith("http://") -> src
        src.startsWith("//") -> "https:$src"
        src.startsWith("/") -> "${KaaServer.PLAYER_ORIGIN}$src"
        else -> null
    }
}

private fun kaaArray(root: JSONObject, name: String): JSONArray? =
    root.optJSONArray(name) ?: root.optJSONObject("data")?.optJSONArray(name)
