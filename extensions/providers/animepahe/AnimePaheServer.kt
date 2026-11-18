// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.FormBody
import okhttp3.HttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

/**
 * On-device animepahe.pw resolve.
 *
 * Search is `GET /api?m=search`. Episodes are `GET /api?m=release`.
 * The play page lists a kwik embed per resolution and language. That page's
 * packed script is unpacked on this phone. The playlist it names is what plays.
 * A form redirect is used only when the page has no playlist address.
 * Sub or dub follows the button language. Quality is the tallest rung on the
 * playlist, or the button's resolution when the file is a single rung.
 * A Cloudflare check is completed in the app and the clearance cookie is kept
 * for the next request.
 */
internal class AnimePaheServer(
    private val cache: ResolveCache? = null,
    private val clearance: AnimePaheClearance? = null,
    private val verifier: AnimePaheVerifier? = null,
    private val http: OkHttpClient = OkHttpClient.Builder()
        .cookieJar(MemoryCookies())
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(14, TimeUnit.SECONDS)
        .callTimeout(22, TimeUnit.SECONDS)
        .followRedirects(true)
        .retryOnConnectionFailure(true)
        .build(),
) : StreamResolver {
    override val server = StreamServer(
        id = ID,
        name = "animepahe",
        description = "On-device animepahe.pw resolve. The kwik playlist plays on this phone.",
        iconUrl = "https://www.google.com/s2/favicons?domain=animepahe.pw&sz=128",
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
        val episodeSession = findEpisode(show.session, episode)
        val playUrl = "$ORIGIN/play/${enc(show.session)}/${enc(episodeSession)}"
        val page = get(playUrl, referer = "$ORIGIN/", accept = "text/html,application/xhtml+xml,*/*")
        if (animepaheBlocked(page.code, page.text)) error(BLOCKED)
        if (page.code == 404) error(MISSING)
        if (page.code !in 200..299) error(BLOCKED)
        val link = animepahePickLink(animepaheLinks(page.text), dub) ?: error(MISSING)
        val embed = get(
            link.url,
            referer = playUrl,
            accept = "text/html,application/xhtml+xml,*/*",
        )
        if (animepaheBlocked(embed.code, embed.text)) error(BLOCKED)
        if (embed.code !in 200..299) error(BLOCKED)
        val media = animepaheUnpackMedia(embed.text)
            ?: postKwik(animepaheKwikForm(embed.text), link.url)
            ?: error(MISSING)
        val origin = animepaheOrigin(link.url) ?: error(MISSING)
        val playlist = if (".m3u8" in media) {
            val body = get(media, referer = "$origin/", accept = "application/vnd.apple.mpegurl,*/*")
            body.text.takeIf { body.code in 200..299 && it.trimStart().startsWith("#EXTM3U") }.orEmpty()
        } else {
            ""
        }
        val embedPass = animepaheHost(link.url)?.let { clearance?.read(it) }
        val mediaPass = animepaheHost(media)?.let { clearance?.read(it) }
        val source = animepahePlayable(
            mediaUrl = media,
            playlist = playlist,
            resolution = link.resolution,
            dub = dub,
            refererOrigin = origin,
            userAgent = embedPass?.userAgent ?: USER_AGENT,
            cookieHeader = mediaPass?.cookieHeader,
        ) ?: error(MISSING)
        listOf(source)
    }

    private fun findShow(anilistId: Int, titleHint: String?): AnimePaheShow {
        cache?.getShow(ID, anilistId)?.siteId?.takeIf { it.isNotBlank() }?.let { session ->
            return AnimePaheShow(session, titleHint.orEmpty(), null)
        }
        val title = FlixCrypto.cleanTitle(titleHint)
        if (title.isBlank()) error("animepahe needs a title to find this show.")
        val body = get(
            "$ORIGIN/api?m=search&q=${enc(title)}",
            referer = "$ORIGIN/",
            accept = "application/json,text/javascript,*/*;q=0.1",
            api = true,
        )
        if (animepaheBlocked(body.code, body.text)) error(BLOCKED)
        if (body.code == 404) error(MISSING)
        if (body.code !in 200..299) error(BLOCKED)
        val show = animepahePickShow(body.text, title) ?: error(MISSING)
        cache?.putShow(ID, anilistId, show.session, "$ORIGIN/anime/${show.session}")
        return show
    }

    private fun findEpisode(session: String, episode: Int): String {
        val first = release(session, 1)
        animepaheEpisodeSession(first, episode)?.let { return it }
        val last = animepaheLastPage(first)
        val per = animepahePerPage(first)
        val guess = ((episode - 1) / per) + 1
        if (guess in 2..last) {
            animepaheEpisodeSession(release(session, guess), episode)?.let { return it }
        }
        for (page in 2..last.coerceAtMost(8)) {
            if (page == guess) continue
            animepaheEpisodeSession(release(session, page), episode)?.let { return it }
        }
        error(MISSING)
    }

    private fun release(session: String, page: Int): String {
        val body = get(
            "$ORIGIN/api?m=release&id=${enc(session)}&sort=episode_asc&page=$page",
            referer = "$ORIGIN/",
            accept = "application/json,text/javascript,*/*;q=0.1",
            api = true,
        )
        if (animepaheBlocked(body.code, body.text)) error(BLOCKED)
        if (body.code == 404) error(MISSING)
        if (body.code !in 200..299) error(BLOCKED)
        return body.text
    }

    private fun postKwik(form: AnimePaheForm?, embedUrl: String): String? {
        if (form == null) return null
        val origin = animepaheOrigin(embedUrl) ?: return null
        val request = Request.Builder()
            .url(form.action)
            .header("Origin", origin)
            .apply {
                animepaheRequestHeaders(embedUrl, "*/*", api = false, passFor(form.action))
                    .forEach { (name, value) -> header(name, value) }
            }
            .post(FormBody.Builder().add("_token", form.token).build())
            .build()
        val client = http.newBuilder().followRedirects(false).followSslRedirects(false).build()
        val response = runCatching { client.newCall(request).execute() }.getOrNull() ?: return null
        response.use {
            val location = it.header("Location")?.trim().orEmpty()
            if (it.code !in 300..399 || !location.startsWith("https://")) return null
            return location
        }
    }

    private fun get(url: String, referer: String, accept: String, api: Boolean = false): HttpText {
        val first = execute(url, referer, accept, api)
        remember(url, first)
        if (!animepaheNeedsClearance(first.code, first.text)) return first
        if (verifier?.verify(url) != true) return first
        val second = execute(url, referer, accept, api)
        remember(url, second)
        return second
    }

    private fun execute(url: String, referer: String, accept: String, api: Boolean): HttpText {
        val builder = Request.Builder().url(url)
        animepaheRequestHeaders(referer, accept, api, passFor(url)).forEach { (name, value) ->
            builder.header(name, value)
        }
        val response = runCatching { http.newCall(builder.get().build()).execute() }.getOrElse { error(BLOCKED) }
        response.use {
            return HttpText(it.code, it.body?.string().orEmpty(), it.headers("Set-Cookie"))
        }
    }

    private fun remember(url: String, body: HttpText) {
        val host = animepaheHost(url) ?: return
        val header = animepaheCookieHeader(body.setCookies) ?: return
        clearance?.save(host, header, passFor(url)?.userAgent ?: USER_AGENT)
    }

    private fun passFor(url: String): AnimePahePass? =
        animepaheHost(url)?.let { clearance?.read(it) }

    private fun enc(value: String): String =
        URLEncoder.encode(value, Charsets.UTF_8.name()).replace("+", "%20")

    private data class HttpText(
        val code: Int,
        val text: String,
        val setCookies: List<String> = emptyList(),
    )

    private class MemoryCookies : CookieJar {
        private val jar = ArrayList<Cookie>()

        override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
            synchronized(jar) {
                for (cookie in cookies) {
                    jar.removeAll { it.name == cookie.name && it.domain == cookie.domain && it.path == cookie.path }
                    jar += cookie
                }
            }
        }

        override fun loadForRequest(url: HttpUrl): List<Cookie> =
            synchronized(jar) { jar.filter { it.matches(url) } }
    }

    companion object {
        const val ID = "animepahe"
        const val MISSING = "animepahe does not have this episode."
        const val BLOCKED = "animepahe could not be reached."
        const val ORIGIN = "https://animepahe.pw"
        const val USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

        fun playbackHeaders(origin: String = "https://kwik.cx"): Map<String, String> = mapOf(
            "Referer" to "${origin.trimEnd('/')}/",
            "Origin" to origin.trimEnd('/'),
            "User-Agent" to USER_AGENT,
        )
    }
}

