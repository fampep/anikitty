// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import site.anikitty.app.data.skip.SkipInterval
import site.anikitty.app.data.skip.SkipTimes
import java.net.URI
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

/**
 * On-device gogoanime.by resolve.
 *
 * AniList stays the catalog. Search is the site's `GET /?s=` page. The series
 * page lists episode links. Sub episodes end in `english-subbed` and dub
 * episodes end in `english-dubbed`. The episode player page embeds MegaPlay
 * or MegaVid, and the playable file is the HLS playlist that page states.
 * Playback stays on this phone.
 */
class GogoAnimeServer(
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
        name = "gogoanime",
        description = "On-device gogoanime.by resolve. The playlist plays on this phone.",
        iconUrl = "https://www.google.com/s2/favicons?domain=gogoanime.by&sz=128",
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
        val show = findShow(anilistId, titleHint, dub)
        val episodeUrl = findEpisode(show.url, episode, dub)
        val players = openPlayers(episodeUrl, dub)
        for (player in players) {
            val source = openPlayer(player, dub) ?: continue
            return@withContext listOf(source)
        }
        error(MISSING)
    }

    private fun findShow(anilistId: Int, titleHint: String?, dub: Boolean): GogoShow {
        cachedSeries(anilistId, dub)?.let { return GogoShow(titleHint.orEmpty(), it) }
        val title = FlixCrypto.cleanTitle(titleHint)
        if (title.isBlank()) error("gogoanime needs a title to find this show.")
        for (query in gogoQueries(title)) {
            val body = get("$ORIGIN/?s=${enc(query)}", siteHeaders())
            if (gogoBlocked(body.code, body.text)) error(BLOCKED)
            if (body.code !in 200..299) error(BLOCKED)
            val show = gogoPickShow(gogoSearchHits(body.text), title, dub) ?: continue
            remember(anilistId, dub, show.url)
            return show
        }
        error(MISSING)
    }

    private fun findEpisode(seriesUrl: String, episode: Int, dub: Boolean): String {
        cache?.getEpisodes(ID, seriesUrl)?.let { cached ->
            val hit = cached.firstOrNull { row ->
                row.number == episode && if (dub) row.hasDub else row.hasSub
            }
            if (hit != null && gogoSameSite(hit.ids)) return hit.ids
        }
        val body = get(seriesUrl, siteHeaders())
        if (gogoBlocked(body.code, body.text)) error(BLOCKED)
        if (body.code !in 200..299) error(BLOCKED)
        val rows = gogoEpisodes(body.text)
        if (rows.isNotEmpty()) {
            cache?.putEpisodes(
                ID,
                seriesUrl,
                rows.map { row ->
                    ResolveCache.CachedEpisode(
                        number = row.number,
                        ids = row.url,
                        hasSub = !row.dub,
                        hasDub = row.dub,
                    )
                },
            )
        }
        return rows.firstOrNull { it.number == episode && it.dub == dub }?.url ?: error(MISSING)
    }

    private fun openPlayers(episodeUrl: String, dub: Boolean): List<GogoPlayer> {
        val body = get(episodeUrl, siteHeaders())
        if (gogoBlocked(body.code, body.text)) error(BLOCKED)
        if (body.code !in 200..299) error(BLOCKED)
        return gogoPlayers(body.text, dub).ifEmpty { error(MISSING) }
    }

    private fun openPlayer(player: GogoPlayer, dub: Boolean): PlayableSource? {
        val page = get(player.url, siteHeaders())
        if (gogoBlocked(page.code, page.text)) error(BLOCKED)
        if (page.code !in 200..299) return null
        val frame = gogoFrame(page.text) ?: return null
        return when (gogoHost(frame)) {
            MEGAPLAY_HOST -> openMegaPlay(frame, player.label, dub)
            MEGAVID_HOST -> openMegaVid(frame, player.label, dub)
            else -> null
        }
    }

    private fun openMegaPlay(frame: String, label: String, dub: Boolean): PlayableSource? {
        val embed = readOptional(frame, embedHeaders(ORIGIN)) ?: return null
        if (embed.code !in 200..299 || gogoBlocked(embed.code, embed.text)) return null
        val file = gogoMegaPlayFile(embed.text) ?: return null
        val playlist = readOptional(file, mediaHeaders(MEGAPLAY_ORIGIN)) ?: return null
        if (playlist.code !in 200..299) return null
        return gogoPlayable(
            url = file,
            playlist = playlist.text,
            siteLabel = label,
            dub = dub,
            userAgent = USER_AGENT,
            origin = MEGAPLAY_ORIGIN,
        )
    }

    private fun openMegaVid(frame: String, label: String, dub: Boolean): PlayableSource? {
        val page = readOptional(frame, embedHeaders(frame)) ?: return null
        if (page.code !in 200..299 || gogoBlocked(page.code, page.text)) return null
        val path = gogoMegaVidPath(page.text) ?: return null
        val primary = "$MEGAVID_ORIGIN$path"
        val fallback = if ('?' in primary) "$primary&provider=1" else "$primary?provider=1"
        return openMegaVidSource(primary, frame, label, dub)
            ?: openMegaVidSource(fallback, frame, label, dub)
    }

    private fun openMegaVidSource(
        sourceUrl: String,
        frame: String,
        label: String,
        dub: Boolean,
    ): PlayableSource? {
        val body = readOptional(sourceUrl, embedHeaders(frame)) ?: return null
        if (body.code !in 200..299 || gogoBlocked(body.code, body.text)) return null
        val pending = gogoMegaVid(body.text) ?: return null
        val playlist = readOptional(pending.url, mediaHeaders(MEGAVID_ORIGIN)) ?: return null
        if (playlist.code !in 200..299) return null
        return gogoPlayable(
            url = pending.url,
            playlist = playlist.text,
            siteLabel = label,
            dub = dub,
            userAgent = USER_AGENT,
            origin = MEGAVID_ORIGIN,
            skip = pending.skip,
            subtitles = pending.tracks,
        )
    }

    private fun cachedSeries(anilistId: Int, dub: Boolean): String? {
        val site = cache?.getShow(ID, anilistId)?.siteId ?: return null
        val key = if (dub) "dub:" else "sub:"
        return site.split('|')
            .firstOrNull { it.startsWith(key) }
            ?.removePrefix(key)
            ?.takeIf { gogoSameSite(it) && "/series/" in it }
    }

    private fun remember(anilistId: Int, dub: Boolean, url: String) {
        val previous = cache?.getShow(ID, anilistId)?.siteId.orEmpty()
        val key = if (dub) "dub:" else "sub:"
        val parts = previous.split('|')
            .filter { it.startsWith("sub:") || it.startsWith("dub:") }
            .filterNot { it.startsWith(key) }
            .toMutableList()
        parts += key + url
        cache?.putShow(ID, anilistId, parts.joinToString("|"), url)
    }

    private fun get(url: String, headers: Map<String, String>): HttpText {
        return readOptional(url, headers) ?: error(BLOCKED)
    }

    private fun readOptional(url: String, headers: Map<String, String>): HttpText? {
        val builder = Request.Builder().url(url).get()
        headers.forEach { (name, value) -> builder.header(name, value) }
        val response = runCatching { http.newCall(builder.build()).execute() }.getOrNull() ?: return null
        response.use {
            return HttpText(it.code, it.body?.string().orEmpty())
        }
    }

    private fun siteHeaders(): Map<String, String> = mapOf(
        "Accept" to "text/html,application/xhtml+xml",
        "Referer" to "$ORIGIN/",
        "User-Agent" to USER_AGENT,
    )

    private fun embedHeaders(referer: String): Map<String, String> = mapOf(
        "Accept" to "text/html,application/json",
        "Referer" to referer,
        "User-Agent" to USER_AGENT,
    )

    private fun mediaHeaders(origin: String): Map<String, String> = mapOf(
        "Referer" to "$origin/",
        "Origin" to origin,
        "User-Agent" to USER_AGENT,
    )

    private fun enc(value: String): String =
        URLEncoder.encode(value, Charsets.UTF_8.name()).replace("+", "%20")

    private data class HttpText(val code: Int, val text: String)

    companion object {
        const val ID = "gogoanime"
        const val MISSING = "gogoanime does not have this episode."
        const val BLOCKED = "gogoanime could not be reached."
        const val ORIGIN = "https://gogoanime.by"
        const val MEGAPLAY_ORIGIN = "https://megaplay.su"
        const val MEGAVID_ORIGIN = "https://megavid.buzz"
        const val MEGAPLAY_HOST = "megaplay.su"
        const val MEGAVID_HOST = "megavid.buzz"
        const val USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    }
}

