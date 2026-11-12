package site.anikitty.app.data.fribb

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

/**
 * Loads Fribb anime-lists into an AniList → TMDB/IMDb index.
 *
 * Ships a compact asset for offline first paint, then optionally refreshes from
 * GitHub (`anime-list-mini.json`) about once a week when the network is up.
 */
class FribbAnimeLists(
    context: Context,
    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(45, TimeUnit.SECONDS)
        .callTimeout(60, TimeUnit.SECONDS)
        .build(),
) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private val cacheFile = File(appContext.filesDir, CACHE_FILE)
    private val index = AtomicReference<Map<Int, FribbMapping>?>(null)
    private val mutex = Mutex()

    suspend fun mappingFor(anilistId: Int): FribbMapping? = withContext(Dispatchers.IO) {
        ensureLoaded()
        maybeRefreshInBackground()
        index.get()?.get(anilistId)
    }

    private suspend fun ensureLoaded() {
        if (index.get() != null) return
        mutex.withLock {
            if (index.get() != null) return
            val fromDisk = cacheFile.takeIf { it.isFile }?.let { parseCompact(it.readText()) }
            if (fromDisk != null) {
                index.set(fromDisk)
                return
            }
            val fromAsset = runCatching {
                appContext.assets.open(ASSET_PATH).bufferedReader().use { it.readText() }
            }.getOrNull()?.let { parseCompact(it) }
            index.set(fromAsset.orEmpty())
            if (fromAsset != null) {
                runCatching { cacheFile.writeText(compactJson(fromAsset.values)) }
            }
        }
    }

    private fun maybeRefreshInBackground() {
        val last = prefs.getLong(KEY_REFRESHED_AT, 0L)
        if (System.currentTimeMillis() - last < REFRESH_TTL_MS) return
        // Fire-and-forget refresh; callers already have an index from asset/disk.
        Thread {
            runCatching { refreshFromNetwork() }
        }.apply {
            name = "fribb-refresh"
            isDaemon = true
            start()
        }
    }

    private fun refreshFromNetwork() {
        val req = Request.Builder()
            .url(REMOTE_MINI_URL)
            .header("Accept", "application/json")
            .get()
            .build()
        val body = http.newCall(req).execute().use { res ->
            if (!res.isSuccessful) return
            res.body?.string().orEmpty()
        }
        if (body.isBlank()) return
        val parsed = parseFullList(body) ?: return
        index.set(parsed)
        cacheFile.writeText(compactJson(parsed.values))
        prefs.edit().putLong(KEY_REFRESHED_AT, System.currentTimeMillis()).apply()
    }

    companion object {
        private const val PREFS = "anikitty_fribb"
        private const val KEY_REFRESHED_AT = "refreshed_at"
        private const val CACHE_FILE = "fribb_anilist_tmdb_compact.json"
        private const val ASSET_PATH = "fribb/anilist_tmdb_compact.json"
        private const val REMOTE_MINI_URL =
            "https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json"
        private const val REFRESH_TTL_MS = 7L * 24 * 60 * 60 * 1000

        internal fun parseCompact(raw: String): Map<Int, FribbMapping>? = runCatching {
            val arr = JSONArray(raw)
            buildMap {
                for (i in 0 until arr.length()) {
                    val o = arr.optJSONObject(i) ?: continue
                    val id = o.optInt("a", 0)
                    if (id <= 0) continue
                    put(
                        id,
                        FribbMapping(
                            anilistId = id,
                            tmdbTvId = o.optIntOrNull("tv"),
                            tmdbMovieId = o.optIntOrNull("m"),
                            imdbId = o.optString("i").takeIf { it.isNotBlank() },
                            tmdbSeason = o.optIntOrNull("s"),
                            tmdbEpisodeOffset = o.optInt("o", 0),
                            type = o.optString("t").takeIf { it.isNotBlank() },
                        ),
                    )
                }
            }
        }.getOrNull()

        internal fun parseFullList(raw: String): Map<Int, FribbMapping>? = runCatching {
            val arr = JSONArray(raw)
            buildMap<Int, FribbMapping> {
                for (i in 0 until arr.length()) {
                    val o = arr.optJSONObject(i) ?: continue
                    val id = o.optInt("anilist_id", 0)
                    if (id <= 0) continue
                    val tmdb = o.optJSONObject("themoviedb_id")
                    val tv = tmdb?.optIntOrNull("tv")
                    val movieArr = tmdb?.optJSONArray("movie")
                    val movie = movieArr?.optIntOrNull(0)
                    val imdbArr = o.optJSONArray("imdb_id")
                    val imdb = imdbArr?.optString(0)?.takeIf { it.isNotBlank() }
                    val season = o.optJSONObject("season")?.optIntOrNull("tmdb")
                    val offset = o.optJSONObject("episode_offset")?.optInt("tmdb", 0) ?: 0
                    if (tv == null && movie == null && imdb == null) continue
                    val next = FribbMapping(
                        anilistId = id,
                        tmdbTvId = tv,
                        tmdbMovieId = movie,
                        imdbId = imdb,
                        tmdbSeason = season,
                        tmdbEpisodeOffset = offset,
                        type = o.optString("type").takeIf { it.isNotBlank() },
                    )
                    val prev = this[id]
                    if (prev == null || next.score() > prev.score()) {
                        put(id, next)
                    }
                }
            }
        }.getOrNull()

        private fun FribbMapping.score(): Int {
            var s = 0
            if (tmdbTvId != null) s += 4
            if (tmdbMovieId != null) s += 2
            if (!imdbId.isNullOrBlank()) s += 1
            s += (10 - (tmdbSeason ?: 1).coerceIn(0, 10))
            return s
        }

        private fun compactJson(values: Collection<FribbMapping>): String {
            val arr = JSONArray()
            values.forEach { m ->
                arr.put(
                    JSONObject().apply {
                        put("a", m.anilistId)
                        m.tmdbTvId?.let { put("tv", it) }
                        m.tmdbMovieId?.let { put("m", it) }
                        m.imdbId?.let { put("i", it) }
                        m.tmdbSeason?.let { put("s", it) }
                        if (m.tmdbEpisodeOffset != 0) put("o", m.tmdbEpisodeOffset)
                        m.type?.let { put("t", it) }
                    },
                )
            }
            return arr.toString()
        }

        private fun JSONObject.optIntOrNull(key: String): Int? {
            if (!has(key) || isNull(key)) return null
            val v = optInt(key, Int.MIN_VALUE)
            return v.takeIf { it != Int.MIN_VALUE }
        }

        private fun JSONArray.optIntOrNull(index: Int): Int? {
            if (index < 0 || index >= length() || isNull(index)) return null
            val v = optInt(index, Int.MIN_VALUE)
            return v.takeIf { it != Int.MIN_VALUE }
        }
    }
}