internal data class AnimePaheShow(
    val session: String,
    val title: String,
    val type: String?,
)

internal data class AnimePaheLink(
    val url: String,
    val resolution: Int,
    val audio: String,
    val av1: Boolean,
)

internal data class AnimePaheForm(
    val action: String,
    val token: String,
)

internal fun animepaheBlocked(code: Int, body: String): Boolean {
    if (code == 403 || code == 503) return true
    val probe = body.take(800).lowercase()
    return "just a moment" in probe ||
        "cf-mitigated" in probe ||
        "challenge-platform" in probe ||
        "attention required" in probe ||
        "you have been blocked" in probe
}

internal fun animepaheNormalize(raw: String?): String {
    val cleaned = FlixCrypto.cleanTitle(raw)
    if (cleaned.isBlank()) return ""
    return cleaned.lowercase().replace(Regex("[^a-z0-9]+"), " ").trim()
}

internal fun animepahePickShow(payload: String, titleHint: String): AnimePaheShow? {
    val want = animepaheNormalize(titleHint)
    if (want.isBlank()) return null
    val root = runCatching { JSONObject(payload) }.getOrNull() ?: return null
    val rows = root.optJSONArray("data") ?: return null
    val shows = ArrayList<AnimePaheShow>(rows.length())
    for (i in 0 until rows.length()) {
        val row = rows.optJSONObject(i) ?: continue
        val session = row.optString("session").trim()
        val title = row.optString("title").trim()
        if (session.isBlank() || title.isBlank()) continue
        shows += AnimePaheShow(
            session = session,
            title = title,
            type = row.optString("type").takeIf { it.isNotBlank() },
        )
    }
    val exact = shows.filter { animepaheNormalize(it.title) == want }
    val pool = exact.ifEmpty {
        shows.filter { show ->
            val title = animepaheNormalize(show.title)
            title.isNotEmpty() && (title.contains(want) || want.contains(title))
        }
    }
    if (pool.isEmpty()) return null
    return pool.firstOrNull { it.type.equals("TV", ignoreCase = true) } ?: pool.first()
}