internal data class GogoShow(val title: String, val url: String)

internal data class GogoPlayer(val url: String, val label: String)

internal data class GogoEpisode(val number: Int, val url: String, val dub: Boolean)

internal data class GogoPending(
    val url: String,
    val tracks: List<SubtitleTrack>,
    val skip: SkipTimes,
)

internal fun gogoBlocked(code: Int, body: String): Boolean {
    if (code == 403 || code == 429 || code == 503) return true
    val head = body.take(5000).lowercase()
    return "just a moment" in head ||
        "cf-browser-verification" in head ||
        "challenge-platform" in head ||
        "attention required" in head ||
        "you have been blocked" in head
}

internal fun gogoQueries(title: String): List<String> {
    val full = title.trim()
    if (full.isEmpty()) return emptyList()
    val skip = setOf(
        "season", "second", "third", "first", "part", "movie", "special",
        "english", "dubbed", "subbed", "the", "and", "cour",
    )
    val tokens = full.split(Regex("\\s+"))
        .map { it.trim() }
        .filter { it.length >= 5 && it.lowercase() !in skip }
        .sortedByDescending { it.length }
    return (listOf(full) + tokens).distinct()
}

internal fun gogoSearchHits(html: String): List<GogoShow> {
    var from = 0
    while (from < html.length) {
        val at = html.indexOf("class=\"listupd\"", from)
        if (at < 0) return emptyList()
        val tagStart = html.lastIndexOf('<', at).coerceAtLeast(0)
        val tagEnd = html.indexOf('>', at)
        if (tagEnd < 0) return emptyList()
        val tag = html.substring(tagStart, tagEnd + 1)
        if ("external-results" !in tag) {
            val next = html.indexOf("class=\"listupd\"", tagEnd + 1).let { if (it < 0) html.length else it }
            return gogoArticles(html.substring(tagEnd + 1, next))
        }
        from = tagEnd + 1
    }
    return emptyList()
}

