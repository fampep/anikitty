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
import java.net.URLDecoder
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

/**
 * On-device ani.nz resolve.
 *
 * Search is `GET /api/anime/search`. The episode is the site's full
 * `GET /api/anime/playback-bootstrap/{source}/{id}` call, using the episode
 * route id when the site sends one. That selection opens ani.nz's own
 * settlar server. The playable file is the HLS master on `media.settlar.io`.
 * A third-party host is dropped. Playback stays on this phone. Intro and
 * credits come from the bootstrap when present. The quality label is the
 * tallest rung on that master.
 */
class AniNzServer(
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
        name = "ani.nz",
        description = "On-device ani.nz resolve. The playlist plays on this phone.",
        iconUrl = "https://www.google.com/s2/favicons?domain=ani.nz&sz=128",
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
        val lang = if (dub) "dub" else "sub"
        val boot = openBootstrap(show, episode, lang)
        val token = openSession(boot, episode, lang)
        listOf(openPlaylist(token, boot.skip, dub))
    }

    private fun findShow(anilistId: Int, titleHint: String?): AninzShow {
        cache?.getShow(ID, anilistId)?.siteId?.takeIf { it.isNotBlank() }?.let { cached ->
            val source = cached.substringBefore(':').ifBlank { "settlar" }
            val id = cached.substringAfter(':', "")
            if (id.isNotBlank()) return AninzShow(id, source, titleHint.orEmpty(), anilistId)
        }
        val title = FlixCrypto.cleanTitle(titleHint)
        if (title.isBlank()) error("ani.nz needs a title to find this show.")
        val body = get(
            "$ORIGIN/api/anime/search?q=${enc(title)}",
            siteHeaders(),
        )
        if (aninzBlocked(body.code, body.text)) error(BLOCKED)
        if (body.code !in 200..299) error(BLOCKED)
        val show = aninzPickShow(body.text, anilistId, title) ?: error(MISSING)
        cache?.putShow(ID, anilistId, "${show.source}:${show.id}", "$ORIGIN/anime/${enc(show.id)}")
        return show
    }

    private fun openBootstrap(show: AninzShow, episode: Int, lang: String): AninzBootstrap {
        val numbered = loadBootstrap(show, episode.toString(), lang) ?: error(MISSING)
        val route = numbered.routeId?.takeIf { it.isNotEmpty() && it != episode.toString() }
            ?: return numbered
        return loadBootstrap(show, route, lang) ?: numbered
    }

    /** Full bootstrap. `core=0` is the site's lean call and drops the episode route. */
    private fun loadBootstrap(show: AninzShow, episodeKey: String, lang: String): AninzBootstrap? {
        val source = if (show.source == "anilist") "anilist" else "settlar"
        val body = get(
            "$ORIGIN/api/anime/playback-bootstrap/$source/${enc(show.id)}?ep=${enc(episodeKey)}&lang=$lang",
            siteHeaders(),
        )
        if (aninzBlocked(body.code, body.text)) error(BLOCKED)
        if (body.code == 404) return null
        if (body.code !in 200..299) error(BLOCKED)
        return aninzBootstrap(body.text, lang)
    }

    private fun openSession(boot: AninzBootstrap, fallbackEpisode: Int, lang: String): String {
        val episode = if (boot.episode > 0) boot.episode else fallbackEpisode
        val query = "selection=${enc(boot.selection)}&provider=$OWN_SESSION&ep=$episode&channel=$lang&telemetry=0"
        val body = get("$ORIGIN/api/anime/settlar/session?$query", siteHeaders())
        if (aninzBlocked(body.code, body.text)) error(BLOCKED)
        if (body.code !in 200..299) error(BLOCKED)
        return aninzEmbedToken(body.text) ?: error(MISSING)
    }

    private fun openPlaylist(token: String, skip: SkipTimes, dub: Boolean): PlayableSource {
        val session = get(
            "$EMBED_ORIGIN/api/embed/session?t=${enc(token)}",
            embedHeaders(),
        )
        if (aninzBlocked(session.code, session.text)) error(BLOCKED)
        if (session.code !in 200..299) error(BLOCKED)
        val pending = aninzPending(session.text) ?: error(MISSING)
        val playlist = get(pending.url, mediaHeaders())
        if (aninzBlocked(playlist.code, playlist.text)) error(BLOCKED)
        if (playlist.code !in 200..299) error(BLOCKED)
        return aninzPlayable(pending, playlist.text, skip, dub, USER_AGENT) ?: error(MISSING)
    }

    private fun get(url: String, headers: Map<String, String>): HttpText {
        val builder = Request.Builder().url(url).get()
        headers.forEach { (name, value) -> builder.header(name, value) }
        val response = runCatching { http.newCall(builder.build()).execute() }
            .getOrElse { error(BLOCKED) }
        response.use {
            val text = it.body?.string().orEmpty()
            return HttpText(it.code, text)
        }
    }

    private fun siteHeaders(): Map<String, String> = mapOf(
        "Accept" to "application/json",
        "Referer" to "$ORIGIN/",
        "Origin" to ORIGIN,
        "User-Agent" to USER_AGENT,
    )

    private fun embedHeaders(): Map<String, String> = mapOf(
        "Accept" to "application/json",
        "Referer" to "$EMBED_ORIGIN/",
        "Origin" to EMBED_ORIGIN,
        "User-Agent" to USER_AGENT,
    )

    private fun mediaHeaders(): Map<String, String> = mapOf(
        "Referer" to "$EMBED_ORIGIN/",
        "Origin" to EMBED_ORIGIN,
        "User-Agent" to USER_AGENT,
    )

    private fun enc(value: String): String =
        URLEncoder.encode(value, Charsets.UTF_8.name()).replace("+", "%20")

    private data class HttpText(val code: Int, val text: String)

    companion object {
        const val ID = "aninz"
        const val MISSING = "ani.nz does not have this episode."
        const val BLOCKED = "ani.nz could not be reached."
        const val ORIGIN = "https://ani.nz"
        const val EMBED_ORIGIN = "https://embed.settlar.io"
        const val MEDIA_HOST = "media.settlar.io"

        /**
         * Session name ani.nz uses for its own settlar server.
         * Backup embeds are a different host and are not requested.
         */
        const val OWN_SESSION = "anipm"
        const val USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    }
}