internal fun animepaheEpisodeSession(payload: String, episode: Int): String? {
    val root = runCatching { JSONObject(payload) }.getOrNull() ?: return null
    val rows = root.optJSONArray("data") ?: return null
    val want = episode.toDouble()
    for (i in 0 until rows.length()) {
        val row = rows.optJSONObject(i) ?: continue
        val listed = when (val value = row.opt("episode")) {
            is Number -> value.toDouble()
            is String -> value.toDoubleOrNull()
            else -> null
        } ?: continue
        if (kotlin.math.abs(listed - want) > 0.001) continue
        val session = row.optString("session").trim()
        if (session.isNotEmpty()) return session
    }
    return null
}

internal fun animepaheLastPage(payload: String): Int {
    val root = runCatching { JSONObject(payload) }.getOrNull() ?: return 1
    return root.optInt("last_page", 1).coerceAtLeast(1)
}

internal fun animepahePerPage(payload: String): Int {
    val root = runCatching { JSONObject(payload) }.getOrNull() ?: return 30
    return root.optInt("per_page", 30).coerceAtLeast(1)
}

internal fun animepaheLinks(html: String): List<AnimePaheLink> {
    val links = ArrayList<AnimePaheLink>()
    for (tag in BUTTON.findAll(html)) {
        val raw = attr(tag.value, "data-src")?.replace("&amp;", "&")?.trim() ?: continue
        val absolute = when {
            raw.startsWith("https://") -> raw
            raw.startsWith("//") -> "https:$raw"
            else -> continue
        }
        val resolution = attr(tag.value, "data-resolution")
            ?.filter { it.isDigit() }
            ?.toIntOrNull()
            ?: 0
        val audio = attr(tag.value, "data-audio")?.trim()?.lowercase().orEmpty()
        val av1 = attr(tag.value, "data-av1") == "1"
        links += AnimePaheLink(absolute, resolution, audio, av1)
    }
    return links
}

