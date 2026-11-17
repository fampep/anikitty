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
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64
import java.util.concurrent.TimeUnit
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * On-device xanime.app resolve.
 *
 * The public client posts GraphQL to `POST https://xanime.app/z2/`.
 * Search is `get_q27`, episodes are `get_q01`, and the player is `get_q07`.
 * The body is the site's AES-GCM envelope. Playback stays on this phone and
 * sends the site Referer, Origin, and User-Agent. The master playlist is HLS.
 * Variant playlists are named `a-index-….ico`.
 */
class XanimeServer(
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
        name = "xanime",
        description = "On-device xanime.app resolve. The playlist plays on this phone.",
        iconUrl = "https://www.google.com/s2/favicons?domain=xanime.app&sz=128",
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
        val epId = openEpisode(show.id, episode, dub)
        listOf(openSource(epId, dub))
    }

    private fun findShow(anilistId: Int, titleHint: String?): XanimeShow {
        cache?.getShow(ID, anilistId)?.siteId?.takeIf { it.isNotBlank() }?.let { id ->
            return XanimeShow(id, titleHint.orEmpty(), anilistId)
        }
        val title = FlixCrypto.cleanTitle(titleHint)
        if (title.isBlank()) error("xanime needs a title to find this show.")
        val body = post(searchBody(title))
        val show = xanimePickShow(body, anilistId, title) ?: error(MISSING)
        cache?.putShow(ID, anilistId, show.id, "$ORIGIN/title/${enc(show.id)}")
        return show
    }

    private fun openEpisode(id: String, episode: Int, dub: Boolean): String {
        var page = 1
        var pages = 1
        while (page <= pages && page <= MAX_PAGES) {
            val body = post(episodeBody(id, page))
            pages = xanimeEpisodePages(body).coerceAtLeast(1)
            val row = xanimeEpisode(body, episode)
            if (row != null) {
                val audio = if (dub) row.hasDub else row.hasSub
                if (!audio) error(MISSING)
                return row.id
            }
            page += 1
        }
        error(MISSING)
    }

    private fun openSource(epId: String, dub: Boolean): PlayableSource {
        val body = post(videoBody(epId))
        val links = xanimeLinks(body, dub, ORIGIN, USER_AGENT)
        if (links.isEmpty()) error(MISSING)
        var blocked = false
        for (link in links) {
            val playlist = getOrNull(link.url, link.headers) ?: continue
            if (xanimeBlocked(playlist.code, playlist.text)) {
                blocked = true
                continue
            }
            if (playlist.code !in 200..299) continue
            val source = xanimePlayable(link, playlist.text, dub) ?: continue
            return source
        }
        error(if (blocked) BLOCKED else MISSING)
    }

    private fun post(json: String): String {
        val request = Request.Builder()
            .url(API)
            .header("Accept", "application/json")
            .header("Content-Type", "application/json")
            .header("Origin", ORIGIN)
            .header("Referer", "$ORIGIN/")
            .header("User-Agent", USER_AGENT)
            .post(xanimeSeal(json).toRequestBody(JSON_MEDIA))
            .build()
        val response = runCatching { http.newCall(request).execute() }.getOrElse { error(BLOCKED) }
        val httpText = response.use { HttpText(it.code, it.body?.string().orEmpty()) }
        if (xanimeBlocked(httpText.code, httpText.text)) error(BLOCKED)
        if (httpText.code == 404) error(MISSING)
        if (httpText.code !in 200..299) error(BLOCKED)
        return xanimeOpen(httpText.text) ?: error(BLOCKED)
    }

    private fun getOrNull(url: String, headers: Map<String, String>): HttpText? {
        val builder = Request.Builder().url(url).get()
        headers.forEach { (name, value) -> builder.header(name, value) }
        val response = runCatching { http.newCall(builder.build()).execute() }.getOrNull() ?: return null
        response.use { return HttpText(it.code, it.body?.string().orEmpty()) }
    }

    private fun searchBody(title: String): String {
        val select = JSONObject()
            .put("word", title)
            .put("sortby", "field_score")
            .put("page", 1)
            .put("incGenres", JSONArray())
            .put("excGenres", JSONArray())
            .put("origStatus", "")
            .put("type", "")
            .put("sources", "")
            .put("ep_total", "")
            .put("ignoreGlobalGenres", false)
            .put("ignoreGlobalBlocks", false)
            .put("size", 24)
        return JSONObject()
            .put("query", SEARCH)
            .put("variables", JSONObject().put("select", select))
            .toString()
    }

    private fun episodeBody(id: String, page: Int): String {
        val select = JSONObject()
            .put("ani_id", id)
            .put("init", 50)
            .put("size", 50)
            .put("page", page)
        return JSONObject()
            .put("query", EPISODES)
            .put("variables", JSONObject().put("select", select))
            .toString()
    }

    private fun videoBody(epId: String): String {
        val select = JSONObject().put("id", epId)
        return JSONObject()
            .put("query", VIDEO)
            .put("variables", JSONObject().put("select", select))
            .toString()
    }

    private fun enc(value: String): String =
        java.net.URLEncoder.encode(value, Charsets.UTF_8.name()).replace("+", "%20")

    private data class HttpText(val code: Int, val text: String)

    companion object {
        const val ID = "xanime"
        const val MISSING = "xanime does not have this episode."
        const val BLOCKED = "xanime could not be reached."
        const val ORIGIN = "https://xanime.app"
        private const val API = "$ORIGIN/z2/"
        private const val MAX_PAGES = 12
        private val JSON_MEDIA = "application/json".toMediaType()
        const val USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
        private const val SEARCH =
            "query get_q27(\$select: SearchAnime_Select) { " +
                "get_q27(select: \$select) { items { id data { ani_id info_title info_slug al_id } } } }"
        private const val EPISODES =
            "query get_q01(\$select: AnimesEpisodesList_Select) { " +
                "get_q01(select: \$select) { paging { pages page } items { data { " +
                "ep_id ep_index ep_sub_index sourcesNode_list { data { src_type } } } } } }"
        private const val VIDEO =
            "query get_q07(\$select: Episodes_Select) { " +
                "get_q07(select: \$select) { data { sourcesNode_list { data { " +
                "src_type souPath m3u8_lists { iframe } track { label kind trackPath } } } } } }"
    }
}

