package site.anikitty.app.data.skip

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Loads skip timestamps for the player.
 *
 * 1. AniKitty community skip (when the public site is reachable)
 * 2. AniSkip (MAL id) for intro / credits / recap / mixed OP·ED
 */
class SkipTimesClient(
    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .callTimeout(12, TimeUnit.SECONDS)
        .build(),
) {
    suspend fun load(
        anilistId: Int,
        episode: Int,
        malId: Int?,
        episodeLengthSec: Double = 1420.0,
    ): SkipTimes = withContext(Dispatchers.IO) {
        communitySkip(anilistId, episode)
            ?.takeUnless { it.isEmpty }
            ?: aniskip(malId, episode, episodeLengthSec)
            ?: SkipTimes()
    }

    private fun communitySkip(anilistId: Int, episode: Int): SkipTimes? {
        for (host in COMMUNITY_HOSTS) {
            val url = "$host/api/kitty/community-skip".toHttpUrl().newBuilder()
                .addQueryParameter("anilistId", anilistId.toString())
                .addQueryParameter("episode", episode.toString())
                .build()
            val body = get(url.toString()) ?: continue
            if (!body.trimStart().startsWith("{")) continue
            return runCatching { parseCommunity(JSONObject(body)) }.getOrNull()
        }
        return null
    }

    private fun aniskip(malId: Int?, episode: Int, episodeLengthSec: Double): SkipTimes? {
        if (malId == null || malId <= 0) return null
        val url = "https://api.aniskip.com/v2/skip-times/$malId/$episode".toHttpUrl()
            .newBuilder()
            .addQueryParameter("types", "op")
            .addQueryParameter("types", "ed")
            .addQueryParameter("types", "recap")
            .addQueryParameter("types", "mixed-op")
            .addQueryParameter("types", "mixed-ed")
            .addQueryParameter("episodeLength", episodeLengthSec.toString())
            .build()
        val body = get(url.toString()) ?: return null
        return runCatching { parseAniskip(JSONObject(body)) }.getOrNull()
    }

    private fun get(url: String): String? {
        val req = Request.Builder()
            .url(url)
            .header("Accept", "application/json")
            .get()
            .build()
        return runCatching {
            http.newCall(req).execute().use { res ->
                val text = res.body?.string().orEmpty()
                if (!res.isSuccessful) null else text
            }
        }.getOrNull()
    }

    private fun parseCommunity(json: JSONObject): SkipTimes {
        fun iv(key: String): SkipInterval? {
            val obj = json.optJSONObject(key) ?: return null
            val start = obj.optDouble("start", Double.NaN)
            val end = obj.optDouble("end", Double.NaN)
            if (!start.isFinite() || !end.isFinite() || end <= start) return null
            return SkipInterval(start, end)
        }
        return SkipTimes(
            intro = iv("intro"),
            outro = iv("outro"),
            recap = iv("recap"),
            preview = iv("preview"),
        )
    }

    private fun parseAniskip(json: JSONObject): SkipTimes {
        if (!json.optBoolean("found", false)) return SkipTimes()
        val results = json.optJSONArray("results") ?: return SkipTimes()
        var intro: SkipInterval? = null
        var outro: SkipInterval? = null
        var recap: SkipInterval? = null
        for (i in 0 until results.length()) {
            val row = results.optJSONObject(i) ?: continue
            val type = row.optString("skipType")
            val interval = row.optJSONObject("interval") ?: continue
            val start = interval.optDouble("startTime", Double.NaN)
            val end = interval.optDouble("endTime", Double.NaN)
            if (!start.isFinite() || !end.isFinite() || end <= start) continue
            val iv = SkipInterval(start, end)
            when (type) {
                "op", "mixed-op" -> if (intro == null) intro = iv
                "ed", "mixed-ed" -> if (outro == null) outro = iv
                "recap" -> if (recap == null) recap = iv
            }
        }
        return SkipTimes(intro = intro, outro = outro, recap = recap)
    }

    private companion object {
        // Public community skip API hosts (HTTPS). Prefer site over online when both work;
        // release Network Security Config explicitly permits these domains.
        val COMMUNITY_HOSTS = listOf(
            "https://anikitty.site",
            "https://anikitty.online",
        )
    }
}