internal data class AninzShow(
    val id: String,
    val source: String,
    val title: String,
    val anilistId: Int,
)

internal data class AninzBootstrap(
    val selection: String,
    val language: String,
    val skip: SkipTimes,
    val episode: Int = 0,
    val routeId: String? = null,
)

internal data class AninzPending(
    val url: String,
    val subtitles: List<SubtitleTrack>,
)

internal fun aninzBlocked(code: Int, body: String): Boolean {
    if (code == 403 || code == 503) return true
    val probe = body.take(800).lowercase()
    return "just a moment" in probe || "cf-mitigated" in probe || "challenge-platform" in probe
}

internal fun aninzPickShow(payload: String, anilistId: Int, titleHint: String?): AninzShow? {
    val items = runCatching { JSONObject(payload) }.getOrNull()?.optJSONArray("items") ?: return null
    val shows = ArrayList<AninzShow>(items.length())
    for (i in 0 until items.length()) {
        val row = items.optJSONObject(i) ?: continue
        val id = row.opt("id")?.toString()?.trim().orEmpty()
        if (id.isEmpty() || id == "null") continue
        val source = row.optString("source").trim().ifBlank { "settlar" }
        val title = row.optString("title").trim().ifBlank { id }
        shows += AninzShow(id, source, title, aninzAnilistId(row))
    }
    if (anilistId > 0) {
        shows.firstOrNull { it.anilistId == anilistId }?.let { return it }
    }
    val want = aninzNormalizeTitle(titleHint)
    if (want.isBlank()) return null
    shows.firstOrNull { aninzNormalizeTitle(it.title) == want }?.let { return it }
    return shows.firstOrNull { show ->
        val title = aninzNormalizeTitle(show.title)
        title.isNotEmpty() && (title.contains(want) || want.contains(title))
    }
}

internal fun aninzBootstrap(payload: String, want: String): AninzBootstrap? {
    val root = runCatching { JSONObject(payload) }.getOrNull() ?: return null
    val language = root.optString("effectiveLanguage").trim().lowercase()
    if (language != want) return null
    val selection = root.optString("settlarSelection").trim()
    if (selection.isEmpty()) return null
    val episode = root.optInt("episode", 0).takeIf { it > 0 } ?: 0
    val route = root.optString("episodeRouteId").trim().ifEmpty { null }
    return AninzBootstrap(selection, language, aninzSkip(root.optJSONObject("skip")), episode, route)
}

