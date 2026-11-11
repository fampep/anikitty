package site.anikitty.app.data.servers

import android.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.util.concurrent.TimeUnit
import javax.crypto.Cipher
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * On-device Anikoto → MegaPlay resolve.
 * Returns playable request URL + headers only; Media3 pulls bytes from the CDN.
 */
class AnikotoServer(
    private val cache: ResolveCache? = null,
    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(12, TimeUnit.SECONDS)
        .callTimeout(18, TimeUnit.SECONDS)
        .followRedirects(true)
        .retryOnConnectionFailure(true)
        .build(),
) : StreamResolver {
    override val server = StreamServer(
        id = ID,
        name = "Anikoto",
        description = "Fast on-device URL resolve. Playback bandwidth stays on this phone.",
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
        val titles = buildTitleQueries(titleHint)
        val mapped = mapWatchPage(anilistId, titles)
        val episodes = fetchEpisodes(mapped.siteId, mapped.watchUrl)
        val ep = episodes.firstOrNull { it.number == episode }
            ?: error("Episode $episode not found")
        if (mode == "dub" && !ep.hasDub) error("Dub unavailable for episode $episode")
        if (mode != "dub" && !ep.hasSub) error("Sub unavailable for episode $episode")
        val referer = "${mapped.watchUrl.trimEnd('/')}/ep-$episode"
        val embeds = resolveServerEmbeds(ep.ids, mode, mapped.watchUrl)
        val out = ArrayList<PlayableSource>()
        val seen = HashSet<String>()
        // First successful embed wins — keep playback starting snappy.
        for ((embedUrl, label) in embeds.take(3)) {
            runCatching { resolveEmbed(embedUrl, referer) }
                .onSuccess { resolved ->
                    for ((url, quality) in resolved.labeled.ifEmpty {
                        listOf(resolved.file to "Stream")
                    }) {
                        if (!url.startsWith("http") || !seen.add(url)) continue
                        out += PlayableSource(
                            url = url,
                            headers = streamHeaders(resolved.origin),
                            label = qualityLabel(label, quality),
                        )
                    }
                }
            if (out.isNotEmpty()) break
        }
        if (out.isEmpty()) error("No playable $mode sources")
        out
    }

    private data class MappedShow(val siteId: String, val watchUrl: String)
    private data class SiteEpisode(
        val number: Int,
        val ids: String,
        val hasSub: Boolean,
        val hasDub: Boolean,
    )
    private data class ResolvedEmbed(
        val origin: String,
        val file: String,
        val labeled: List<Pair<String, String>>,
    )

    private fun mapWatchPage(anilistId: Int, titles: List<String>): MappedShow {
        cache?.getShow(ID, anilistId)?.let { hit ->
            // Trust the cache for rematches; fall through if the page is gone.
            val html = runCatching { fetchText(hit.watchUrl, ANIKOTO_BASE) }.getOrNull()
            if (html != null && parseWatchId(html) == hit.siteId) {
                return MappedShow(hit.siteId, hit.watchUrl)
            }
        }
        val seen = LinkedHashSet<String>()
        for (q in titles.take(4)) {
            val candidates = ArrayList<String>()
            val slug = titleSlug(q)
            if (slug.isNotEmpty()) candidates += "$ANIKOTO_BASE/watch/$slug"
            val searchUrl =
                "$ANIKOTO_BASE/ajax/anime/search?keyword=${enc(q)}"
            runCatching {
                val data = fetchJson(searchUrl, ANIKOTO_BASE)
                val html = data.optJSONObject("result")?.optString("html")
                    ?: data.optString("result")
                parseSearchCandidates(html).forEach { (url, _) -> candidates += url }
            }
            for (url in candidates) {
                if (!seen.add(url)) continue
                val html = runCatching { fetchText(url, ANIKOTO_BASE) }.getOrNull() ?: continue
                if (!pageMatchesAnilist(html, anilistId, titles)) continue
                val siteId = parseWatchId(html) ?: continue
                val mapped = MappedShow(siteId, absoluteUrl(url))
                cache?.putShow(ID, anilistId, mapped.siteId, mapped.watchUrl)
                return mapped
            }
        }
        error("No watch page for AniList $anilistId")
    }

    private fun fetchEpisodes(siteId: String, watchUrl: String): List<SiteEpisode> {
        cache?.getEpisodes(ID, siteId)?.let { cached ->
            return cached.map {
                SiteEpisode(it.number, it.ids, it.hasSub, it.hasDub)
            }
        }
        val data = fetchJson("$ANIKOTO_BASE/ajax/episode/list/$siteId?style=multi", watchUrl)
        val html = data.optString("result")
        val eps = parseEpisodes(html)
        if (eps.isEmpty()) error("Empty episode list")
        cache?.putEpisodes(
            ID,
            siteId,
            eps.map {
                ResolveCache.CachedEpisode(it.number, it.ids, it.hasSub, it.hasDub)
            },
        )
        return eps
    }

    private fun resolveServerEmbeds(
        episodeIds: String,
        mode: String,
        watchUrl: String,
    ): List<Pair<String, String>> {
        val listUrl = "$ANIKOTO_BASE/ajax/server/list?servers=${enc(episodeIds)}"
        val data = fetchJson(listUrl, watchUrl)
        if (data.optInt("status") != 200) error("Anikoto server list failed")
        val html = data.optString("result")
        val links = parseServerLinks(html, mode)
        if (links.isEmpty()) error("Anikoto: no $mode servers")
        val out = ArrayList<Pair<String, String>>()
        for ((linkId, label) in links.take(6)) {
            val getUrl = "$ANIKOTO_BASE/ajax/server?get=${enc(linkId)}"
            val body = runCatching { fetchJson(getUrl, watchUrl) }.getOrNull() ?: continue
            if (body.optInt("status") != 200) continue
            val url = body.optJSONObject("result")?.optString("url").orEmpty()
            if (url.startsWith("http")) out += url to label
        }
        if (out.isEmpty()) error("Anikoto: no embed URLs")
        return out
    }

    private fun resolveEmbed(embedUrl: String, referer: String): ResolvedEmbed {
        var pageUrl = embedUrl
        var origin = originOf(embedUrl)
        var html = fetchText(embedUrl, referer)
        var dataId = parseDataId(html)

        if (dataId == null) {
            val iframe = IFRAME_SRC.find(html)?.groupValues?.getOrNull(1)
            if (!iframe.isNullOrBlank()) {
                val inner = when {
                    iframe.startsWith("//") -> "https:$iframe"
                    iframe.startsWith("/") -> "$origin$iframe"
                    else -> iframe
                }
                runCatching {
                    html = fetchText(inner, embedUrl)
                    origin = originOf(inner)
                    pageUrl = inner
                    dataId = parseDataId(html)
                }
            }
        }
        if (dataId == null) {
            STREAM_ID.find(embedUrl)?.groupValues?.getOrNull(1)?.let {
                if (isValidDataId(it)) dataId = it
            }
        }
        val id = dataId ?: error("MegaPlay data-id missing")
        val sParam = pageUrl.toHttpUrl().queryParameter("s")
        val srcBuilder = "$origin/stream/getSourcesNew?id=${enc(id)}".toHttpUrl().newBuilder()
        if (!sParam.isNullOrBlank()) srcBuilder.addQueryParameter("s", sParam)
        val srcJson = fetchJson(srcBuilder.build().toString(), pageUrl, origin)
        val file = extractFile(srcJson) ?: error("MegaPlay file missing")
        val labeled = extractLabeled(srcJson).ifEmpty { listOf(file to "Stream") }
        return ResolvedEmbed(origin = origin, file = file, labeled = labeled)
    }

    private fun extractFile(data: JSONObject): String? {
        data.optJSONObject("sources")?.optString("file")
            ?.takeIf { it.startsWith("http") }
            ?.let { return it }
        data.optJSONArray("sources")?.let { arr ->
            for (i in 0 until arr.length()) {
                val f = arr.optJSONObject(i)?.optString("file").orEmpty()
                if (f.startsWith("http")) return f
            }
        }
        val enc = data.optString("enc")
        if (enc.isNotBlank()) {
            val decrypted = decryptMegaPlayEnc(enc)
            decrypted.optString("file").takeIf { it.startsWith("http") }?.let { return it }
            decrypted.optJSONObject("sources")?.optString("file")
                ?.takeIf { it.startsWith("http") }
                ?.let { return it }
        }
        return null
    }

    private fun extractLabeled(data: JSONObject): List<Pair<String, String>> {
        val out = ArrayList<Pair<String, String>>()
        fun addFrom(obj: JSONObject) {
            val url = obj.optString("file").ifBlank { obj.optString("url") }
            if (!url.startsWith("http")) return
            val quality = obj.optString("quality")
                .ifBlank { obj.optString("label") }
                .ifBlank { obj.optString("type") }
                .ifBlank { "Stream" }
            out += url to quality
        }
        when (val sources = data.opt("sources")) {
            is JSONArray -> for (i in 0 until sources.length()) {
                sources.optJSONObject(i)?.let(::addFrom)
            }
            is JSONObject -> addFrom(sources)
        }
        if (out.isEmpty()) {
            extractFile(data)?.let { out += it to "Stream" }
        }
        return out
    }

    /** AES-256-CBC of MegaPlay getSourcesNew `enc` (static key/IV in their public player JS). */
    private fun decryptMegaPlayEnc(enc: String): JSONObject {
        val padded = enc + "=".repeat((4 - enc.length % 4) % 4)
        val raw = Base64.decode(padded, Base64.URL_SAFE or Base64.NO_WRAP)
        val key = MEGAPLAY_KEY.copyOf(32)
        val cipher = Cipher.getInstance("AES/CBC/PKCS5Padding")
        cipher.init(
            Cipher.DECRYPT_MODE,
            SecretKeySpec(key, "AES"),
            IvParameterSpec(MEGAPLAY_IV),
        )
        val plain = String(cipher.doFinal(raw), StandardCharsets.UTF_8)
        return JSONObject(plain)
    }

    private fun fetchText(url: String, referer: String): String {
        val req = Request.Builder()
            .url(url)
            .header("User-Agent", CHROME_UA)
            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
            .header("Referer", referer)
            .header("X-Requested-With", "XMLHttpRequest")
            .get()
            .build()
        http.newCall(req).execute().use { res ->
            val body = res.body?.string().orEmpty()
            if (!res.isSuccessful) error("HTTP ${res.code} for $url")
            return body
        }
    }

    private fun fetchJson(url: String, referer: String, origin: String? = null): JSONObject {
        val b = Request.Builder()
            .url(url)
            .header("User-Agent", CHROME_UA)
            .header("Accept", "application/json,text/plain,*/*")
            .header("Referer", referer)
            .header("X-Requested-With", "XMLHttpRequest")
            .get()
        if (!origin.isNullOrBlank()) b.header("Origin", origin)
        http.newCall(b.build()).execute().use { res ->
            val body = res.body?.string().orEmpty()
            if (!res.isSuccessful) error("HTTP ${res.code} for $url")
            return JSONObject(body)
        }
    }

    companion object {
        const val ID = "anikoto"

        private const val ANIKOTO_BASE = "https://anikoto.cz"
        private const val CHROME_UA =
            "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"

        // Public MegaPlay player defaults (newclient.min.js) — not a secret.
        private val MEGAPLAY_KEY = "i?LMTAx0Q6,:}50U".toByteArray(StandardCharsets.UTF_8)
        private val MEGAPLAY_IV = "W0;27ToaUpl_P%'c".toByteArray(StandardCharsets.UTF_8)

        private val WATCH_ID = Regex(
            """(?i)id=["']watch-main["'][^>]*\bdata-id=["'](\d+)["']|data-id=["'](\d+)["'][^>]*\bid=["']watch-main["']""",
        )
        private val SEARCH_ITEM = Regex(
            """(?is)<a\s+class=["'][^"']*\bitem\b[^"']*["'][^>]+href=["']([^"']+/watch/[^"']+)["'][\s\S]{0,900}?<div\s+class=["'][^"']*\bname\b[^"']*["'][^>]*>(.*?)</div>""",
        )
        private val EPISODE = Regex(
            """(?is)<a\b[^>]*\bdata-num=["'](\d+)["'][^>]*\bdata-sub=["']([^"']*)["'][^>]*\bdata-dub=["']([^"']*)["'][^>]*\bdata-ids=["']([^"']+)["'][^>]*>""",
        )
        private val SERVER_LI = Regex(
            """(?is)<li\b[^>]*\bdata-link-id=["']([^"']+)["'][^>]*>(.*?)</li>""",
        )
        private val PLAYER_ID = Regex(
            """(?i)id=["']megaplay-player["'][^>]*data-id=["']([^"']+)["']|data-id=["']([^"']+)["'][^>]*id=["']megaplay-player["']""",
        )
        private val ANY_DATA_ID = Regex("""(?i)data-id=["']([^"']+)["']""")
        private val IFRAME_SRC = Regex("""(?i)<iframe[^>]+\bsrc=["']([^"']*/stream/[^"']*)["']""")
        private val STREAM_ID = Regex("""(?i)/stream/s-\d+/([^/]+)/""")
        private val TAG = Regex("""<[^>]+>""")

        private fun enc(s: String): String =
            URLEncoder.encode(s, StandardCharsets.UTF_8.name())

        private fun htmlUnescape(s: String): String =
            s.replace("&amp;", "&")
                .replace("&#039;", "'")
                .replace("&quot;", "\"")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("\\/", "/")

        private fun stripTags(s: String): String = TAG.replace(s, "").trim()

        private fun titleSlug(title: String): String {
            val sb = StringBuilder()
            var dash = false
            for (ch in title) {
                when {
                    ch.isLetterOrDigit() -> {
                        sb.append(ch.lowercaseChar())
                        dash = false
                    }
                    sb.isNotEmpty() && !dash -> {
                        sb.append('-')
                        dash = true
                    }
                }
            }
            return sb.trimEnd('-').toString()
        }

        private fun normalizeTitleKey(title: String): String {
            val sb = StringBuilder()
            var space = false
            for (ch in htmlUnescape(title)) {
                when {
                    ch.isLetterOrDigit() -> {
                        sb.append(ch.lowercaseChar())
                        space = false
                    }
                    sb.isNotEmpty() && !space -> {
                        sb.append(' ')
                        space = true
                    }
                }
            }
            return sb.trim().toString()
        }

        private fun buildTitleQueries(hint: String?): List<String> {
            val raw = hint?.trim().orEmpty()
            if (raw.isEmpty()) return emptyList()
            val out = LinkedHashSet<String>()
            out += raw
            raw.split(':', '—', '-').map { it.trim() }.filter { it.length >= 3 }.forEach { out += it }
            return out.toList()
        }

        private fun parseWatchId(html: String): String? {
            val m = WATCH_ID.find(html) ?: return null
            return m.groupValues[1].ifBlank { m.groupValues[2] }.takeIf { it.isNotBlank() }
        }

        private fun pageAnilistId(html: String): Int? {
            val patterns = listOf(
                Regex(""""idAnilist"\s*:\s*(\d+)"""),
                Regex("""\\"idAnilist\\"\s*:\s*(\d+)"""),
                Regex("""/anime/banner/(\d+)-"""),
                Regex("""/anime/cover/(?:small|medium|large)/b(?:x)?(\d+)-"""),
            )
            for (re in patterns) {
                re.find(html)?.groupValues?.getOrNull(1)?.toIntOrNull()?.let { return it }
            }
            return null
        }

        private fun parsePageTitle(html: String): String? {
            val h1 = Regex(
                """(?is)<h1[^>]*\bclass=["'][^"']*\btitle\b[^"']*["'][^>]*>(.*?)</h1>""",
            ).find(html)
            if (h1 != null) {
                val t = htmlUnescape(stripTags(h1.groupValues[1]))
                if (t.isNotBlank()) return t
            }
            val title = Regex("""(?is)<title>\s*Watch\s+(.*?)\s+Episode\s+\d+""").find(html)
            return title?.groupValues?.getOrNull(1)?.let { htmlUnescape(it.trim()) }?.takeIf { it.isNotBlank() }
        }

        private fun pageMatchesAnilist(html: String, anilistId: Int, expectedTitles: List<String>): Boolean {
            pageAnilistId(html)?.let { return it == anilistId }
            val pageTitle = parsePageTitle(html) ?: return false
            val pageKey = normalizeTitleKey(pageTitle)
            return expectedTitles.map { normalizeTitleKey(it) }.any { it.isNotEmpty() && it == pageKey }
        }

        private fun parseSearchCandidates(html: String): List<Pair<String, String>> {
            val out = ArrayList<Pair<String, String>>()
            val seen = HashSet<String>()
            for (m in SEARCH_ITEM.findAll(html)) {
                val url = htmlUnescape(m.groupValues[1])
                if (!seen.add(url)) continue
                val name = htmlUnescape(stripTags(m.groupValues[2]))
                out += url to name
            }
            return out
        }

        private fun parseEpisodes(html: String): List<SiteEpisode> {
            val out = ArrayList<SiteEpisode>()
            for (m in EPISODE.findAll(html)) {
                val number = m.groupValues[1].toIntOrNull() ?: continue
                if (number <= 0) continue
                out += SiteEpisode(
                    number = number,
                    hasSub = m.groupValues[2] == "1",
                    hasDub = m.groupValues[3] == "1",
                    ids = htmlUnescape(m.groupValues[4]),
                )
            }
            return out
        }

        private fun parseServerLinks(html: String, mode: String): List<Pair<String, String>> {
            val needle = """data-type="$mode""""
            var start = html.indexOf(needle)
            if (start < 0 && mode == "dub") start = html.indexOf("""data-type="sub"""")
            if (start < 0) start = 0
            val relativeEnd = html.indexOf("""<div class="type"""", start + 1)
            val end = if (relativeEnd >= 0) relativeEnd else html.length
            val block = html.substring(start, end)
            return SERVER_LI.findAll(block).mapNotNull { m ->
                val id = htmlUnescape(m.groupValues[1])
                if (id.isEmpty()) return@mapNotNull null
                val label = htmlUnescape(stripTags(m.groupValues[2]))
                id to label
            }.toList()
        }

        private fun isValidDataId(id: String): Boolean =
            id.isNotEmpty() && id.length <= 256 &&
                id.all { it.isLetterOrDigit() || it == '.' || it == '-' || it == '_' }

        private fun parseDataId(html: String): String? {
            PLAYER_ID.find(html)?.let { m ->
                val id = m.groupValues[1].ifBlank { m.groupValues[2] }
                if (isValidDataId(id)) return id
            }
            for (m in ANY_DATA_ID.findAll(html)) {
                val id = m.groupValues[1]
                if (isValidDataId(id)) return id
            }
            return null
        }

        private fun originOf(url: String): String = try {
            val u = url.toHttpUrl()
            "${u.scheme}://${u.host}"
        } catch (_: Exception) {
            "https://megaplay.buzz"
        }

        private fun absoluteUrl(url: String): String =
            if (url.startsWith("http")) url else "$ANIKOTO_BASE$url"

        private fun streamHeaders(origin: String): Map<String, String> = mapOf(
            "Referer" to "$origin/",
            "Origin" to origin,
            "User-Agent" to CHROME_UA,
        )

        private fun qualityLabel(server: String, quality: String): String {
            val s = server.trim()
            val q = quality.trim()
            return when {
                s.isEmpty() && (q.isEmpty() || q.equals("stream", true)) -> "Anikoto"
                s.isEmpty() -> q
                q.isEmpty() || q.equals("stream", true) -> s
                else -> "$s $q"
            }
        }
    }
}
