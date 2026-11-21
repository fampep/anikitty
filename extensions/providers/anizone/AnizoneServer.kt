// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

/**
 * On-device anizone.to resolve.
 *
 * AniList stays the catalog. Search is the site's anime search page. A card
 * matches only when one of its titles is the same name. The episode page is
 * `/anime/{id}/{number}` (and the same path under `index.php`). That page
 * states the HLS master on `media-player` and any subtitle tracks beside it.
 * English audio is used only when the page gives that file. Playback stays
 * on this phone.
 */
class AnizoneServer(
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
        name = "anizone",
        description = "On-device anizone.to resolve. The playlist plays on this phone.",
        iconUrl = "https://www.google.com/s2/favicons?domain=anizone.to&sz=128",
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
        val page = openPage(anizoneEpisodeUrls(show.slug, episode))
        val offer = anizoneChoose(anizoneOffers(page.text), dub) ?: error(MISSING)
        val playlist = read(offer.url, mediaHeaders()) ?: error(BLOCKED)
        if (anizoneBlocked(playlist.code, playlist.text)) error(BLOCKED)
        if (playlist.code !in 200..299) error(MISSING)
        listOf(
            anizonePlayable(
                url = offer.url,
                playlist = playlist.text,
                dub = offer.english,
                tracks = offer.tracks,
                userAgent = USER_AGENT,
            ) ?: error(MISSING),
        )
    }

    private fun findShow(anilistId: Int, titleHint: String?): AnizoneShow {
        cache?.getShow(ID, anilistId)?.siteId?.takeIf { anizoneSlug(it) }?.let { slug ->
            return AnizoneShow(slug, titleHint.orEmpty(), emptyList())
        }
        val title = FlixCrypto.cleanTitle(titleHint)
        if (title.isBlank()) error("anizone needs a title to find this show.")
        for (query in anizoneQueries(title)) {
            val page = openPage(anizoneSearchUrls(query))
            val show = anizonePickShow(anizoneSearchHits(page.text), title) ?: continue
            cache?.putShow(ID, anilistId, show.slug, "$ORIGIN/anime/${show.slug}")
            return show
        }
        error(MISSING)
    }

    private fun openPage(urls: List<String>): HttpText {
        var blocked = false
        for (url in urls) {
            val body = read(url, siteHeaders())
            if (body == null) {
                blocked = true
                continue
            }
            if (anizoneBlocked(body.code, body.text)) {
                blocked = true
                continue
            }
            if (body.code == 404) continue
            if (body.code !in 200..299) {
                blocked = true
                continue
            }
            if (body.text.isBlank()) continue
            return body
        }
        error(if (blocked) BLOCKED else MISSING)
    }

    private fun read(url: String, headers: Map<String, String>): HttpText? {
        val builder = Request.Builder().url(url).get()
        headers.forEach { (name, value) -> builder.header(name, value) }
        val response = runCatching { http.newCall(builder.build()).execute() }.getOrNull() ?: return null
        response.use { return HttpText(it.code, it.body?.string().orEmpty()) }
    }

    private fun siteHeaders(): Map<String, String> = mapOf(
        "Accept" to "text/html,application/xhtml+xml",
        "Referer" to "$ORIGIN/",
        "User-Agent" to USER_AGENT,
    )

    private fun mediaHeaders(): Map<String, String> = mapOf(
        "Accept" to "application/vnd.apple.mpegurl,application/x-mpegURL,*/*",
        "Referer" to "$ORIGIN/",
        "Origin" to ORIGIN,
        "User-Agent" to USER_AGENT,
    )

    private data class HttpText(val code: Int, val text: String)

    companion object {
        const val ID = "anizone"
        const val MISSING = "anizone does not have this episode."
        const val BLOCKED = "anizone could not be reached."
        const val ORIGIN = "https://anizone.to"
        const val USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    }
}

internal data class AnizoneShow(
    val slug: String,
    val title: String,
    val aliases: List<String>,
)