internal data class XanimeShow(
    val id: String,
    val title: String,
    val anilistId: Int,
)

internal data class XanimeEpisode(
    val id: String,
    val hasSub: Boolean,
    val hasDub: Boolean,
)

internal data class XanimeLink(
    val url: String,
    val headers: Map<String, String>,
    val subtitles: List<SubtitleTrack>,
    val skip: site.anikitty.app.data.skip.SkipTimes = site.anikitty.app.data.skip.SkipTimes(),
)

private const val XANIME_SECRET = "xanime-ph25-obfuscation-secret-key-2026"

internal fun xanimeSeal(plain: String): String {
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    val iv = ByteArray(12).also { SecureRandom().nextBytes(it) }
    cipher.init(Cipher.ENCRYPT_MODE, xanimeKey(), GCMParameterSpec(128, iv))
    val sealed = cipher.doFinal(plain.toByteArray(Charsets.UTF_8))
    return JSONObject()
        .put("v", 1)
        .put("iv", Base64.getEncoder().encodeToString(iv))
        .put("ct", Base64.getEncoder().encodeToString(sealed))
        .toString()
}

internal fun xanimeOpen(body: String): String? {
    val root = runCatching { JSONObject(body) }.getOrNull() ?: return null
    val ivText = root.optString("iv")
    val ctText = root.optString("ct")
    if (ivText.isBlank() || ctText.isBlank()) {
        return body.takeIf { root.has("data") }
    }
    val iv = runCatching { Base64.getDecoder().decode(ivText) }.getOrNull() ?: return null
    val ct = runCatching { Base64.getDecoder().decode(ctText) }.getOrNull() ?: return null
    return runCatching {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, xanimeKey(), GCMParameterSpec(128, iv))
        cipher.doFinal(ct).toString(Charsets.UTF_8)
    }.getOrNull()
}

