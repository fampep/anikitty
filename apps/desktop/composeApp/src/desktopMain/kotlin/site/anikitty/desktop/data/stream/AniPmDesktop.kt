package site.anikitty.desktop.data.stream

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
 * Desktop port of Android [site.anikitty.app.data.servers.AniPmServer].
 * AniList id → ani.pm → Settlar HLS (no WebView). Extensions stay stream links only.
 */
class AniPmDesktop(
    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(18, TimeUnit.SECONDS)
        .callTimeout(28, TimeUnit.SECONDS)
        .followRedirects(true)
        .retryOnConnectionFailure(true)
        .cookieJar(DomainCookieJar())
        .build(),
) {
    suspend fun resolve(
        anilistId: Int,
        episode: Int,
        audio: String = "sub",
        titleHint: String? = null,
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

        val channel = if (effective.equals("dub", ignoreCase = true)) "dub" else "sub"
        val embedUrl = fetchSettlarEmbedUrl(selection, episode, channel)
        val token = embedUrl.toHttpUrl().queryParameter("t")
            ?: error("Settlar embed missing token")
        val session = fetchEmbedSession(token, embedUrl)
        val master = session.optString("source").trim()
        require(master.startsWith("http")) { "Settlar HLS missing" }
        val keyProof = session.optString("keyProof").trim()
            .ifBlank { error("Settlar keyProof missing") }

        runCatching { httpText(embedUrl, SITE_URL, accept = "text/html", origin = null) }

        val headers = streamHeaders(keyProof)
        if (!probeMaster(master, headers)) {
            error("Settlar CDN refused playlist")
        }

        val masterText = runCatching { httpText(master, headers = headers) }.getOrNull().orEmpty()
        val variants = parseVariants(masterText, master)
        val out = ArrayList<PlayableSource>()
        out += PlayableSource(
            url = master,
            headers = headers,
            label = "Auto · ${channel.uppercase()}",
        )
        for ((url, height) in variants.sortedByDescending { it.second }) {
            if (url == master) continue
            out += PlayableSource(
                url = url,
                headers = headers,
                label = if (height > 0) "${height}p" else "Ani.pm",
            )
        }
        out
    }

    private fun mapSiteId(anilistId: Int, titleHint: String?): String {
        val fromPartner = runCatching { siteIdFromPartner(anilistId) }.getOrNull()
        if (!fromPartner.isNullOrBlank()) return fromPartner
        val q = titleHint?.trim().orEmpty()
        if (q.length >= 2) {
            val fromSearch = runCatching { siteIdFromTitleSearch(q, anilistId) }.getOrNull()
            if (!fromSearch.isNullOrBlank()) return fromSearch
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
        val url = data.optString("url").ifBlank { data.optString("embed") }
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
            "$SITE_URL/api/anime/playback-bootstrap/settlar/$siteId?ep=$episode&lang=$lang"
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
            embedUrl,
            accept = "application/json",
            origin = SETTLAR_EMBED,
        )
        if (body.trimStart().startsWith("<")) error("Settlar session challenged")
        return JSONObject(body)
    }

    private fun parseVariants(master: String, masterUrl: String): List<Pair<String, Int>> {
        if (master.isBlank()) return emptyList()
        val lines = master.lines()
        val out = ArrayList<Pair<String, Int>>()
        var i = 0
        while (i < lines.size) {
            val line = lines[i].trim()
            if (line.startsWith("#EXT-X-STREAM-INF")) {
                val height = Regex("""RESOLUTION=\d+x(\d+)""").find(line)?.groupValues?.get(1)
                    ?.toIntOrNull() ?: 0
                val next = lines.getOrNull(i + 1)?.trim().orEmpty()
                if (next.isNotEmpty() && !next.startsWith("#")) {
                    val abs = absolutize(masterUrl, next)
                    if (abs.startsWith("http")) out += abs to height
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

    private fun probeMaster(masterUrl: String, headers: Map<String, String>): Boolean =
        runCatching {
            httpText(masterUrl, headers = headers).contains("#EXTM3U")
        }.getOrDefault(false)

    private fun warmUp() {
        runCatching { httpText(SITE_URL, SITE_URL, accept = "text/html") }
    }

    private fun streamHeaders(keyProof: String): Map<String, String> = mapOf(
        "User-Agent" to USER_AGENT,
        "Accept" to "*/*",
        "Referer" to "$SETTLAR_EMBED/",
        HEADER_KEY_PROOF to keyProof,
    )

    private fun httpText(
        url: String,
        referer: String = SITE_URL,
        accept: String = "*/*",
        origin: String? = SITE_URL,
        headers: Map<String, String>? = null,
    ): String {
        val b = Request.Builder().url(url).get()
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
            if (!res.isSuccessful && !text.trimStart().startsWith("<")) {
                error("ani.pm HTTP ${res.code} for ${url.take(96)}")
            }
            text
        }
    }

    private fun enc(value: String): String =
        URLEncoder.encode(value, StandardCharsets.UTF_8.name())

    private class DomainCookieJar : CookieJar {
        private val store = ConcurrentHashMap<String, List<Cookie>>()

        override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
            if (cookies.isEmpty()) return
            val key = cookies.firstOrNull()?.domain?.trimStart('.') ?: url.host
            store[key] = cookies
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
        const val SITE_URL = "https://ani.pm"
        const val SETTLAR_EMBED = "https://embed.settlar.io"
        const val HEADER_KEY_PROOF = "X-Settlar-Key-Proof"
        private const val USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        private val SITE_ID_IN_URL: Pattern =
            Pattern.compile("""-(\d+)-[a-z0-9]+(?:/|$|\?)""", Pattern.CASE_INSENSITIVE)

        fun extractSiteId(url: String?): String? {
            if (url.isNullOrBlank()) return null
            val m = SITE_ID_IN_URL.matcher(url)
            return if (m.find()) m.group(1) else null
        }
    }
}
