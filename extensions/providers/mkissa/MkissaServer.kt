// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * On-device mkissa.to resolve.
 *
 * Search is a public GraphQL shows query and is matched on the AniList id.
 * Episode sources sit behind the site's aa-crypto lane. The phone seals the
 * episode query, opens the reply, and keeps a direct MP4 or HLS file. Iframe
 * embeds are skipped. Playback stays on this phone and sends the site Referer
 * the file host requires. The episode API states a resolution when it has one.
 * It does not ship a seek-thumbnail track or a subtitle list.
 */
class MkissaServer(
    private val cache: ResolveCache? = null,
    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(14, TimeUnit.SECONDS)
        .callTimeout(22, TimeUnit.SECONDS)
        .followRedirects(true)
        .retryOnConnectionFailure(true)
        .build(),
    private val now: () -> Long = System::currentTimeMillis,
) : StreamResolver {
    override val server = StreamServer(
        id = ID,
        name = "mkissa",
        description = "On-device mkissa.to resolve. Direct files play on this phone. Iframe hosts are skipped.",
        iconUrl = "https://www.google.com/s2/favicons?domain=mkissa.to&sz=128",
        siteUrl = ORIGIN,
    )

    @Volatile private var session: Session? = null

    override suspend fun resolve(
        anilistId: Int,
        episode: Int,
        audio: String,
        titleHint: String?,
    ): List<PlayableSource> = withContext(Dispatchers.IO) {
        require(anilistId > 0) { "anilistId required" }
        require(episode > 0) { "episode required" }
        val mode = audioMode(audio)
        val show = findShow(anilistId, episode, mode, titleHint)
        val opened = openEpisode(show, mode)
        val source = mkissaDirectSource(opened, mode) ?: error(MISSING)
        listOf(source)
    }

    private fun findShow(anilistId: Int, episode: Int, mode: String, titleHint: String?): ShowHit {
        cache?.getShow(ID, anilistId)?.let { cached ->
            if (cached.siteId.isNotBlank()) {
                return ShowHit(cached.siteId, episode.toString())
            }
        }
        val title = titleHint?.trim().orEmpty()
        if (title.isBlank()) error("mkissa needs a title to find this show.")
        val variables = JSONObject()
            .put("search", JSONObject().put("query", title).put("sortBy", "Name_ASC").put("sortDirection", "ASC"))
            .put("limit", 20)
        val body = post(API, graphql(SEARCH_QUERY, variables))
        if (body.code !in 200..299) error(BLOCKED)
        val hit = mkissaPickShow(body.text, anilistId, episode, mode) ?: error(MISSING)
        cache?.putShow(ID, anilistId, hit.id, hit.id)
        return hit
    }

    private fun openEpisode(show: ShowHit, mode: String): JSONObject {
        var opened = requestEpisode(show, mode, fresh = false)
        if (opened == null) {
            session = null
            opened = requestEpisode(show, mode, fresh = true)
        }
        return opened ?: error(MISSING)
    }

    private fun requestEpisode(show: ShowHit, mode: String, fresh: Boolean): JSONObject? {
        val lane = session(fresh)
        val variables = JSONObject()
            .put("showId", show.id)
            .put("translationType", mode)
            .put("episodeString", show.episodeString)
        val hash = MkissaCrypto.sha256Hex(EPISODE_QUERY)
        val stamp = MkissaCrypto.queryTimestamp(now())
        val token = MkissaCrypto.seal(lane.key, hash, lane.epoch, stamp)
        val extensions = JSONObject()
            .put("persistedQuery", JSONObject().put("version", 1).put("sha256Hash", hash))
            .put("k", MkissaCrypto.LANE)
            .put("aaReq", token)
        val body = post(API, graphql(EPISODE_QUERY, variables, extensions))
        if (body.code !in 200..299) error(BLOCKED)
        return unwrapEpisode(body.text, lane.key)
    }

    private fun session(force: Boolean): Session {
        val clock = now()
        if (!force) {
            session?.takeIf { clock < it.untilMs - 60_000L }?.let { return it }
        }
        val epoch = MkissaCrypto.epoch(clock)
        val opened = bootstrap(epoch) ?: bootstrap(epoch - 1) ?: error(BLOCKED)
        session = opened
        return opened
    }

    private fun bootstrap(epoch: Long): Session? {
        if (epoch < 0) return null
        val token = MkissaCrypto.bootToken(epoch, HOST, GROUP)
        val url = "$API_ORIGIN/client-crypto/v1/bootstrap?buildId=${MkissaCrypto.BUILD_ID}&k=${MkissaCrypto.LANE}"
        val request = Request.Builder()
            .url(url)
            .header("Accept", "application/json")
            .header("Origin", ORIGIN)
            .header("Referer", "$ORIGIN/")
            .header("User-Agent", USER_AGENT)
            .header("x-build-id", MkissaCrypto.BUILD_ID)
            .header("x-aa-boot", token)
            .get()
            .build()
        val response = runCatching { http.newCall(request).execute() }.getOrElse { error(BLOCKED) }
        response.use { httpResponse ->
            val text = httpResponse.body?.string().orEmpty()
            if (httpResponse.code == 403 && text.contains("invalid_boot_token")) return null
            if (httpResponse.code !in 200..299) error(BLOCKED)
            val json = runCatching { JSONObject(text) }.getOrElse { error(BLOCKED) }
            val partB = json.optString("partB")
            if (partB.isBlank() || json.optString("k") != MkissaCrypto.LANE) error(BLOCKED)
            val until = json.optLong("switchAt", now() + MkissaCrypto.EPOCH_MS)
            return Session(
                epoch = json.optLong("epoch", epoch),
                key = MkissaCrypto.aesKey(partB),
                untilMs = until,
            )
        }
    }

    private fun post(url: String, json: String): HttpText {
        val request = Request.Builder()
            .url(url)
            .header("Accept", "application/json")
            .header("Origin", ORIGIN)
            .header("Referer", "$ORIGIN/")
            .header("User-Agent", USER_AGENT)
            .header("x-build-id", MkissaCrypto.BUILD_ID)
            .post(json.toRequestBody(JSON_MEDIA))
            .build()
        val response = runCatching { http.newCall(request).execute() }.getOrElse { error(BLOCKED) }
        response.use { return HttpText(it.code, it.body?.string().orEmpty()) }
    }

    private data class Session(val epoch: Long, val key: ByteArray, val untilMs: Long)
    private data class HttpText(val code: Int, val text: String)

    companion object {
        const val ID = "mkissa"
        const val MISSING = "mkissa does not have this episode."
        const val BLOCKED = "mkissa could not be reached."
        const val ORIGIN = "https://mkissa.to"
        private const val HOST = "mkissa.to"
        private const val GROUP = "mkissa"
        private const val API_ORIGIN = "https://api.mkissa.net"
        private const val API = "$API_ORIGIN/api"
        private val JSON_MEDIA = "application/json".toMediaType()
        private const val USER_AGENT =
            "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"

        // The show selection is required. Without countryOfOrigin the episode
        // resolver on the site throws before it returns sources.
        internal const val EPISODE_QUERY =
            "query(\$showId:String!,\$translationType:VaildTranslationTypeEnumType!,\$episodeString:String!){" +
                "episode(showId:\$showId,translationType:\$translationType,episodeString:\$episodeString){" +
                "episodeString sourceUrls show{countryOfOrigin} episodeInfo{vidInforssub vidInforsdub vidInforsraw}" +
                "}}"

        private const val SEARCH_QUERY =
            "query(\$search:SearchInput,\$limit:Int){shows(search:\$search,limit:\$limit){" +
                "edges{_id aniListId availableEpisodesDetail}}}"

        fun playbackHeaders(): Map<String, String> = mapOf(
            "Referer" to "$ORIGIN/",
            "Origin" to ORIGIN,
            "User-Agent" to USER_AGENT,
        )
    }
}