internal data class AnizoneOffer(
    val url: String,
    val english: Boolean,
    val tracks: List<SubtitleTrack>,
)

internal fun anizoneSlug(value: String): Boolean = SLUG.matches(value)

internal fun anizoneQueries(title: String): List<String> {
    val full = title.trim()
    if (full.isEmpty()) return emptyList()
    val head = full.substringBefore(':').trim()
    return listOf(full, head).filter { it.isNotEmpty() }.distinct()
}

internal fun anizoneSearchUrls(query: String): List<String> {
    val q = URLEncoder.encode(query, Charsets.UTF_8.name()).replace("+", "%20")
    return listOf(
        "${AnizoneServer.ORIGIN}/anime?search=$q",
        "${AnizoneServer.ORIGIN}/index.php/anime?search=$q",
    )
}

internal fun anizoneEpisodeUrls(slug: String, episode: Int): List<String> {
    require(anizoneSlug(slug))
    require(episode > 0)
    return listOf(
        "${AnizoneServer.ORIGIN}/anime/$slug/$episode",
        "${AnizoneServer.ORIGIN}/index.php/anime/$slug/$episode",
    )
}

internal fun anizoneSearchHits(html: String): List<AnizoneShow> {
    val page = anizoneHtml(html)
    val shows = ArrayList<AnizoneShow>()
    val seen = HashSet<String>()
    for (match in ANIME_LINK.findAll(page)) {
        val slug = match.groupValues[1]
        if (!seen.add(slug)) continue
        val start = (match.range.first - 2_000).coerceAtLeast(0)
        val window = page.substring(start, match.range.last + 1)
        val titles = anizoneTitles(window)
        if (titles.isEmpty()) continue
        shows += AnizoneShow(slug, titles.first(), titles.drop(1))
    }
    return shows
}

internal fun anizonePickShow(hits: List<AnizoneShow>, titleHint: String): AnizoneShow? {
    val want = anizoneNormalize(titleHint)
    if (want.isBlank()) return null
    val exact = hits.filter { show ->
        anizoneNormalize(show.title) == want || show.aliases.any { anizoneNormalize(it) == want }
    }
    if (exact.isEmpty()) return null
    return exact.minByOrNull { show ->
        if (anizoneNormalize(show.title) == want) 0 else 1
    }
}

internal fun anizoneOffers(html: String): List<AnizoneOffer> {
    val page = anizoneHtml(html)
    val tracks = anizoneTracks(page)
    val labeled = anizoneLabeledOffers(page, tracks)
    val players = anizonePlayerUrls(page)
    // A button that embeds one language must not hide the master already on
    // the page. That master is the Japanese file unless the page is English only.
    val masterIsEnglish = labeled.isEmpty() && anizonePageIsEnglishOnly(page)
    val offers = ArrayList<AnizoneOffer>()
    offers += labeled
    for (url in players) {
        if (offers.any { it.url == url }) continue
        offers += AnizoneOffer(url, masterIsEnglish, tracks)
    }
    return offers
}

internal fun anizoneChoose(offers: List<AnizoneOffer>, dub: Boolean): AnizoneOffer? {
    if (dub) return offers.firstOrNull { it.english }
    return offers.firstOrNull { !it.english }
}

internal fun anizoneBlocked(code: Int, body: String): Boolean {
    if (code == 403 || code == 429 || code == 503) return true
    val head = body.take(5_000).lowercase()
    return "just a moment" in head ||
        "cf-browser-verification" in head ||
        "challenge-platform" in head ||
        "attention required" in head ||
        "you have been blocked" in head
}