internal fun xanimeBlocked(code: Int, body: String): Boolean {
    if (code == 403 || code == 503) return true
    val probe = body.take(800).lowercase()
    return "just a moment" in probe || "cf-mitigated" in probe || "challenge-platform" in probe
}

internal fun xanimePickShow(payload: String, anilistId: Int, titleHint: String?): XanimeShow? {
    val items = runCatching { JSONObject(payload) }.getOrNull()
        ?.optJSONObject("data")
        ?.optJSONObject("get_q27")
        ?.optJSONArray("items")
        ?: return null
    val shows = ArrayList<XanimeShow>(items.length())
    for (i in 0 until items.length()) {
        val row = items.optJSONObject(i) ?: continue
        val data = row.optJSONObject("data") ?: row
        val id = data.optString("ani_id").ifBlank { row.optString("id") }.trim()
        if (id.isEmpty()) continue
        val title = data.optString("info_title").trim().ifBlank { id }
        shows += XanimeShow(id, title, xanimeAnilistId(data))
    }
    if (anilistId > 0) {
        shows.firstOrNull { it.anilistId == anilistId }?.let { return it }
    }
    val want = xanimeNormalizeTitle(titleHint)
    if (want.isBlank()) return null
    shows.firstOrNull { xanimeNormalizeTitle(it.title) == want }?.let { return it }
    return shows.firstOrNull { show ->
        val title = xanimeNormalizeTitle(show.title)
        title.isNotEmpty() && (title.contains(want) || want.contains(title))
    }
}

internal fun xanimeEpisodePages(payload: String): Int {
    val pages = runCatching { JSONObject(payload) }.getOrNull()
        ?.optJSONObject("data")
        ?.optJSONObject("get_q01")
        ?.optJSONObject("paging")
        ?.optInt("pages")
        ?: 0
    return pages.coerceAtLeast(1)
}

internal fun xanimeEpisode(payload: String, number: Int): XanimeEpisode? {
    val items = runCatching { JSONObject(payload) }.getOrNull()
        ?.optJSONObject("data")
        ?.optJSONObject("get_q01")
        ?.optJSONArray("items")
        ?: return null
    for (i in 0 until items.length()) {
        val data = items.optJSONObject(i)?.optJSONObject("data") ?: continue
        if (data.optInt("ep_index") != number) continue
        val part = if (data.has("ep_sub_index") && !data.isNull("ep_sub_index")) {
            data.optInt("ep_sub_index")
        } else {
            0
        }
        if (part != 0) continue
        val id = data.optString("ep_id").trim()
        if (id.isEmpty()) continue
        val types = xanimeTypes(data.optJSONArray("sourcesNode_list"))
        val known = types.isNotEmpty()
        return XanimeEpisode(
            id = id,
            hasSub = !known || "sub" in types,
            hasDub = !known || "dub" in types,
        )
    }
    return null
}

