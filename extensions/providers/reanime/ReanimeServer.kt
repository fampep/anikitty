// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder
import java.util.Base64
import java.util.concurrent.TimeUnit

/**
 * On-device reanime.cz resolve.
 *
 * A title is a slug plus a short id (`black-clover-season-2-pj578y`). Search
 * is by title. The AniList id is confirmed on the detail page, because search
 * sometimes reports 0. Episode servers come from `/api/flix/{anilist}/{ep}`
 * and are filtered to sub or dub. The embed's stream URL is decrypted on the
 * phone. Media3 then unwraps the playlist and the disguised segments.
 */
class ReanimeServer(
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
        name = "reanime",
        description = "On-device reanime.cz resolve. Playback stays on this phone.",
        iconUrl = "https://www.google.com/s2/favicons?domain=reanime.cz&sz=128",
        siteUrl = "https://reanime.cz",
    )

    @Volatile private var origin: String = ORIGINS.first()
    @Volatile private var segmentMask: ByteArray = FlixCrypto.fallbackSegmentMask

    override suspend fun resolve(
        anilistId: Int,
        episode: Int,
        audio: String,
        titleHint: String?,
    ): List<PlayableSource> = withContext(Dispatchers.IO) {
        require(anilistId > 0) { "anilistId required" }
        require(episode > 0) { "episode required" }
        val mode = if (audio.equals("dub", ignoreCase = true)) "dub" else "sub"
        val show = findShow(anilistId, titleHint)
        val servers = flixServers(show, episode, mode)
        if (servers.isEmpty()) error(MISSING)
        var lastError: String = MISSING
        val out = ArrayList<PlayableSource>()
        for (link in servers) {
            val opened = runCatching { openEmbed(link.url, mode) }.getOrElse { err ->
                lastError = err.message?.takeIf { it.isNotBlank() } ?: lastError
                null
            } ?: continue
            out += opened
            if (out.size >= 2) break
        }
        if (out.isEmpty()) error(lastError)
        out
    }

    private fun findShow(anilistId: Int, titleHint: String?): Show {
        cache?.getShow(ID, anilistId)?.let { cached ->
            val slug = cached.siteId
            if (slug.isNotBlank()) {
                val detail = runCatching { anime(slug) }.getOrNull()
                if (detail != null && detail.anilistId == anilistId) return detail
            }
        }
        val title = FlixCrypto.cleanTitle(titleHint)
        if (title.isBlank()) error("reanime needs a title to find this show.")
        val query = enc(title)
        val payload = getJson("/api/v1/search?q=$query&limit=20")
        val results = payload.optJSONArray("results") ?: JSONArray()
        for (i in 0 until results.length()) {
            val item = results.optJSONObject(i) ?: continue
            val slug = item.optString("anime_id").ifBlank { item.optString("id") }
            if (slug.isBlank()) continue
            val listed = item.optInt("anilist_id")
            val hinted = listed == anilistId || reanimeCoverListsAnilist(coverText(item), anilistId)
            if (!hinted) continue
            // A search row can name the right id while the detail says 0, or the
            // other way around. Only the detail page is allowed to confirm it.
            val detail = runCatching { anime(slug) }.getOrNull() ?: continue
            if (detail.anilistId != anilistId) continue
            remember(anilistId, detail)
            return detail
        }
        // The right season is often a later result whose search row hides the id.
        for (i in 0 until results.length().coerceAtMost(8)) {
            val item = results.optJSONObject(i) ?: continue
            val slug = item.optString("anime_id")
            if (slug.isBlank()) continue
            val detail = runCatching { anime(slug) }.getOrNull() ?: continue
            if (detail.anilistId == anilistId) {
                remember(anilistId, detail)
                return detail
            }
        }
        error(MISSING)
    }

    private fun anime(slug: String): Show {
        val body = getJson("/api/v1/anime/${enc(slug)}")
        val id = body.optInt("anilist_id")
        val mal = body.optInt("mal_id")
        val resolved = body.optString("anime_id").ifBlank { slug }
        return Show(slug = resolved, anilistId = id, malId = mal)
    }

    private fun flixServers(show: Show, episode: Int, mode: String): List<FlixCrypto.ServerLink> {
        if (show.anilistId <= 0) error(MISSING)
        val mal = if (show.malId > 0) "?mal=${show.malId}" else ""
        val body = getJson("/api/flix/${show.anilistId}/$episode$mal")
        val rows = body.optJSONArray("servers") ?: JSONArray()
        val links = ArrayList<FlixCrypto.ServerLink>(rows.length())
        for (i in 0 until rows.length()) {
            val row = rows.optJSONObject(i) ?: continue
            val url = row.optString("dataLink")
            if (!url.startsWith("http")) continue
            links += FlixCrypto.ServerLink(
                name = row.optString("serverName"),
                url = url,
                kind = row.optString("dataType"),
                hardsub = row.optBoolean("hardsub"),
            )
        }
        return FlixCrypto.pickServers(links, mode)
    }

    private fun openEmbed(pageUrl: String, mode: String): PlayableSource {
        val page = get(pageUrl, referer = "$FLIX_ORIGIN/", accept = "text/html")
        if (page.challenged) error(BLOCKED)
        if (page.code == 404) error(MISSING)
        if (page.code !in 200..299) error(reanimeHttpFailure(page.code, page.body))
        val raw = FlixCrypto.extractEmbedData(page.body) ?: error(reanimeHttpFailure(page.code, page.body))
        val data = JSONObject(FlixCrypto.jsObjectToJson(raw))
        val seed = data.optString("obfuscation_seed")
        val wasm = Base64.getDecoder().decode(data.optString("w_payload"))
        if (seed.length < 8 || wasm.isEmpty()) error("reanime embed was missing its playback data.")
        val names = FlixCrypto.fieldNames(seed)
        val token = data.optString(names.tokenField)
        val frag2 = decode(data.optString(names.keyFrag2Field))
        val node = data.getJSONObject("obfuscated_crypto_data")
            .getJSONObject(names.container)
            .getJSONArray(names.array)
            .getJSONObject(0)
            .getJSONObject(names.objectName)
        val frag1 = decode(node.getString(names.keyField))
        val iv = decode(node.getString(names.ivField))
        if (token.isBlank()) error("reanime embed was missing its playback token.")
        val tokenBody = get("$FLIX_ORIGIN/api/m3u8/$token", referer = pageUrl, accept = "application/json")
        if (tokenBody.challenged) error(BLOCKED)
        if (tokenBody.code !in 200..299) error(reanimeHttpFailure(tokenBody.code, tokenBody.body))
        val tokenJson = JSONObject(tokenBody.body)
        val vidKey = FlixCrypto.sha256Hex(token + "vid").take(10)
        val keyKey = FlixCrypto.sha256Hex(token + "key").take(10)
        val url = FlixCrypto.decryptStreamUrl(
            wasm = wasm,
            frag1 = frag1,
            frag2 = frag2,
            keyFrag = decode(tokenJson.getString(keyKey)),
            seed = seed,
            iv = iv,
            ciphertext = decode(tokenJson.getString(vidKey)),
        )
        if (!url.startsWith("http")) error("reanime did not return a stream.")
        val key = FlixCrypto.playlistKey(wasm)
        val mask = cachedMask(page.body)
        val playlist = runCatching { fetchPlaylist(url, key) }.getOrElse { error(BLOCKED) }
        if (!playlist.startsWith("#EXTM3U")) error(BLOCKED)
        val tuned = FlixCrypto.preferAudio(playlist, mode == "dub")
        val variant = tuned.lineSequence().firstOrNull { it.startsWith("#EXT-X-STREAM-INF") }.orEmpty()
        val fields = BuiltInSourceMeta.reanime(variant, mode)
        return PlayableSource(
            url = url,
            headers = playbackHeaders(),
            label = fields.quality ?: "reanime",
            stripBytes = 0,
            subtitles = subtitles(data),
            quality = fields.quality,
            audio = fields.audio,
            flix = FlixUnwrap(
                playlistKey = Base64.getEncoder().encodeToString(key),
                segmentMask = Base64.getEncoder().encodeToString(mask),
                englishAudio = mode == "dub",
            ),
            thumbnails = thumbnailTrackFromJson(data, playbackHeaders()),
            skip = site.anikitty.app.data.skip.skipTimesFromJson(data),
        )
    }

    private fun fetchPlaylist(url: String, key: ByteArray): String {
        val response = get(url, referer = "$FLIX_ORIGIN/", accept = "*/*")
        if (response.challenged || response.code !in 200..299) error(BLOCKED)
        return FlixCrypto.decryptPlaylist(response.body, key)
    }

    private fun subtitles(data: JSONObject): List<SubtitleTrack> {
        val rows = data.optJSONArray("subtitles") ?: return emptyList()
        val out = ArrayList<SubtitleTrack>()
        for (i in 0 until rows.length()) {
            val row = rows.optJSONObject(i) ?: continue
            val url = row.optString("url")
            if (!url.startsWith("http")) continue
            val label = row.optString("language").ifBlank { "Subtitles" }
            out += SubtitleTrack(
                url = url,
                label = label,
                language = languageCode(label),
                mimeType = "text/vtt",
            )
            if (out.size >= 12) break
        }
        return out.sortedBy { if (it.language == "en") 0 else 1 }
    }

    private fun cachedMask(html: String): ByteArray {
        FlixCrypto.parseSegmentMask(html)?.let {
            segmentMask = it
            return it
        }
        if (segmentMask.contentEquals(FlixCrypto.fallbackSegmentMask)) {
            val script = runCatching {
                get("$FLIX_ORIGIN/artplayer-new/hls.js", referer = "$FLIX_ORIGIN/", accept = "*/*")
            }.getOrNull()
            if (script != null && script.code in 200..299) {
                FlixCrypto.parseSegmentMask(script.body)?.let { segmentMask = it }
            }
        }
        return segmentMask
    }

    private fun getJson(path: String): JSONObject {
        var last = Reply(0, "", true)
        for (base in orderedOrigins()) {
            val reply = get(base + path, referer = "$base/", accept = "application/json")
            if (reply.code in 200..299 && reply.body.trimStart().startsWith("{")) {
                origin = base
                return JSONObject(reply.body)
            }
            last = reply
        }
        if (last.challenged) error(BLOCKED)
        if (last.code == 404) error(MISSING)
        error(reanimeHttpFailure(last.code, last.body))
    }

    private fun orderedOrigins(): List<String> {
        val rest = ORIGINS.filterNot { it == origin }
        return listOf(origin) + rest
    }

    private fun get(url: String, referer: String, accept: String): Reply {
        val request = Request.Builder()
            .url(url)
            .header("User-Agent", UA)
            .header("Accept", accept)
            .header("Referer", referer)
            .header("Origin", originOf(referer))
            .build()
        return runCatching {
            http.newCall(request).execute().use { response ->
                val body = response.body?.string().orEmpty()
                Reply(response.code, body, challenged(response.code, body))
            }
        }.getOrElse { Reply(0, "", false) }
    }

    private fun remember(anilistId: Int, show: Show) {
        cache?.putShow(ID, anilistId, show.slug, "$origin/watch/${show.slug}")
    }

    private fun coverText(item: JSONObject): String {
        val cover = item.opt("cover_image") ?: return ""
        return when (cover) {
            is String -> cover
            is JSONObject -> cover.optString("extraLarge") + cover.optString("large")
            else -> cover.toString()
        }
    }

    private fun decode(text: String): ByteArray = Base64.getDecoder().decode(text)

    @Suppress("DEPRECATION")
    private fun enc(value: String): String = URLEncoder.encode(value, "UTF-8")

    private data class Show(val slug: String, val anilistId: Int, val malId: Int)
    private data class Reply(val code: Int, val body: String, val challenged: Boolean)

    companion object {
        const val ID = "reanime"
        const val BLOCKED = "This source is blocked by the site. Try another source."
        const val MISSING = "reanime does not have this episode."
        const val UA =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        val ORIGINS = listOf("https://reanime.cz", "https://reanime.wtf")
        private const val FLIX_ORIGIN = "https://flixcloud.cc"

        fun playbackHeaders(): Map<String, String> = linkedMapOf(
            "User-Agent" to UA,
            "Referer" to "$FLIX_ORIGIN/",
            "Origin" to FLIX_ORIGIN,
            "Accept" to "*/*",
        )
    }
}