internal fun anizonePlayable(
    url: String,
    playlist: String,
    dub: Boolean,
    tracks: List<SubtitleTrack>,
    userAgent: String,
): PlayableSource? {
    if (!url.startsWith("https://")) return null
    if (!playlist.trimStart().startsWith("#EXTM3U")) return null
    val mode = if (dub) "dub" else "sub"
    val fields = BuiltInSourceMeta.anizone(anizoneBestVariant(playlist), mode)
    return PlayableSource(
        url = url,
        headers = mapOf(
            "Referer" to "${AnizoneServer.ORIGIN}/",
            "Origin" to AnizoneServer.ORIGIN,
            "User-Agent" to userAgent,
        ),
        label = fields.quality ?: if (dub) "DUB" else "SUB",
        stripBytes = 0,
        subtitles = tracks,
        quality = fields.quality,
        audio = fields.audio,
        qualityRating = fields.qualityRating,
        hls = !url.contains(".m3u8", ignoreCase = true),
        audioLanguage = requestedAudioLanguage(mode),
    )
}

private fun anizoneTitles(window: String): List<String> {
    val titles = LinkedHashSet<String>()
    // The card's own title is the last one before its link. An earlier card
    // can sit in the same window.
    GET_TITLE.findAll(window).lastOrNull()?.let { match ->
        val title = anizoneJsString(match.groupValues[1]).trim()
        if (title.isNotEmpty()) titles += title
    }
    JSON_PARSE.findAll(window).lastOrNull()?.let { match ->
        val raw = anizoneJsString(match.groupValues[1])
        val json = runCatching { JSONObject(raw) }.getOrNull()
        if (json != null) {
            val keys = json.keys()
            while (keys.hasNext()) {
                val value = json.optString(keys.next()).trim()
                if (value.isNotEmpty()) titles += value
            }
        }
    }
    return titles.toList()
}

private fun anizoneLabeledOffers(page: String, tracks: List<SubtitleTrack>): List<AnizoneOffer> {
    val offers = ArrayList<AnizoneOffer>()
    for (match in SET_VIDEO.findAll(page)) {
        val url = HTTPS_URL.find(anizoneJsString(match.groupValues[1]))?.value ?: continue
        if (!anizoneMediaUrl(url)) continue
        val label = match.groupValues[2]
        if (anizoneCaptionLabel(label)) continue
        offers += AnizoneOffer(url, anizoneEnglishLabel(label), tracks)
    }
    return offers
}

private fun anizonePlayerUrls(page: String): List<String> {
    val fromPlayer = MEDIA_PLAYER.findAll(page).map { it.groupValues[1] }.filter { anizoneMediaUrl(it) }
    val found = fromPlayer.distinct().toList()
    if (found.isNotEmpty()) return found
    return MASTER.findAll(page).map { it.value }.filter { anizoneMediaUrl(it) }.distinct().toList()
}

private fun anizoneTracks(page: String): List<SubtitleTrack> {
    val tracks = ArrayList<SubtitleTrack>()
    for (match in TRACK.findAll(page)) {
        val tag = match.groupValues[1]
        val src = attr(tag, "src") ?: continue
        if (!src.startsWith("https://")) continue
        val kind = attr(tag, "kind").orEmpty()
        val caption = kind.equals("subtitles", true) ||
            kind.equals("captions", true) ||
            src.substringBefore('?').let { path ->
                path.endsWith(".vtt", true) || path.endsWith(".srt", true) || path.endsWith(".ass", true)
            }
        if (!caption) continue
        val label = attr(tag, "label")?.takeIf { it.isNotBlank() }
            ?: attr(tag, "srclang")?.takeIf { it.isNotBlank() }
            ?: continue
        val mime = when {
            src.substringBefore('?').endsWith(".srt", true) -> "application/x-subrip"
            src.substringBefore('?').endsWith(".ass", true) -> "text/x-ssa"
            else -> "text/vtt"
        }
        tracks += SubtitleTrack(
            url = src,
            label = label,
            language = attr(tag, "srclang"),
            mimeType = mime,
        )
    }
    return tracks
}