internal fun xanimeLinks(
    payload: String,
    dub: Boolean,
    origin: String,
    userAgent: String,
): List<XanimeLink> {
    val rows = runCatching { JSONObject(payload) }.getOrNull()
        ?.optJSONObject("data")
        ?.optJSONObject("get_q07")
        ?.optJSONObject("data")
        ?.optJSONArray("sourcesNode_list")
        ?: return emptyList()
    val want = if (dub) "dub" else "sub"
    val links = ArrayList<XanimeLink>()
    for (i in 0 until rows.length()) {
        val data = rows.optJSONObject(i)?.optJSONObject("data") ?: continue
        if (data.optString("src_type").trim().lowercase() != want) continue
        val url = xanimeAbsolute(data.optString("souPath"), origin).ifBlank {
            xanimeIframe(data.optJSONArray("m3u8_lists"), origin)
        }
        if (url.isEmpty()) continue
        links += XanimeLink(
            url = url,
            headers = mapOf(
                "Referer" to "$origin/",
                "Origin" to origin,
                "User-Agent" to userAgent,
            ),
            subtitles = xanimeSubtitles(data.optJSONArray("track"), origin),
            skip = site.anikitty.app.data.skip.skipTimesFromJson(data),
        )
    }
    return links
}

internal fun xanimePlayable(link: XanimeLink, playlist: String, dub: Boolean): PlayableSource? {
    if (!playlist.trimStart().startsWith("#EXTM3U")) return null
    val mode = if (dub) "dub" else "sub"
    val fields = BuiltInSourceMeta.xanime(xanimeBestVariant(playlist), mode)
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

internal fun xanimeBestVariant(playlist: String): String {
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

private fun xanimeKey(): SecretKeySpec {
    val digest = MessageDigest.getInstance("SHA-256").digest(XANIME_SECRET.toByteArray(Charsets.UTF_8))
    return SecretKeySpec(digest, "AES")
}

private fun xanimeAnilistId(data: JSONObject): Int {
    val raw = data.opt("al_id") ?: return 0
    return raw.toString().trim().toIntOrNull() ?: 0
}

private fun xanimeNormalizeTitle(raw: String?): String {
    val cleaned = FlixCrypto.cleanTitle(raw)
    if (cleaned.isBlank()) return ""
    return cleaned.lowercase().replace(Regex("[^a-z0-9]+"), " ").trim()
}

private fun xanimeTypes(rows: JSONArray?): Set<String> {
    if (rows == null) return emptySet()
    val types = LinkedHashSet<String>()
    for (i in 0 until rows.length()) {
        val type = rows.optJSONObject(i)
            ?.optJSONObject("data")
            ?.optString("src_type")
            ?.trim()
            ?.lowercase()
            .orEmpty()
        if (type.isNotEmpty()) types += type
    }
    return types
}

private fun xanimeIframe(rows: JSONArray?, origin: String): String {
    if (rows == null) return ""
    for (i in 0 until rows.length()) {
        val url = xanimeAbsolute(rows.optJSONObject(i)?.optString("iframe").orEmpty(), origin)
        if (url.isNotEmpty()) return url
    }
    return ""
}

private fun xanimeAbsolute(raw: String, origin: String): String {
    val path = raw.trim()
    return when {
        path.startsWith("https://") || path.startsWith("http://") -> path
        path.startsWith("//") -> "https:$path"
        path.startsWith("/") -> origin.trimEnd('/') + path
        else -> ""
    }
}

private fun xanimeSubtitles(rows: JSONArray?, origin: String): List<SubtitleTrack> {
    if (rows == null) return emptyList()
    val tracks = ArrayList<SubtitleTrack>(rows.length())
    for (i in 0 until rows.length()) {
        val row = rows.optJSONObject(i) ?: continue
        val url = xanimeAbsolute(row.optString("trackPath"), origin)
        if (url.isEmpty()) continue
        val kind = row.optString("kind").lowercase()
        val caption = kind.isBlank() || kind == "captions" || kind == "subtitles" ||
            url.contains(".vtt", ignoreCase = true) || url.contains(".srt", ignoreCase = true)
        if (!caption) continue
        val label = row.optString("label").ifBlank { "English" }
        tracks += SubtitleTrack(
            url = url,
            label = label,
            language = label,
            mimeType = if (url.contains(".srt", ignoreCase = true)) "application/x-subrip" else "text/vtt",
        )
    }
    return tracks.distinctBy { it.url }
}