internal data class ShowHit(val id: String, val episodeString: String)

internal fun mkissaPickShow(payload: String, anilistId: Int, episode: Int, mode: String): ShowHit? {
    val root = runCatching { JSONObject(payload) }.getOrNull() ?: return null
    val edges = root.optJSONObject("data")
        ?.optJSONObject("shows")
        ?.optJSONArray("edges")
        ?: return null
    val want = anilistId.toString()
    var fallback: ShowHit? = null
    for (i in 0 until edges.length()) {
        val edge = edges.optJSONObject(i) ?: continue
        if (edge.opt("aniListId")?.toString() != want) continue
        val id = edge.optString("_id")
        if (id.isBlank()) continue
        val listed = episodeStringFor(edge.optJSONObject("availableEpisodesDetail"), mode, episode)
        if (listed != null) return ShowHit(id, listed)
        if (fallback == null) fallback = ShowHit(id, episode.toString())
    }
    return fallback
}

internal fun unwrapEpisode(payload: String, key: ByteArray): JSONObject? {
    val root = runCatching { JSONObject(payload) }.getOrNull() ?: return null
    if (root.optJSONArray("errors") != null && root.optJSONObject("data")?.has("tobeparsed") != true) {
        return null
    }
    val data = root.optJSONObject("data") ?: return null
    val packed = data.optString("tobeparsed")
    val plain = if (packed.isNotBlank()) {
        runCatching { MkissaCrypto.open(key, packed) }.getOrNull() ?: return null
    } else {
        data.toString()
    }
    return runCatching { JSONObject(plain).optJSONObject("episode") }.getOrNull()
}