internal fun gogoPickShow(hits: List<GogoShow>, titleHint: String, dub: Boolean): GogoShow? {
    val want = gogoNormalize(titleHint)
    if (want.isBlank()) return null
    return hits
        .map { show -> show to gogoScore(show.title, want, dub) }
        .filter { it.second >= 50 }
        .maxWithOrNull(
            compareBy<Pair<GogoShow, Int>> { it.second }
                .thenByDescending { gogoNormalize(it.first.title).length },
        )
        ?.first
}

internal fun gogoEpisodes(html: String): List<GogoEpisode> {
    val pattern = Regex(
        """data-episode-number="(\d+)"[\s\S]{0,500}?href="(https://gogoanime\.by/[^"]+)"""",
    )
    val rows = ArrayList<GogoEpisode>()
    for (match in pattern.findAll(html)) {
        val number = match.groupValues[1].toIntOrNull() ?: continue
        val url = gogoUnescape(match.groupValues[2])
        if (!gogoSameSite(url)) continue
        val dubbed = "english-dubbed" in url
        val subbed = "english-subbed" in url
        if (!dubbed && !subbed) continue
        rows += GogoEpisode(number, url, dubbed)
    }
    return rows
}

internal fun gogoPlayers(html: String, dub: Boolean): List<GogoPlayer> {
    val type = if (dub) "dub" else "sub"
    val section = Regex("""<div class="type" data-type="$type">([\s\S]*?)</div>""")
        .find(html)
        ?.groupValues
        ?.get(1)
        ?: return emptyList()
    val item = Regex("""<li class="player-type-link" data-src="([^"]*)">([^<]*)</li>""")
    return item.findAll(section).mapNotNull { match ->
        val url = gogoUnescape(match.groupValues[1]).trim()
        if (!url.startsWith("${GogoAnimeServer.ORIGIN}/player/")) return@mapNotNull null
        GogoPlayer(url, gogoUnescape(match.groupValues[2]).trim())
    }.sortedBy { player ->
        if ("source=embed" in player.url) 0 else 1
    }.toList()
}

