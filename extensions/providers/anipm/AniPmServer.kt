// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.util.LinkedHashMap
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import java.util.regex.Pattern

/**
 * On-device ani.pm → Settlar resolve (same shape as Anikoto/Gotaku).
 *
 * Flow:
 * 1. Map AniList id → ani.pm site id (partner catalogue)
 * 2. `playback-bootstrap/settlar/{siteId}` → `settlarSelection`
 * 3. `settlar/session` → Settlar embed token
 * 4. `embed.settlar.io/api/embed/session` → HLS master + captions
 *
 * Media3 pulls bytes from `media.settlar.io`; no WebView.
 */
class AniPmServer(
    private val cache: ResolveCache? = null,
    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(18, TimeUnit.SECONDS)
        .callTimeout(28, TimeUnit.SECONDS)
        .followRedirects(true)
        .retryOnConnectionFailure(true)
        .cookieJar(DomainCookieJar())
        .build(),
) : StreamResolver {
    override val server = StreamServer(
        id = ID,
        name = "Ani.pm",
        description = "On-device ani.pm → Settlar HLS resolve. Playback stays on this phone.",
        iconUrl = SITE_ICON_URL,
        siteUrl = SITE_URL,
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

        warmUp()
        val siteId = mapSiteId(anilistId, titleHint)
        val boot = fetchBootstrap(siteId, episode, mode)
        val selection = boot.optString("settlarSelection").trim()
        require(selection.isNotEmpty()) { "ani.pm missing settlarSelection" }
        val effective = boot.optString("effectiveLanguage", mode).ifBlank { mode }
        val avail = boot.optJSONObject("availability")
        if (mode == "dub" && avail?.optBoolean("dub", true) == false) {
            error("Dub unavailable for episode $episode")
        }
        if (mode != "dub" && avail?.optBoolean("sub", true) == false) {
            error("Sub unavailable for episode $episode")
        }

        val channel = if (effective.equals("dub", ignoreCase = true)) "dub" else "sub"
        val primary = runCatching { openSettlar(selection, episode, channel) }
        var opened = primary.getOrNull()
            ?: openBackup(boot, episode, channel)
            ?: throw primary.exceptionOrNull() ?: IllegalStateException(BLOCKED)
        // Settlar HLS keys live at …/~key or …/~key/{height} and 403 without this proof.
        var headers = streamHeaders(opened.session.optString("keyProof").trim())
        if (!probeMaster(opened.master, headers)) {
            val backup = openBackup(boot, episode, channel)
            val backupHeaders = backup?.let { streamHeaders(it.session.optString("keyProof").trim()) }
            if (backup != null && backup.master != opened.master &&
                backupHeaders != null && probeMaster(backup.master, backupHeaders)
            ) {
                opened = backup
                headers = backupHeaders
            } else {
                error(BLOCKED)
            }
        }
        val session = opened.session
        val master = opened.master
        if (opened.embedUrl.startsWith("http")) {
            runCatching { httpText(opened.embedUrl, PLAY_REFERER, accept = "text/html", origin = null) }
        }

        val subs = parseSubtitles(session.optJSONArray("subtitles"))
        val masterText = runCatching { httpText(master, headers = headers) }.getOrNull().orEmpty()
        val variants = parseVariants(masterText, master)
        val out = ArrayList<PlayableSource>()
        val autoFields = site.anikitty.app.data.servers.BuiltInSourceMeta.anipm("", channel)
        // Prefer the master so Media3 can ABR; variants stay available in the quality sheet.
        out += PlayableSource(
            url = master,
            headers = headers,
            label = "Auto · ${channel.uppercase()}",
            stripBytes = 0,
            subtitles = subs,
            audio = autoFields.audio,
        )
        for (variant in variants.sortedByDescending { it.height }) {
            if (variant.url == master) continue
            val fields = site.anikitty.app.data.servers.BuiltInSourceMeta.anipm(variant.inf, channel)
            out += PlayableSource(
                url = variant.url,
                headers = headers,
                label = fields.quality ?: "Ani.pm",
                stripBytes = 0,
                quality = fields.quality,
                audio = fields.audio,
            )
        }
        out
    }

    private data class OpenedStream(
        val session: JSONObject,
        val master: String,
        val embedUrl: String,
    )

    private fun openSettlar(selection: String, episode: Int, channel: String): OpenedStream {
        val embedUrl = fetchSettlarEmbedUrl(selection, episode, channel)
        val token = embedUrl.toHttpUrl().queryParameter("t")
            ?: error("Settlar embed missing token")
        val session = fetchEmbedSession(token, embedUrl)
        val master = session.optString("source").trim()
        require(master.startsWith("http")) { "Settlar HLS missing" }
        val kind = session.optString("kind", "hls")
        require(kind.equals("hls", ignoreCase = true) || master.contains("m3u8") || master.contains("/object/")) {
            "Unexpected Settlar kind: $kind"
        }
        return OpenedStream(session, master, embedUrl)
    }

    /** The site's second embed, used when the primary Settlar host refuses the phone. */
    private fun openBackup(boot: JSONObject, episode: Int, channel: String): OpenedStream? {
        val backup = boot.optJSONObject("backupEmbed") ?: return null
        if (backup.has("available") && !backup.optBoolean("available", true)) return null
        val direct = backup.optString("source").trim()
        if (direct.startsWith("http")) {
            val session = JSONObject()
                .put("source", direct)
                .put("kind", backup.optString("kind", "hls"))
                .put("keyProof", backup.optString("keyProof"))
            return OpenedStream(session, direct, backup.optString("embedUrl"))
        }
        val selection = backup.optString("selection").trim()
        if (selection.isEmpty()) return null
        return runCatching { openSettlar(selection, episode, channel) }.getOrNull()
    }

    private fun mapSiteId(anilistId: Int, titleHint: String?): String {
        cache?.getShow(ID, anilistId)?.siteId?.let { return it }
        val fromPartner = runCatching { siteIdFromPartner(anilistId) }.getOrNull()
        if (!fromPartner.isNullOrBlank()) {
            cache?.putShow(ID, anilistId, fromPartner, "$SITE_URL/anime/$fromPartner")
            return fromPartner
        }
        val q = titleHint?.replace(Regex("""(?i)\s*\|\|\s*mal:\d+\b"""), "")
            ?.replace(Regex("""(?i)\bmal:\d+\b"""), "")
            ?.trim().orEmpty()
        if (q.length >= 2) {
            val fromSearch = runCatching { siteIdFromTitleSearch(q, anilistId) }.getOrNull()
            if (!fromSearch.isNullOrBlank()) {
                cache?.putShow(ID, anilistId, fromSearch, "$SITE_URL/anime/$fromSearch")
                return fromSearch
            }
        }
        error("ani.pm title not found for anilist=$anilistId")
    }

    private fun siteIdFromPartner(anilistId: Int): String {
        val body = httpText(
            "$SITE_URL/api/partner/v1/series/$anilistId",
            SITE_URL,
            accept = "application/json",
        )
        if (body.trimStart().startsWith("<")) error("ani.pm partner challenged")
        val data = JSONObject(body).optJSONObject("data") ?: error("ani.pm partner empty")
        val url = data.optString("url").ifBlank {
            data.optString("embed")
        }
        return extractSiteId(url) ?: error("ani.pm site id missing in partner url")
    }

    private fun siteIdFromTitleSearch(query: String, anilistId: Int): String? {
        val enc = URLEncoder.encode(query.take(80), StandardCharsets.UTF_8.name())
        val body = httpText(
            "$SITE_URL/api/partner/v1/titles?q=$enc&limit=8",
            SITE_URL,
            accept = "application/json",
        )
        if (body.trimStart().startsWith("<")) return null
        val arr = JSONObject(body).optJSONArray("data") ?: return null
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            if (o.optInt("anilistId", -1) != anilistId) continue
            return extractSiteId(o.optString("url"))
        }
        return null
    }

    private fun fetchBootstrap(siteId: String, episode: Int, lang: String): JSONObject {
        val url =
            "$SITE_URL/api/anime/playback-bootstrap/settlar/$siteId?ep=$episode&lang=$lang&backup=1"
        val body = httpText(url, "$SITE_URL/", accept = "application/json")
        if (body.trimStart().startsWith("<")) error("ani.pm bootstrap challenged (Cloudflare)")
        val json = JSONObject(body)
        if (json.has("error")) {
            error(json.optJSONObject("error")?.optString("message") ?: "ani.pm bootstrap failed")
        }
        return json
    }

    private fun fetchSettlarEmbedUrl(selection: String, episode: Int, channel: String): String {
        val qs = buildString {
            append("selection=").append(enc(selection))
            append("&provider=anipm")
            append("&ep=").append(episode)
            append("&channel=").append(enc(channel))
            append("&telemetry=0")
        }
        val body = httpText(
            "$SITE_URL/api/anime/settlar/session?$qs",
            "$SITE_URL/",
            accept = "application/json",
        )
        if (body.trimStart().startsWith("<")) error("ani.pm settlar session challenged")
        val embed = JSONObject(body).optString("embedUrl").trim()
        require(embed.startsWith("http")) { "ani.pm settlar embedUrl missing" }
        return embed
    }

    private fun fetchEmbedSession(token: String, embedUrl: String): JSONObject {
        val url = "$SETTLAR_EMBED/api/embed/session?t=${enc(token)}"
        val body = httpText(
            url,
            PLAY_REFERER,
            accept = "application/json",
            origin = SITE_URL,
        )
        if (body.trimStart().startsWith("<")) error("Settlar session challenged")
        return JSONObject(body)
    }

    private fun parseSubtitles(arr: JSONArray?): List<SubtitleTrack> {
        if (arr == null || arr.length() == 0) return emptyList()
        val out = ArrayList<SubtitleTrack>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val u = o.optString("url").trim()
            if (!u.startsWith("http")) continue
            out += SubtitleTrack(
                url = u,
                label = o.optString("label", o.optString("srclang", "Subs")),
                language = o.optString("srclang").takeIf { it.isNotBlank() },
                mimeType = null,
            )
        }
        return out
    }

    private data class HlsVariant(val url: String, val inf: String, val height: Int)

    private fun parseVariants(master: String, masterUrl: String): List<HlsVariant> {
        if (master.isBlank()) return emptyList()
        val lines = master.lines()
        val out = ArrayList<HlsVariant>()
        var i = 0
        while (i < lines.size) {
            val line = lines[i].trim()
            if (line.startsWith("#EXT-X-STREAM-INF")) {
                val height = Regex("""RESOLUTION=\d+x(\d+)""").find(line)?.groupValues?.get(1)
                    ?.toIntOrNull() ?: 0
                val next = lines.getOrNull(i + 1)?.trim().orEmpty()
                if (next.isNotEmpty() && !next.startsWith("#")) {
                    val abs = absolutize(masterUrl, next)
                    if (abs.startsWith("http")) out += HlsVariant(abs, line, height)
                    i += 2
                    continue
                }
            }
            i++
        }
        return out
    }

    private fun absolutize(base: String, ref: String): String {
        if (ref.startsWith("http")) return ref
        return runCatching { base.toHttpUrl().resolve(ref)?.toString() }.getOrNull() ?: ref
    }

    private fun probeMaster(masterUrl: String, headers: Map<String, String>): Boolean {
        return runCatching {
            val body = httpText(masterUrl, headers = headers)
            body.contains("#EXTM3U")
        }.getOrDefault(false)
    }

    private fun warmUp() {
        runCatching {
            httpText(SITE_URL, SITE_URL, accept = "text/html")
        }
    }

    /**
     * Headers Media3, the cast relay, and segment fetches send.
     * Cloudflare on settlar hosts 403s an old Chrome user agent, and the key
     * URLs 403 without [HEADER_KEY_PROOF].
     */
    private fun streamHeaders(keyProof: String): Map<String, String> = playbackHeaders(keyProof)

    private fun httpText(
        url: String,
        referer: String = SITE_URL,
        accept: String = "*/*",
        origin: String? = SITE_URL,
        headers: Map<String, String>? = null,
    ): String {
        val b = Request.Builder()
            .url(url)
            .get()
        if (headers != null) {
            headers.forEach { (k, v) -> b.header(k, v) }
        } else {
            b.header("User-Agent", USER_AGENT)
            b.header("Accept", accept)
            b.header("Referer", referer)
            if (origin != null) b.header("Origin", origin)
        }
        return http.newCall(b.build()).execute().use { res ->
            val text = res.body?.string().orEmpty()
            if (!res.isSuccessful) error(aniPmHttpFailure(res.code, text))
            text
        }
    }

    private fun enc(value: String): String =
        URLEncoder.encode(value, StandardCharsets.UTF_8.name())

    /**
     * Cookie jar that respects Domain= attributes so `.settlar.io` cookies from
     * embed.settlar.io are also sent to media.settlar.io.
     */
    private class DomainCookieJar : CookieJar {
        private val store = ConcurrentHashMap<String, List<Cookie>>()

        override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
            if (cookies.isEmpty()) return
            val key = cookies.firstOrNull()?.domain?.trimStart('.') ?: url.host
            store[key] = cookies
            // Also index by request host for hosts that omit Domain=.
            store[url.host] = cookies
        }

        override fun loadForRequest(url: HttpUrl): List<Cookie> {
            val host = url.host
            val out = LinkedHashMap<String, Cookie>()
            for ((domain, cookies) in store) {
                if (!hostMatches(host, domain)) continue
                for (c in cookies) {
                    if (c.matches(url)) out[c.name] = c
                }
            }
            return out.values.toList()
        }

        private fun hostMatches(host: String, domain: String): Boolean {
            val d = domain.trimStart('.').lowercase()
            val h = host.lowercase()
            return h == d || h.endsWith(".$d")
        }
    }

    companion object {
        const val ID = "anipm"
        const val BLOCKED = "Ani.pm is blocked by the site's protection. Try another source."
        const val SITE_URL = "https://ani.pm"
        const val SETTLAR_EMBED = "https://embed.settlar.io"
        const val HEADER_KEY_PROOF = "X-Settlar-Key-Proof"
        /** Page the site itself sends as Referer when it asks Settlar for a stream. */
        const val PLAY_REFERER = "$SITE_URL/anime/"
        val SITE_ICON_URL =
            "https://www.google.com/s2/favicons?domain=ani.pm&sz=128"
        /**
         * embed.settlar.io's Cloudflare answers 403 to Chrome 120–124.
         * A current desktop Chrome agent is what gets the session JSON through.
         */
        private const val USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

        private val SITE_ID_IN_URL: Pattern =
            Pattern.compile("""-(\d+)-[a-z0-9]+(?:/|$|\?)""", Pattern.CASE_INSENSITIVE)

        fun extractSiteId(url: String?): String? {
            if (url.isNullOrBlank()) return null
            val m = SITE_ID_IN_URL.matcher(url)
            return if (m.find()) m.group(1) else null
        }

        fun playbackHeaders(keyProof: String): Map<String, String> = buildMap {
            put("User-Agent", USER_AGENT)
            put("Accept", "*/*")
            put("Referer", PLAY_REFERER)
            put("Origin", SITE_URL)
            if (keyProof.isNotBlank()) put(HEADER_KEY_PROOF, keyProof)
        }
    }
}

/** Copy for a failed ani.pm or Settlar response. Never includes the raw URL. */
internal fun aniPmHttpFailure(code: Int, body: String): String {
    val trimmed = body.trim()
    val challenge = trimmed.startsWith("<") ||
        trimmed.contains("Just a moment", ignoreCase = true) ||
        trimmed.contains("Attention Required", ignoreCase = true) ||
        trimmed.contains("cf-mitigated", ignoreCase = true) ||
        trimmed.contains("cf-error", ignoreCase = true) ||
        trimmed.contains("challenge-platform", ignoreCase = true)
    return when {
        code == 404 -> "Ani.pm does not have this episode."
        code == 403 || code == 503 || challenge -> AniPmServer.BLOCKED
        else -> "Ani.pm could not load this episode (HTTP $code)."
    }
}