/**
 * AniList cover URLs look like `bx195604-....jpg`. A shorter id must not match
 * a longer one (`bx12` inside `bx12345`).
 */
internal fun reanimeCoverListsAnilist(cover: String, anilistId: Int): Boolean {
    if (anilistId <= 0 || cover.isEmpty()) return false
    val needle = "bx$anilistId"
    var from = 0
    while (from < cover.length) {
        val at = cover.indexOf(needle, from)
        if (at < 0) return false
        val next = at + needle.length
        if (next >= cover.length || !cover[next].isDigit()) return true
        from = next
    }
    return false
}

internal fun reanimeHttpFailure(code: Int, body: String): String {
    if (challenged(code, body)) return ReanimeServer.BLOCKED
    if (code == 404) return ReanimeServer.MISSING
    if (code == 0) return "reanime could not be reached."
    return "reanime could not load this episode (HTTP $code)."
}

private fun challenged(code: Int, body: String): Boolean {
    val trimmed = body.trimStart()
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) return false
    if (code == 403 || code == 503) return true
    val head = trimmed.take(800).lowercase()
    return "just a moment" in head || "cf-browser-verification" in head
}

private fun languageCode(label: String): String? = when {
    label.contains("english", ignoreCase = true) -> "en"
    label.contains("japanese", ignoreCase = true) -> "ja"
    label.contains("spanish", ignoreCase = true) -> "es"
    label.contains("portuguese", ignoreCase = true) -> "pt"
    label.contains("french", ignoreCase = true) -> "fr"
    label.contains("german", ignoreCase = true) -> "de"
    label.contains("arabic", ignoreCase = true) -> "ar"
    label.contains("chinese", ignoreCase = true) -> "zh"
    label.contains("korean", ignoreCase = true) -> "ko"
    label.contains("thai", ignoreCase = true) -> "th"
    else -> null
}

private fun originOf(url: String): String {
    val bare = url.substringBefore('?')
    val scheme = bare.substringBefore("://", "")
    if (scheme.isEmpty()) return bare
    val host = bare.substringAfter("://").substringBefore('/')
    return "$scheme://$host"
}