internal fun gogoFrame(html: String): String? {
    val pattern = Regex("""<iframe[^>]+src="(https://[^"]+)"""", RegexOption.IGNORE_CASE)
    for (match in pattern.findAll(html)) {
        val url = gogoUnescape(match.groupValues[1])
        val host = gogoHost(url)
        if (host == GogoAnimeServer.MEGAPLAY_HOST || host == GogoAnimeServer.MEGAVID_HOST) return url
    }
    return null
}

internal fun gogoMegaPlayFile(html: String): String? {
    val pattern = Regex("""file:\s*"(https://[^"]+)"""")
    for (match in pattern.findAll(html)) {
        val url = match.groupValues[1]
        if (gogoHost(url) == GogoAnimeServer.MEGAPLAY_HOST && ".m3u8" in url) return url
    }
    return null
}

internal fun gogoMegaVidPath(html: String): String? {
    val marker = "id=\"player-payload\">"
    val at = html.indexOf(marker)
    if (at < 0) return null
    val start = html.indexOf('{', at)
    val end = html.indexOf("</script>", start)
    if (start < 0 || end < 0) return null
    val root = runCatching { JSONObject(html.substring(start, end)) }.getOrNull() ?: return null
    val path = root.optString("sourceUrl").trim()
    if (!path.startsWith("/") || path.startsWith("//") || ".." in path) return null
    return path
}

internal fun gogoMegaVid(payload: String): GogoPending? {
    val root = runCatching { JSONObject(payload) }.getOrNull() ?: return null
    if (root.optString("status") != "ok") return null
    val url = root.optString("source").trim()
    if (!gogoAllowedMedia(url)) return null
    return GogoPending(url, gogoTracks(root), gogoSkip(root))
}

internal fun gogoAllowedMedia(url: String): Boolean {
    if (!url.startsWith("https://")) return false
    val host = gogoHost(url) ?: return false
    return host == GogoAnimeServer.MEGAPLAY_HOST ||
        host == GogoAnimeServer.MEGAVID_HOST ||
        host == "megavid.se" ||
        host.endsWith(".megavid.se")
}

internal fun gogoPlayable(
    url: String,
    playlist: String,
    siteLabel: String,
    dub: Boolean,
    userAgent: String,
    origin: String,
    skip: SkipTimes = SkipTimes(),
    subtitles: List<SubtitleTrack> = emptyList(),
): PlayableSource? {
    if (!playlist.trimStart().startsWith("#EXTM3U")) return null
    if (!gogoAllowedMedia(url)) return null
    val mode = if (dub) "dub" else "sub"
    val fields = BuiltInSourceMeta.gogo(siteLabel, gogoBestVariant(playlist), mode)
    return PlayableSource(
        url = url,
        headers = mapOf(
            "Referer" to "$origin/",
            "Origin" to origin,
            "User-Agent" to userAgent,
        ),
        label = fields.quality ?: fields.qualityRating ?: if (dub) "DUB" else "SUB",
        stripBytes = 0,
        subtitles = subtitles,
        quality = fields.quality,
        audio = fields.audio,
        qualityRating = fields.qualityRating,
        hls = true,
        skip = skip,
        audioLanguage = requestedAudioLanguage(mode),
    )
}

internal fun gogoSameSite(url: String): Boolean {
    if (!url.startsWith("https://")) return false
    return gogoHost(url) == "gogoanime.by"
}

internal fun gogoHost(url: String): String? =
    runCatching { URI(url).host }.getOrNull()?.lowercase()

internal fun gogoUnescape(raw: String): String {
    val named = raw
        .replace("&amp;", "&")
        .replace("&#038;", "&")
        .replace("&quot;", "\"")
        .replace("&#039;", "'")
        .replace("&apos;", "'")
    return Regex("""&#(x?[0-9a-fA-F]+);""").replace(named) { match ->
        val body = match.groupValues[1]
        val code = if (body.startsWith("x", ignoreCase = true)) {
            body.drop(1).toIntOrNull(16)
        } else {
            body.toIntOrNull()
        }
        if (code == null || code !in 1..0xFFFF) match.value else code.toChar().toString()
    }
}

private fun gogoArticles(block: String): List<GogoShow> {
    val pattern = Regex(
        """<a[^>]+href="(https://gogoanime\.by/series/[^"#?]+)"[^>]*title="([^"]+)"""",
        RegexOption.IGNORE_CASE,
    )
    val hits = ArrayList<GogoShow>()
    for (match in pattern.findAll(block)) {
        val url = gogoUnescape(match.groupValues[1]).let { if (it.endsWith("/")) it else "$it/" }
        if (!gogoSameSite(url)) continue
        if (hits.any { it.url == url }) continue
        hits += GogoShow(gogoUnescape(match.groupValues[2]), url)
    }
    return hits
}

/**
 * Exact title wins. A title that contains every query word still ranks above a
 * partial overlap, and each extra word (movie, sequel, year, TV) lowers it.
 * Dub and sub labels are not extra words. Equal scores prefer the shorter title,
 * so list order cannot pick a longer tie.
 */
private fun gogoScore(title: String, want: String, dub: Boolean): Int {
    val name = gogoNormalize(title)
    if (name.isBlank()) return 0
    val dubbed = Regex("""\bdub\b|\bdubbed\b""").containsMatchIn(name)
    if (dub && !dubbed) return 0
    if (!dub && dubbed) return 0
    if (name == want) return 10_000
    val wantWords = gogoWords(want)
    val nameWords = name.split(' ').filter { it.isNotBlank() }
    if (wantWords.isEmpty()) return 0
    if (wantWords.all { it in nameWords }) {
        val extras = nameWords.count { it !in wantWords && it !in LANGUAGE_WORDS }
        return 5_000 - extras * 10
    }
    val shared = wantWords.count { it in nameWords }
    if (shared == 0) return 0
    return shared * 15 + 5
}

private fun gogoWords(normalized: String): List<String> =
    normalized.split(' ').filter { word -> word.length >= 3 || word.any { it.isDigit() } }

private fun gogoNormalize(raw: String?): String {
    val cleaned = FlixCrypto.cleanTitle(raw)
    if (cleaned.isBlank()) return ""
    val folded = buildString(cleaned.length) {
        for (char in cleaned) {
            append(HOMOGLYPHS[char] ?: char)
        }
    }
    return folded.lowercase()
        .replace(Regex("[^a-z0-9]+"), " ")
        .trim()
        .split(' ')
        .joinToString(" ") { token ->
            ORDINAL.find(token)?.groupValues?.get(1) ?: token
        }
}

private fun gogoTracks(root: JSONObject): List<SubtitleTrack> {
    val rows = root.optJSONArray("tracks") ?: return emptyList()
    val tracks = ArrayList<SubtitleTrack>()
    for (i in 0 until rows.length()) {
        val row = rows.optJSONObject(i) ?: continue
        val url = row.optString("file").trim()
        if (!gogoAllowedMedia(url)) continue
        val label = row.optString("label").trim()
        if (label.isEmpty()) continue
        val mime = if (url.substringBefore('?').endsWith(".vtt", ignoreCase = true)) "text/vtt" else null
        tracks += SubtitleTrack(url = url, label = label, mimeType = mime)
    }
    return tracks
}

private fun gogoSkip(root: JSONObject): SkipTimes {
    val rows = root.optJSONArray("chapters") ?: return SkipTimes()
    var intro: SkipInterval? = null
    var outro: SkipInterval? = null
    for (i in 0 until rows.length()) {
        val row = rows.optJSONObject(i) ?: continue
        val start = row.optDouble("start", Double.NaN)
        val end = row.optDouble("end", Double.NaN)
        if (!start.isFinite() || !end.isFinite() || start < 0.0 || end <= start) continue
        val title = row.optString("title")
        when {
            title.equals("Intro", ignoreCase = true) -> intro = SkipInterval(start, end)
            title.equals("Outro", ignoreCase = true) -> outro = SkipInterval(start, end)
        }
    }
    return SkipTimes(intro = intro, outro = outro)
}

private fun gogoBestVariant(playlist: String): String {
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

private val LANGUAGE_WORDS = setOf("english", "dub", "dubbed", "sub", "subbed")

private val ORDINAL = Regex("""^(\d+)(?:st|nd|rd|th)$""")

private val HOMOGLYPHS = mapOf(
    'а' to 'a', 'А' to 'a',
    'е' to 'e', 'Е' to 'e',
    'о' to 'o', 'О' to 'o',
    'р' to 'p', 'Р' to 'p',
    'с' to 'c', 'С' to 'c',
    'у' to 'y', 'У' to 'y',
    'х' to 'x', 'Х' to 'x',
    'і' to 'i', 'І' to 'i',
)