internal fun aninzEmbedToken(payload: String): String? {
    val url = runCatching { JSONObject(payload) }.getOrNull()
        ?.optString("embedUrl")
        ?.trim()
        .orEmpty()
    if (!url.startsWith("${AniNzServer.EMBED_ORIGIN}/")) return null
    val query = url.substringAfter('?', "")
    for (part in query.split('&')) {
        if (part.substringBefore('=') != "t") continue
        val raw = part.substringAfter('=', "")
        val token = runCatching { URLDecoder.decode(raw, Charsets.UTF_8.name()) }.getOrDefault(raw)
        if (token.isNotBlank()) return token
    }
    return null
}

internal fun aninzPending(payload: String): AninzPending? {
    val root = runCatching { JSONObject(payload) }.getOrNull() ?: return null
    if (root.optString("kind") != "hls") return null
    val url = root.optString("source").trim()
    if (!aninzOwnMedia(url)) return null
    return AninzPending(url, aninzSubtitles(root))
}

/** ani.nz plays from its own settlar media host. Any other host is refused. */
internal fun aninzOwnMedia(url: String): Boolean {
    if (!url.startsWith("https://")) return false
    val host = runCatching { java.net.URI(url).host }.getOrNull() ?: return false
    return host.equals(AniNzServer.MEDIA_HOST, ignoreCase = true)
}

internal fun aninzPlayable(
    pending: AninzPending,
    playlist: String,
    skip: SkipTimes,
    dub: Boolean,
    userAgent: String,
): PlayableSource? {
    if (!playlist.trimStart().startsWith("#EXTM3U")) return null
    val mode = if (dub) "dub" else "sub"
    val fields = BuiltInSourceMeta.aninz(aninzBestVariant(playlist), mode)
    return PlayableSource(
        url = pending.url,
        headers = mapOf(
            "Referer" to "${AniNzServer.EMBED_ORIGIN}/",
            "Origin" to AniNzServer.EMBED_ORIGIN,
            "User-Agent" to userAgent,
        ),
        label = fields.quality ?: if (dub) "DUB" else "SUB",
        stripBytes = 0,
        subtitles = pending.subtitles,
        quality = fields.quality,
        audio = fields.audio,
        hls = true,
        skip = skip,
        audioLanguage = requestedAudioLanguage(mode),
    )
}

private fun aninzSubtitles(root: JSONObject): List<SubtitleTrack> {
    val rows = root.optJSONArray("subtitles") ?: return emptyList()
    val tracks = ArrayList<SubtitleTrack>()
    for (i in 0 until rows.length()) {
        val row = rows.optJSONObject(i) ?: continue
        val ass = row.optString("pick").equals("ass", ignoreCase = true)
        val url = row.optString("url").trim().ifBlank {
            if (ass) row.optString("assUrl").trim() else ""
        }
        if (!url.startsWith("https://")) continue
        val label = row.optString("label").trim().ifBlank { row.optString("srclang").trim() }
        if (label.isEmpty()) continue
        tracks += SubtitleTrack(
            url = url,
            label = label,
            language = row.optString("srclang").trim().ifBlank { null },
            mimeType = if (ass && row.optString("url").isBlank()) "text/x-ssa" else "text/vtt",
        )
    }
    return tracks
}

private fun aninzSkip(skip: JSONObject?): SkipTimes {
    if (skip == null) return SkipTimes()
    return SkipTimes(
        intro = aninzInterval(skip.optJSONObject("op")),
        outro = aninzInterval(skip.optJSONObject("ed")),
    )
}

private fun aninzInterval(node: JSONObject?): SkipInterval? {
    if (node == null) return null
    val start = node.optDouble("start", Double.NaN)
    val end = node.optDouble("end", Double.NaN)
    if (!start.isFinite() || !end.isFinite() || start < 0.0 || end <= start) return null
    return SkipInterval(start, end)
}

private fun aninzAnilistId(row: JSONObject): Int {
    val raw = if (row.has("anilistId") && !row.isNull("anilistId")) row.opt("anilistId") else return 0
    return raw.toString().trim().toIntOrNull() ?: 0
}

private fun aninzNormalizeTitle(raw: String?): String {
    val cleaned = FlixCrypto.cleanTitle(raw)
    if (cleaned.isBlank()) return ""
    return cleaned.lowercase().replace(Regex("[^a-z0-9]+"), " ").trim()
}

internal fun aninzBestVariant(playlist: String): String {
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