internal fun animepahePickLink(links: List<AnimePaheLink>, dub: Boolean): AnimePaheLink? {
    val matching = links.filter { animepaheAudioMatches(it.audio, dub) }
    if (matching.isEmpty()) return null
    return matching.sortedWith(
        compareByDescending<AnimePaheLink> { it.resolution }.thenBy { it.av1 },
    ).first()
}

internal fun animepaheAudioMatches(audio: String, dub: Boolean): Boolean {
    val code = audio.substringBefore('-').trim()
    val english = code == "eng" || code == "en" || code == "english" || code == "dub"
    val japanese = code.isEmpty() ||
        code == "jpn" ||
        code == "jap" ||
        code == "jp" ||
        code == "japanese" ||
        code == "sub"
    return if (dub) english else japanese
}

internal fun animepaheUnpackMedia(html: String): String? {
    for (match in PACKED_CALL.findAll(html)) {
        val unpacked = unpackPacked(match) ?: continue
        animepaheMediaUrl(unpacked)?.let { return it }
    }
    return null
}

internal fun animepaheMediaUrl(unpacked: String): String? {
    val prefixes = listOf(
        "const source='" to "'",
        "var source='" to "'",
        "const source=\"" to "\"",
        "var source=\"" to "\"",
    )
    for ((prefix, suffix) in prefixes) {
        val start = unpacked.indexOf(prefix)
        if (start < 0) continue
        val from = start + prefix.length
        val end = unpacked.indexOf(suffix, from)
        if (end < 0) continue
        val url = unpacked.substring(from, end)
        if (url.startsWith("https://") && (".m3u8" in url || ".mp4" in url)) return url
    }
    return MEDIA_URL.find(unpacked)?.value
}

internal fun animepaheKwikForm(html: String): AnimePaheForm? {
    val action = FORM_ACTION.find(html)?.groupValues?.get(1)?.trim().orEmpty()
    if (!action.startsWith("https://")) return null
    val token = TOKEN_NAME_FIRST.find(html)?.groupValues?.get(1)
        ?: TOKEN_VALUE_FIRST.find(html)?.groupValues?.get(1)
        ?: return null
    if (token.isBlank()) return null
    return AnimePaheForm(action, token)
}

internal fun animepahePlayable(
    mediaUrl: String,
    playlist: String,
    resolution: Int?,
    dub: Boolean,
    refererOrigin: String,
    userAgent: String,
    cookieHeader: String? = null,
): PlayableSource? {
    if (!mediaUrl.startsWith("https://")) return null
    val hls = ".m3u8" in mediaUrl || playlist.trimStart().startsWith("#EXTM3U")
    val file = ".mp4" in mediaUrl
    if (!hls && !file) return null
    val mode = if (dub) "dub" else "sub"
    val fromPlaylist = if (playlist.trimStart().startsWith("#EXTM3U")) {
        animepaheBestVariant(playlist)
    } else {
        ""
    }
    val evidence = fromPlaylist.ifBlank { resolution?.takeIf { it >= 360 }?.let { "${it}p" }.orEmpty() }
    val fields = BuiltInSourceMeta.animepahe(evidence, mode)
    val origin = refererOrigin.trimEnd('/')
    val headers = linkedMapOf(
        "Referer" to "$origin/",
        "Origin" to origin,
        "User-Agent" to userAgent,
    )
    animepaheClearanceToken(cookieHeader)?.let { headers["Cookie"] = cookieHeader!!.trim() }
    return PlayableSource(
        url = mediaUrl,
        headers = headers,
        label = fields.quality ?: if (dub) "DUB" else "SUB",
        stripBytes = 0,
        quality = fields.quality,
        audio = fields.audio,
        hls = hls,
        audioLanguage = requestedAudioLanguage(mode),
    )
}