private fun anizonePageIsEnglishOnly(page: String): Boolean {
    val labels = SET_VIDEO.findAll(page)
        .map { it.groupValues[2] }
        .filterNot { anizoneCaptionLabel(it) }
        .toList()
    if (labels.isEmpty()) return false
    return labels.any { anizoneEnglishLabel(it) } && labels.none { anizoneJapaneseLabel(it) }
}

private fun anizoneEnglishLabel(text: String): Boolean {
    if (anizoneCaptionLabel(text) || anizoneJapaneseLabel(text)) return false
    val lower = text.lowercase()
    return "english" in lower || Regex("""\bdub\b""").containsMatchIn(lower)
}

private fun anizoneJapaneseLabel(text: String): Boolean {
    val lower = text.lowercase()
    return "japan" in lower || Regex("""\bsub\b""").containsMatchIn(lower)
}

private fun anizoneCaptionLabel(text: String): Boolean {
    val lower = text.lowercase()
    return "subtitle" in lower || "caption" in lower
}

private fun anizoneMediaUrl(url: String): Boolean =
    url.startsWith("https://") && " " !in url && url.length < 2_000

private fun anizoneBestVariant(playlist: String): String {
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

private fun anizoneHtml(raw: String): String =
    raw.replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&#34;", "\"")
        .replace("&#39;", "'")
        .replace("&apos;", "'")

internal fun anizoneNormalize(raw: String): String =
    raw.lowercase()
        .replace('’', '\'')
        .replace("'", "")
        .replace(Regex("""[^\p{L}\p{N}]+"""), " ")
        .trim()

private fun anizoneJsString(raw: String): String {
    val out = StringBuilder()
    var index = 0
    while (index < raw.length) {
        val char = raw[index]
        if (char != '\\' || index + 1 >= raw.length) {
            out.append(char)
            index += 1
            continue
        }
        when (val next = raw[index + 1]) {
            'u' -> {
                if (index + 5 >= raw.length) {
                    out.append(char)
                    index += 1
                    continue
                }
                val code = raw.substring(index + 2, index + 6).toIntOrNull(16)
                if (code == null) {
                    out.append(char)
                    index += 1
                } else {
                    out.append(code.toChar())
                    index += 6
                }
            }
            '\\', '\'', '"', '/' -> {
                out.append(next)
                index += 2
            }
            'n' -> {
                out.append('\n')
                index += 2
            }
            else -> {
                out.append(next)
                index += 2
            }
        }
    }
    return out.toString()
}

private fun attr(tag: String, name: String): String? {
    val match = Regex("""\b$name\s*=\s*["']([^"']*)["']""", RegexOption.IGNORE_CASE).find(tag)
    return match?.groupValues?.get(1)?.trim()?.ifBlank { null }
}

private val SLUG = Regex("""[a-z0-9]+""")

private val ANIME_LINK = Regex(
    """(?:https://anizone\.to)?(?:/index\.php)?/anime/([a-z0-9]+)/?(?=["'#?\s])""",
)

private val GET_TITLE = Regex("""getTitle\(\s*this\.anmTitles\s*,\s*'((?:\\.|[^'\\])*)'\)""")

private val JSON_PARSE = Regex("""JSON\.parse\(\s*'((?:\\.|[^'\\])*)'\s*\)""")

private val MEDIA_PLAYER = Regex(
    """<media-player\b[^>]*\bsrc\s*=\s*["'](https://[^"']+)["']""",
    RegexOption.IGNORE_CASE,
)

private val MASTER = Regex("""https://[^"'\\\s<>]+master\.m3u8""")

private val TRACK = Regex("""<track\b([^>]*)/?>""", RegexOption.IGNORE_CASE)

private val SET_VIDEO = Regex(
    """wire:click\s*=\s*["']setVideo\(([^)]*)\)["'][^>]*>([^<]*)""",
    RegexOption.IGNORE_CASE,
)

private val HTTPS_URL = Regex("""https://[^"'\\\s<>]+""")