internal fun mkissaDirectSource(episode: JSONObject, mode: String): PlayableSource? {
    val rows = episode.optJSONArray("sourceUrls") ?: return null
    var best: JSONObject? = null
    var bestPriority = Double.NEGATIVE_INFINITY
    for (i in 0 until rows.length()) {
        val row = rows.optJSONObject(i) ?: continue
        if (!mkissaDirectFile(row)) continue
        val priority = row.optDouble("priority", 0.0)
        if (best == null || priority > bestPriority) {
            best = row
            bestPriority = priority
        }
    }
    val row = best ?: return null
    val fields = BuiltInSourceMeta.mkissa(vidHeight(episode, mode), mode)
    return PlayableSource(
        url = row.optString("sourceUrl"),
        headers = MkissaServer.playbackHeaders(),
        label = fields.quality ?: "mkissa",
        stripBytes = 0,
        quality = fields.quality,
        audio = fields.audio,
        skip = site.anikitty.app.data.skip.skipTimesFromJson(row).takeUnless { it.isEmpty }
            ?: site.anikitty.app.data.skip.skipTimesFromJson(episode),
    )
}

internal fun mkissaDirectFile(row: JSONObject): Boolean {
    val url = row.optString("sourceUrl")
    if (!url.startsWith("https://")) return false
    if (row.optString("type").equals("iframe", ignoreCase = true)) return false
    val ext = row.optString("fileExtenstion").lowercase()
    val fallback = row.optString("fallBack").lowercase()
    val namedFile = ext == "mp4" || ext == "m3u8" || ext == "m4v" || fallback == "mp4" || fallback == "m3u8"
    val urlFile = url.contains(".m3u8", ignoreCase = true) || url.contains(".mp4", ignoreCase = true)
    val player = row.optString("type").equals("player", ignoreCase = true)
    return (player && (namedFile || urlFile)) || (!player && urlFile)
}

private fun episodeStringFor(detail: JSONObject?, mode: String, episode: Int): String? {
    val rows = detail?.optJSONArray(mode) ?: return null
    val want = episode.toString()
    for (i in 0 until rows.length()) {
        if (rows.optString(i) == want) return want
    }
    return null
}

private fun vidHeight(episode: JSONObject, mode: String): Int? {
    val info = episode.optJSONObject("episodeInfo") ?: return null
    val key = when (mode) {
        "dub" -> "vidInforsdub"
        "raw" -> "vidInforsraw"
        else -> "vidInforssub"
    }
    val height = info.optJSONObject(key)?.optInt("vidResolution", 0) ?: 0
    return height.takeIf { it > 0 }
}

private fun audioMode(audio: String): String = when {
    audio.equals("dub", ignoreCase = true) -> "dub"
    audio.equals("raw", ignoreCase = true) -> "raw"
    else -> "sub"
}

private fun graphql(query: String, variables: JSONObject, extensions: JSONObject? = null): String {
    val body = JSONObject().put("query", query).put("variables", variables)
    if (extensions != null) body.put("extensions", extensions)
    return body.toString()
}