internal fun animepaheBestVariant(playlist: String): String {
    var best = ""
    var bestHeight = -1
    for (line in playlist.lineSequence()) {
        if (!line.contains("RESOLUTION", ignoreCase = true)) continue
        val height = Regex("""RESOLUTION=\d+x(\d+)""", RegexOption.IGNORE_CASE)
            .find(line)
            ?.groupValues
            ?.get(1)
            ?.toIntOrNull()
            ?: continue
        if (height > bestHeight) {
            bestHeight = height
            best = line
        }
    }
    return best
}

internal fun animepaheOrigin(url: String): String? =
    Regex("""^https://[^/]+""", RegexOption.IGNORE_CASE).find(url)?.value

private fun unpackPacked(match: MatchResult): String? {
    val payload = jsUnescape(match.groupValues[1])
    val radix = match.groupValues[2].toIntOrNull() ?: return null
    val count = match.groupValues[3].toIntOrNull() ?: return null
    val symbols = jsUnescape(match.groupValues[4]).split('|')
    if (radix < 2 || count !in 0..50_000) return null
    var result = payload
    for (index in count - 1 downTo 0) {
        val word = symbols.getOrNull(index).orEmpty()
        if (word.isEmpty()) continue
        val token = packerEncode(index, radix)
        if (token.isEmpty()) continue
        result = if (token.all { it.isLetterOrDigit() || it == '_' }) {
            result.replace(Regex("""\b${Regex.escape(token)}\b"""), word)
        } else {
            result.replace(token, word)
        }
    }
    return result
}

internal fun packerEncode(index: Int, radix: Int): String {
    fun rec(value: Int): String {
        val base = if (value < radix) "" else rec(value / radix)
        val rem = value % radix
        val digit = if (rem > 35) (rem + 29).toChar().toString() else rem.toString(36)
        return base + digit
    }
    return rec(index)
}

private fun jsUnescape(raw: String): String {
    val out = StringBuilder(raw.length)
    var i = 0
    while (i < raw.length) {
        if (raw[i] == '\\' && i + 1 < raw.length) {
            out.append(
                when (val next = raw[i + 1]) {
                    'n' -> '\n'
                    'r' -> '\r'
                    't' -> '\t'
                    else -> next
                },
            )
            i += 2
        } else {
            out.append(raw[i])
            i += 1
        }
    }
    return out.toString()
}

private fun attr(tag: String, name: String): String? {
    val match = Regex(
        """\b${Regex.escape(name)}\s*=\s*(?:"([^"]*)"|'([^']*)')""",
        RegexOption.IGNORE_CASE,
    ).find(tag) ?: return null
    return match.groupValues[1].ifBlank { match.groupValues[2] }
}

private val BUTTON = Regex("""<button\b[^>]*>""", RegexOption.IGNORE_CASE)
private val PACKED_CALL = Regex(
    """\}\(\s*'((?:\\'|[^'])*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:\\'|[^'])*)'\.split\(\s*'\|'\s*\)""",
)
private val MEDIA_URL = Regex("""https://[^\s'"\\]+\.(?:m3u8|mp4)[^\s'"\\]*""")
private val FORM_ACTION = Regex(
    """<form\b[^>]*\baction\s*=\s*["']([^"']+)["']""",
    RegexOption.IGNORE_CASE,
)
private val TOKEN_NAME_FIRST = Regex(
    """name\s*=\s*["']_token["'][^>]*value\s*=\s*["']([^"']+)["']""",
    RegexOption.IGNORE_CASE,
)
private val TOKEN_VALUE_FIRST = Regex(
    """value\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']_token["']""",
    RegexOption.IGNORE_CASE,
)
